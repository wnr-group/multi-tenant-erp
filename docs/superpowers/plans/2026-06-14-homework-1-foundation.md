# Homework Lifecycle Rework — Plan 1: Database Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the database primitives the rest of the homework rework depends on: drop the unused `homework.attachment_url`, add the `homework_attachments` and `homework_status` tables (with their enums), lock down `homework_status` writes behind column-aware RPCs, and grant parents scoped read access to homework.

**Architecture:** Pure Supabase migration work in numeric sequence after the latest migration (`20240001000045`). New migrations are `46`–`48`. Verification is `supabase db reset` applying all migrations + seed cleanly, plus targeted `psql` probes — including negative authorization probes proving a parent cannot self-grade and cannot undo after review. No app code in this plan.

**Tech Stack:** Supabase (PostgreSQL 17), SQL migrations under `supabase/migrations/`.

**Spec:** `docs/superpowers/specs/2026-06-14-homework-lifecycle-design.md` (Data model, State machine, Security sections).

---

## Context for the implementer

- Migrations live in `supabase/migrations/` named `20240001NNNNNN_name.sql`. The latest is `20240001000045_notifications_student_id.sql`. New migrations in this plan are `46`–`48`.
- Local Supabase runs via the `supabase` CLI. `supabase db reset` drops the local DB, re-runs ALL migrations + `seed.sql`. This is the primary test.
- Local DB connection for `psql` probes: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`.
- **`homework` table today** (`20240001000004_academics.sql`):
  ```
  id UUID PK, school_id UUID NOT NULL → schools, class_id UUID NOT NULL → classes,
  section_id UUID NOT NULL → sections, subject_id UUID NOT NULL → subjects,
  teacher_id UUID NOT NULL → auth.users, title TEXT NOT NULL, description TEXT,
  due_date DATE NOT NULL, attachment_url TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  ```
  `attachment_url` is referenced by NO migration, seed, or app code (verified) — safe to drop.
- **`homework` RLS today** (`20240001000010_rls.sql`):
  - `homework_select`: `get_my_role() = 'super_admin' OR school_id = get_my_school_id()` — every school member can already read. Parents hold a school role, so they can already SELECT homework. **No new parent SELECT policy is needed for `homework` itself.** (The spec's "parent SELECT scoping" requirement is already satisfied by this existing policy; `homework_attachments` gets the same school-scoped pattern below.)
  - `homework_write`: `get_my_role() IN ('super_admin','school_admin','teacher') AND school_id = get_my_school_id()`.
- **RLS helpers** (`get_my_role()`, `get_my_school_id()`) read GUCs set by `scope_pre_request()` from request headers. In `psql` probes we set them manually with `set_config(...)` inside a transaction.
- **Relationships:**
  - parent↔student: `student_profiles.parent_profile_id = profiles(id) = auth.users(id)`.
  - enrollment: `student_enrollments(student_profile_id, section_id, academic_year_id, is_active)`.
  - teacher↔section: `section_assignments(section_id, class_teacher_id, academic_year_id)` (homeroom) OR `timetable(section_id, teacher_id, academic_year_id)` (subject).
  - active year: `get_active_academic_year(p_school_id)` (added in attendance Plan 1, migration 44).
- `attendance_records.student_id` nominally FKs `profiles` but the app stores a `student_profiles.id`. For homework we FK `homework_status.student_id` **directly to `student_profiles(id)`** (correct, matches what the app passes).
- `auth.uid()` returns the calling user's id. SECURITY DEFINER functions must `SET search_path = ''` and fully-qualify object names (follow the `get_active_academic_year` pattern from migration 44).

---

## File Structure

- Create: `supabase/migrations/20240001000046_homework_attachments.sql` — drop `attachment_url`; create `homework_attachments` table + RLS.
- Create: `supabase/migrations/20240001000047_homework_status.sql` — `homework_state` + `homework_rating` enums; `homework_status` table; RLS (SELECT for owning parent + school staff; no client writes).
- Create: `supabase/migrations/20240001000048_homework_rpcs.sql` — `mark_homework_viewed`, `mark_homework_done`, `unmark_homework_done`, `review_homework` (SECURITY DEFINER, column-aware).

---

## Task 1: Drop attachment_url + create homework_attachments

**Files:**
- Create: `supabase/migrations/20240001000046_homework_attachments.sql`

- [ ] **Step 1: Confirm attachment_url is truly unused**

Run: `grep -rn "attachment_url" supabase/ apps/`
Expected: matches ONLY in `supabase/migrations/20240001000004_academics.sql` (the original column def). No seed or app references. If any app code references it, stop and report — the drop would break it.

- [ ] **Step 2: Write the migration**

```sql
-- Homework attachments: multiple files per homework (DOC/PDF/images, <=2MB each).
-- Replaces the unused single homework.attachment_url column.
-- file_url stores the STORAGE OBJECT PATH (not a public URL); the bucket is
-- private and files are served via signed URLs (see Plan 2).

ALTER TABLE public.homework DROP COLUMN IF EXISTS attachment_url;

CREATE TABLE public.homework_attachments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_id UUID NOT NULL REFERENCES public.homework(id) ON DELETE CASCADE,
  school_id   UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  file_url    TEXT NOT NULL,
  file_name   TEXT NOT NULL,
  file_type   TEXT NOT NULL,
  file_size   INTEGER NOT NULL CHECK (file_size > 0 AND file_size <= 2097152),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_homework_attachments_homework
  ON public.homework_attachments (homework_id);

ALTER TABLE public.homework_attachments ENABLE ROW LEVEL SECURITY;

-- Read: any member of the school (mirrors homework_select; parents included).
CREATE POLICY "homework_attachments_select" ON public.homework_attachments FOR SELECT
  USING (public.get_my_role() = 'super_admin' OR school_id = public.get_my_school_id());

-- Write: staff/teachers of the school (mirrors homework_write).
CREATE POLICY "homework_attachments_write" ON public.homework_attachments FOR ALL
  USING (public.get_my_role() IN ('super_admin', 'school_admin', 'teacher') AND school_id = public.get_my_school_id())
  WITH CHECK (public.get_my_role() IN ('super_admin', 'school_admin', 'teacher') AND school_id = public.get_my_school_id());
```

- [ ] **Step 3: Apply via db reset**

Run: `supabase db reset`
Expected: completes without error; ends with seeding success. No "column does not exist" or "relation already exists" errors.

- [ ] **Step 4: Probe the table + 2MB check constraint**

Run:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c \
"SELECT column_name, data_type FROM information_schema.columns WHERE table_name='homework_attachments' ORDER BY ordinal_position;" -c \
"SELECT 1 FROM information_schema.columns WHERE table_name='homework' AND column_name='attachment_url';"
```
Expected: first query lists 8 columns (`id, homework_id, school_id, file_url, file_name, file_type, file_size, created_at`); second query returns **zero rows** (column dropped).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20240001000046_homework_attachments.sql
git commit -m "feat(db): replace homework.attachment_url with homework_attachments table"
```

---

## Task 2: homework_status table + enums + RLS

**Files:**
- Create: `supabase/migrations/20240001000047_homework_status.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Per-student homework engagement. ONE row per (homework, student), created
-- lazily on first parent action. Parents own state/viewed_at/done_at; teachers
-- own rating/teacher_comment/reviewed_at/reviewed_by. All writes go through the
-- RPCs in migration 48 — clients get NO direct INSERT/UPDATE/DELETE.

CREATE TYPE public.homework_state  AS ENUM ('viewed', 'done');
CREATE TYPE public.homework_rating AS ENUM ('good', 'satisfactory', 'needs_improvement');

CREATE TABLE public.homework_status (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_id     UUID NOT NULL REFERENCES public.homework(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  school_id       UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  state           public.homework_state NOT NULL,
  viewed_at       TIMESTAMPTZ,
  done_at         TIMESTAMPTZ,
  rating          public.homework_rating,
  teacher_comment TEXT,
  reviewed_at     TIMESTAMPTZ,
  reviewed_by     UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (homework_id, student_id)
);

CREATE INDEX idx_homework_status_homework ON public.homework_status (homework_id);
CREATE INDEX idx_homework_status_student  ON public.homework_status (student_id);

ALTER TABLE public.homework_status ENABLE ROW LEVEL SECURITY;

-- SELECT: school staff (any role for the school) OR the parent who owns the student.
-- The parent check resolves the student's parent_profile_id against auth.uid().
CREATE POLICY "homework_status_select" ON public.homework_status FOR SELECT
  USING (
    public.get_my_role() = 'super_admin'
    OR (
      school_id = public.get_my_school_id()
      AND (
        public.get_my_role() IN ('school_admin', 'principal', 'teacher')
        OR EXISTS (
          SELECT 1 FROM public.student_profiles sp
          WHERE sp.id = homework_status.student_id
            AND sp.parent_profile_id = auth.uid()
        )
      )
    )
  );

-- NO INSERT / UPDATE / DELETE policies. RLS is deny-by-default, so all writes
-- are blocked for clients. The SECURITY DEFINER RPCs in migration 48 perform
-- writes and enforce column-level ownership.
```

- [ ] **Step 2: Apply via db reset**

Run: `supabase db reset`
Expected: completes without error.

- [ ] **Step 3: Probe enums, table, and that no write policies exist**

Run:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c \
"SELECT enumlabel FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname IN ('homework_state','homework_rating') ORDER BY t.typname, e.enumsortorder;" -c \
"SELECT cmd FROM pg_policies WHERE tablename='homework_status';"
```
Expected: first query returns `good, needs_improvement, satisfactory, viewed, done` (5 labels across the two types). Second query returns exactly **one** row: `SELECT`. (No INSERT/UPDATE/DELETE policies = clients cannot write.)

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20240001000047_homework_status.sql
git commit -m "feat(db): add homework_status table, enums, and read-only RLS"
```

---

## Task 3: Column-aware RPCs (parent + teacher writes)

**Files:**
- Create: `supabase/migrations/20240001000048_homework_rpcs.sql`

- [ ] **Step 1: Write the migration**

```sql
-- All homework_status writes flow through these SECURITY DEFINER functions.
-- They enforce ownership (parent-of-student / teacher-of-section) and touch
-- ONLY the columns the caller is allowed to set. search_path = '' forces fully
-- qualified names (same hardening as get_active_academic_year).

-- Helper: is auth.uid() the parent of this student?
CREATE OR REPLACE FUNCTION public.is_parent_of_student(p_student_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.student_profiles sp
    WHERE sp.id = p_student_id
      AND sp.parent_profile_id = auth.uid()
  );
$$;

-- Helper: does auth.uid() teach the section this homework belongs to (active year)?
-- Homeroom (section_assignments) OR subject teacher (timetable). Mirrors the
-- attendance notification authorization.
CREATE OR REPLACE FUNCTION public.teaches_homework_section(p_homework_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_section uuid;
  v_school  uuid;
  v_year    uuid;
BEGIN
  SELECT section_id, school_id INTO v_section, v_school
  FROM public.homework WHERE id = p_homework_id;
  IF v_section IS NULL THEN RETURN false; END IF;

  v_year := public.get_active_academic_year(v_school);

  RETURN EXISTS (
    SELECT 1 FROM public.section_assignments sa
    WHERE sa.section_id = v_section
      AND sa.class_teacher_id = auth.uid()
      AND sa.academic_year_id = v_year
  ) OR EXISTS (
    SELECT 1 FROM public.timetable tt
    WHERE tt.section_id = v_section
      AND tt.teacher_id = auth.uid()
      AND tt.academic_year_id = v_year
  );
END;
$$;

-- Resolve a homework's school_id once (used by the parent RPCs to stamp the row).
CREATE OR REPLACE FUNCTION public._homework_school(p_homework_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT school_id FROM public.homework WHERE id = p_homework_id; $$;

-- PARENT: mark viewed (idempotent; never downgrades 'done' back to 'viewed').
CREATE OR REPLACE FUNCTION public.mark_homework_viewed(p_homework_id uuid, p_student_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_parent_of_student(p_student_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  INSERT INTO public.homework_status (homework_id, student_id, school_id, state, viewed_at)
  VALUES (p_homework_id, p_student_id, public._homework_school(p_homework_id), 'viewed', now())
  ON CONFLICT (homework_id, student_id) DO UPDATE
    SET viewed_at = COALESCE(public.homework_status.viewed_at, now());
END;
$$;

-- PARENT: mark done.
CREATE OR REPLACE FUNCTION public.mark_homework_done(p_homework_id uuid, p_student_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_parent_of_student(p_student_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  INSERT INTO public.homework_status (homework_id, student_id, school_id, state, viewed_at, done_at)
  VALUES (p_homework_id, p_student_id, public._homework_school(p_homework_id), 'done', now(), now())
  ON CONFLICT (homework_id, student_id) DO UPDATE
    SET state = 'done',
        done_at = now(),
        viewed_at = COALESCE(public.homework_status.viewed_at, now());
END;
$$;

-- PARENT: undo done (back to viewed) — REFUSED once the teacher has reviewed.
CREATE OR REPLACE FUNCTION public.unmark_homework_done(p_homework_id uuid, p_student_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_reviewed timestamptz;
BEGIN
  IF NOT public.is_parent_of_student(p_student_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT reviewed_at INTO v_reviewed
  FROM public.homework_status
  WHERE homework_id = p_homework_id AND student_id = p_student_id;

  IF v_reviewed IS NOT NULL THEN
    RAISE EXCEPTION 'already_reviewed';
  END IF;

  UPDATE public.homework_status
  SET state = 'viewed', done_at = NULL
  WHERE homework_id = p_homework_id AND student_id = p_student_id;
END;
$$;

-- TEACHER: review (rating + comment). Requires the student to be 'done'.
CREATE OR REPLACE FUNCTION public.review_homework(
  p_homework_id uuid,
  p_student_id  uuid,
  p_rating      public.homework_rating,
  p_comment     text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_state public.homework_state;
BEGIN
  IF NOT public.teaches_homework_section(p_homework_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT state INTO v_state
  FROM public.homework_status
  WHERE homework_id = p_homework_id AND student_id = p_student_id;

  IF v_state IS DISTINCT FROM 'done' THEN
    RAISE EXCEPTION 'not_done';
  END IF;

  UPDATE public.homework_status
  SET rating = p_rating,
      teacher_comment = NULLIF(btrim(p_comment), ''),
      reviewed_at = now(),
      reviewed_by = auth.uid()
  WHERE homework_id = p_homework_id AND student_id = p_student_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_homework_viewed(uuid, uuid)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_homework_done(uuid, uuid)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.unmark_homework_done(uuid, uuid)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_homework(uuid, uuid, public.homework_rating, text) TO authenticated;
```

- [ ] **Step 2: Apply via db reset**

Run: `supabase db reset`
Expected: completes without error.

- [ ] **Step 3: Verify the timetable columns referenced actually exist**

The `teaches_homework_section` helper references `timetable(section_id, teacher_id, academic_year_id)` and `section_assignments(section_id, class_teacher_id, academic_year_id)`. Confirm:

Run:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "\d public.timetable" -c "\d public.section_assignments"
```
Expected: `timetable` has `section_id`, `teacher_id`, `academic_year_id`; `section_assignments` has `section_id`, `class_teacher_id`, `academic_year_id`. If a column name differs, update the helper to match before proceeding.

- [ ] **Step 4: Positive probe — parent marks viewed then done**

This simulates the parent RPC calls as the authenticated parent. It picks a real seeded homework + the student whose `parent_profile_id` we impersonate.

Run:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" <<'SQL'
BEGIN;
-- pick a homework and a student in its section that has a parent
WITH hw AS (SELECT id, section_id, school_id FROM public.homework LIMIT 1),
     st AS (
       SELECT sp.id AS student_id, sp.parent_profile_id
       FROM public.student_profiles sp
       JOIN public.student_enrollments se ON se.student_profile_id = sp.id
       JOIN hw ON hw.section_id = se.section_id
       WHERE sp.parent_profile_id IS NOT NULL
       LIMIT 1
     )
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT parent_profile_id FROM st), 'role','authenticated')::text, true),
       set_config('app.school_id', (SELECT school_id FROM hw)::text, true),
       set_config('app.role', 'parent', true);
SET LOCAL ROLE authenticated;
SELECT public.mark_homework_viewed((SELECT id FROM hw), (SELECT student_id FROM st));
SELECT public.mark_homework_done((SELECT id FROM hw), (SELECT student_id FROM st));
SELECT state, viewed_at IS NOT NULL AS seen, done_at IS NOT NULL AS done
FROM public.homework_status
WHERE homework_id = (SELECT id FROM hw) AND student_id = (SELECT student_id FROM st);
ROLLBACK;
SQL
```
Expected: final row shows `state = done`, `seen = t`, `done = t`. No errors.

> Note: this CTE form re-evaluates `hw`/`st` per statement, which works because the underlying data is stable within the transaction. If the seed has no homework with an enrolled student that has a parent, the probe returns no rows — in that case verify manually with explicit IDs from `SELECT id FROM public.homework;` rather than failing the task.

- [ ] **Step 5: Negative probe — a parent CANNOT self-grade**

Direct UPDATE to set a rating must be denied by RLS (no write policy), and there is no parent RPC that sets `rating`.

Run:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" <<'SQL'
BEGIN;
WITH st AS (SELECT id, parent_profile_id FROM public.student_profiles WHERE parent_profile_id IS NOT NULL LIMIT 1)
SELECT set_config('request.jwt.claims', json_build_object('sub',(SELECT parent_profile_id FROM st),'role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
-- Attempt a direct table UPDATE of rating — must affect 0 rows (RLS blocks).
WITH st AS (SELECT id FROM public.student_profiles WHERE parent_profile_id IS NOT NULL LIMIT 1)
UPDATE public.homework_status SET rating = 'good'
WHERE student_id = (SELECT id FROM st);
ROLLBACK;
SQL
```
Expected: `UPDATE 0` (RLS prevents the parent from writing any `homework_status` row directly). It must NOT report `UPDATE 1`.

- [ ] **Step 6: Negative probe — undo after review is refused**

Run:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" <<'SQL'
BEGIN;
-- Seed a reviewed row directly as the table owner (postgres bypasses RLS here).
WITH hw AS (SELECT id, section_id, school_id FROM public.homework LIMIT 1),
     st AS (
       SELECT sp.id AS student_id, sp.parent_profile_id
       FROM public.student_profiles sp
       JOIN public.student_enrollments se ON se.student_profile_id = sp.id
       JOIN hw ON hw.section_id = se.section_id
       WHERE sp.parent_profile_id IS NOT NULL LIMIT 1
     )
INSERT INTO public.homework_status (homework_id, student_id, school_id, state, viewed_at, done_at, rating, reviewed_at)
SELECT hw.id, st.student_id, hw.school_id, 'done', now(), now(), 'good', now() FROM hw, st;

-- Now impersonate the parent and try to undo.
WITH hw AS (SELECT id FROM public.homework LIMIT 1),
     st AS (
       SELECT sp.id AS student_id, sp.parent_profile_id
       FROM public.student_profiles sp
       JOIN public.student_enrollments se ON se.student_profile_id = sp.id
       JOIN public.homework h ON h.section_id = se.section_id
       WHERE sp.parent_profile_id IS NOT NULL LIMIT 1
     )
SELECT set_config('request.jwt.claims', json_build_object('sub',(SELECT parent_profile_id FROM st),'role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
DO $inner$
DECLARE hwid uuid; stid uuid;
BEGIN
  SELECT id INTO hwid FROM public.homework LIMIT 1;
  SELECT sp.id INTO stid FROM public.student_profiles sp WHERE sp.parent_profile_id IS NOT NULL LIMIT 1;
  BEGIN
    PERFORM public.unmark_homework_done(hwid, stid);
    RAISE NOTICE 'UNEXPECTED: undo succeeded';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'EXPECTED refusal: %', SQLERRM;
  END;
END $inner$;
ROLLBACK;
SQL
```
Expected: a notice `EXPECTED refusal: already_reviewed` (the undo raised). It must NOT print `UNEXPECTED: undo succeeded`.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20240001000048_homework_rpcs.sql
git commit -m "feat(db): add column-aware homework_status RPCs (parent mark, teacher review)"
```

---

## Final verification

- [ ] **Clean reset confirms all three migrations apply in order**

Run: `supabase db reset`
Expected: no errors; all migrations + seed apply.

- [ ] **Confirm nothing else referenced the dropped column**

Run: `grep -rn "attachment_url" supabase/ apps/`
Expected: zero matches (the column def is gone from migration 4? — NO: migration 4 still contains the original `attachment_url` line; that's fine, it's the historical create, and migration 46 drops it afterward). Acceptable result: matches ONLY in `20240001000004_academics.sql`. Any match in `apps/` or `seed.sql` is a problem — fix before finishing.

---

## Self-review notes (for the implementer)

- `homework_status` has **no client write policies** by design — deny-by-default RLS blocks direct writes, and the only mutation path is the four SECURITY DEFINER RPCs. This is what prevents a parent from setting their own `rating`.
- The RPCs take `(p_homework_id, p_student_id)` explicitly rather than deriving the student from the parent, because a parent may have multiple children; the caller passes the active child. Authorization (`is_parent_of_student`) still verifies the parent owns that specific student.
- `review_homework` requires `state = 'done'` so a teacher can't grade work the parent hasn't marked complete.
- Plans 2–5 depend on this plan: they assume `homework_attachments`, `homework_status`, the enums, and all four RPCs exist with these exact names and signatures.
- Do not add an `is_active`/status column to `homework` — "overdue" stays derived (`due_date < today`) per the spec.
