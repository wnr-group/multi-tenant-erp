# Attendance Rework — Plan 1: Database Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the database primitives the rest of the attendance rework depends on: FN/AN session support on `attendance_records`, the `notified_at` stamp, the `notifications` UPDATE RLS policy, `announcements_seen_at` on profiles, and a `get_active_academic_year()` SQL helper.

**Architecture:** Pure Supabase migration work. New migrations are added in numeric sequence after the latest (`20240001000041`). Verification is `supabase db reset` applying all migrations cleanly plus targeted SQL probes via `psql`. No app code changes in this plan.

**Tech Stack:** Supabase (PostgreSQL 17), SQL migrations under `supabase/migrations/`.

**Spec:** `docs/superpowers/specs/2026-06-14-attendance-rework-design.md` §1.

---

## Context for the implementer

- Migrations live in `supabase/migrations/` and are named `20240001NNNNNN_name.sql`. The latest is `20240001000041_drop_student_parent_columns.sql`. New migrations in this plan are `42`–`44`.
- Local Supabase runs via the `supabase` CLI (v2.90). `supabase db reset` drops the local DB, re-runs ALL migrations + `seed.sql`. This is the primary test.
- The local DB connection string for `psql` probes: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`.
- `attendance_records` today (`20240001000003_attendance.sql`): columns `id, school_id, student_id, section_id, date, status, marked_by, created_at`, with `UNIQUE(student_id, date)`. `status` is enum `attendance_status` (`present|absent|late`).
- `notifications` (`20240001000007_communication.sql`): `id, school_id, user_id, title, body, type, is_read, created_at`. RLS enabled in `20240001000010_rls.sql`: has `notifications_select` (own rows) and `notifications_insert` (system) — **no UPDATE policy**.
- `academic_years` has a `status` column (`draft|active|archived`) with a partial unique index `idx_academic_years_one_active` ensuring one `active` row per school (`20240001000028_academic_year_status.sql`).
- `profiles` UPDATE policy (`20240001000010_rls.sql`) already allows `id = auth.uid()`.

---

## File Structure

- Create: `supabase/migrations/20240001000042_attendance_sessions.sql` — session enum + column, unique-key swap, `notified_at`, index.
- Create: `supabase/migrations/20240001000043_notifications_update_policy.sql` — UPDATE RLS on `notifications`.
- Create: `supabase/migrations/20240001000044_attendance_helpers.sql` — `announcements_seen_at` column + `get_active_academic_year()` function.

---

## Task 1: Session enum + column on attendance_records

**Files:**
- Create: `supabase/migrations/20240001000042_attendance_sessions.sql`

- [ ] **Step 1: Write the migration**

```sql
-- FN/AN session support on attendance.
-- Full-day attendance = one row with session 'FULL_DAY'.
-- Forenoon/afternoon = up to two rows ('FN' and/or 'AN') per student per day.
-- The UI enforces that a given student-day uses only ONE granularity.

CREATE TYPE public.attendance_session AS ENUM ('FULL_DAY', 'FN', 'AN');

ALTER TABLE public.attendance_records
  ADD COLUMN session public.attendance_session NOT NULL DEFAULT 'FULL_DAY',
  ADD COLUMN notified_at TIMESTAMPTZ;

-- Swap the uniqueness from (student, date) to (student, date, session).
ALTER TABLE public.attendance_records
  DROP CONSTRAINT attendance_records_student_id_date_key;

ALTER TABLE public.attendance_records
  ADD CONSTRAINT attendance_records_student_date_session_key
  UNIQUE (student_id, date, session);

-- Supports overview counts and the per-section 7-day stats strip.
CREATE INDEX idx_attendance_section_date_session
  ON public.attendance_records (section_id, date, session);
```

- [ ] **Step 2: Verify the constraint name before relying on it**

The drop in Step 1 assumes the auto-generated constraint name is `attendance_records_student_id_date_key`. Confirm with:

Run: `psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "\d public.attendance_records"`
Expected: a `UNIQUE CONSTRAINT` line naming `attendance_records_student_id_date_key`. If the name differs, update the `DROP CONSTRAINT` line in the migration to match.

- [ ] **Step 3: Apply via db reset**

Run: `supabase db reset`
Expected: completes without error; output ends with seeding success. No "constraint does not exist" or "type already exists" errors.

- [ ] **Step 4: Probe the schema**

Run:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c \
"SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name='attendance_records' AND column_name IN ('session','notified_at');"
```
Expected: two rows — `session` (USER-DEFINED, default `'FULL_DAY'::attendance_session`) and `notified_at` (timestamp with time zone, no default).

- [ ] **Step 5: Probe the unique key allows two sessions per day**

Run:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c \
"SELECT conname FROM pg_constraint WHERE conrelid='public.attendance_records'::regclass AND contype='u';"
```
Expected: `attendance_records_student_date_session_key` (and NOT the old `..._student_id_date_key`).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20240001000042_attendance_sessions.sql
git commit -m "feat(db): add FN/AN session + notified_at to attendance_records"
```

---

## Task 2: notifications UPDATE policy

**Files:**
- Create: `supabase/migrations/20240001000043_notifications_update_policy.sql`

- [ ] **Step 1: Write the migration**

```sql
-- A user must be able to mark their own notifications read.
-- Existing policies cover SELECT (own rows) and INSERT (system) only.
CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

- [ ] **Step 2: Apply via db reset**

Run: `supabase db reset`
Expected: completes without error.

- [ ] **Step 3: Probe the policy exists**

Run:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c \
"SELECT policyname, cmd FROM pg_policies WHERE tablename='notifications';"
```
Expected: three rows — `notifications_select` (SELECT), `notifications_insert` (INSERT), `notifications_update` (UPDATE).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20240001000043_notifications_update_policy.sql
git commit -m "feat(db): allow users to update is_read on their own notifications"
```

---

## Task 3: announcements_seen_at + get_active_academic_year helper

**Files:**
- Create: `supabase/migrations/20240001000044_attendance_helpers.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Per-parent "last seen announcements" timestamp drives the unread badge.
ALTER TABLE public.profiles
  ADD COLUMN announcements_seen_at TIMESTAMPTZ;

-- Single source of truth for "the current academic year of a school".
-- Used by the attendance UI (mobile + web) and the notification edge function.
CREATE OR REPLACE FUNCTION public.get_active_academic_year(p_school_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.academic_years
  WHERE school_id = p_school_id
    AND status = 'active'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_active_academic_year(uuid) TO authenticated, anon, service_role;
```

- [ ] **Step 2: Apply via db reset**

Run: `supabase db reset`
Expected: completes without error.

- [ ] **Step 3: Probe the column and function**

Run:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c \
"SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='announcements_seen_at';" -c \
"SELECT proname FROM pg_proc WHERE proname='get_active_academic_year';"
```
Expected: first query returns one row (`1`); second returns `get_active_academic_year`.

- [ ] **Step 4: Probe the function returns the active year for a seeded school**

Run:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c \
"SELECT public.get_active_academic_year(id) IS NOT NULL AS has_active FROM public.schools LIMIT 1;"
```
Expected: `has_active = t` if the seed creates an active year for the first school. If the seed has no active year, this returns `f` — that's acceptable (function works; data just lacks an active year). Do not fail the task on `f`; only fail if the query errors.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20240001000044_attendance_helpers.sql
git commit -m "feat(db): add announcements_seen_at + get_active_academic_year helper"
```

---

## Final verification

- [ ] **Run a clean reset to confirm all three migrations apply in order**

Run: `supabase db reset`
Expected: no errors; all migrations + seed apply.

- [ ] **Confirm no other migration referenced the dropped constraint name**

Run: `grep -rn "attendance_records_student_id_date_key" supabase/`
Expected: zero matches outside the new migration 42 (which only DROPs it). If any later code/migration referenced the old name, update it.

---

## Self-review notes (for the implementer)

- The session column default `FULL_DAY` means every existing attendance row is treated as a full-day mark — preserving current behavior exactly.
- Do NOT change the `attendance_records.student_id` FK (it nominally references `profiles(id)` but the app stores `student_profiles.id`). This is pre-existing and out of scope.
- This plan adds no app code. Plans 2–5 depend on it; they assume `session`, `notified_at`, `notifications_update`, `announcements_seen_at`, and `get_active_academic_year()` all exist.
