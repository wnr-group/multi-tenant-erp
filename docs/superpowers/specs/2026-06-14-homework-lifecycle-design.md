# Homework Lifecycle Rework — Design

**Date:** 2026-06-14
**Status:** Approved (design phase)

## Goal

Turn homework from a one-way bulletin board into a two-sided engagement loop. Today a teacher posts homework, parents can see it, and it sits in a derived "due/overdue" state forever — there is no acknowledgment, no completion signal, and no teacher feedback. This rework adds: multi-file attachments, a per-student status lifecycle (Viewed → Done → Reviewed), a teacher completion roster with inline review (rating + comment), and notifications that close the loop.

## Background — current state

- **Schema:** `homework` table (`id, school_id, class_id, section_id, subject_id, teacher_id, title, description, due_date, attachment_url, created_at`). `attachment_url` exists but is unused by any UI. No status column. No submission/engagement table.
- **RLS:** `homework_select` (school-scoped read for any school member); `homework_write` (super_admin/school_admin/teacher, school-scoped).
- **Web (teacher-only):** `apps/web/app/(school)/teacher/homework/page.tsx` (DataTable list + create form) and `create-homework-form.tsx` (title, due date, class, section, subject, description — no attachments). The web app is **staff-only** (`(school)` route group serves school_admin/principal/teacher). **Parents have no web presence** — they are mobile-only.
- **Mobile teacher:** `apps/mobile/app/(teacher)/classes.tsx` — homework tab with a flat list of cards (tap does nothing) + an "Assign Homework" bottom sheet. Status shown as derived "Overdue"/due date.
- **Mobile parent:** `apps/mobile/app/(parent)/academics.tsx` — calendar + flat homework list with a *fake* status badge ("submitted" if `due_date >= today`, else "overdue").
- **Storage:** Existing buckets (`school-gallery`, `school-assets`, `student-photos`) are all **public**. The web syllabus form references a `files` bucket that **no migration creates** (latent bug — relies on manual Studio setup). We will not reuse that pattern.
- **Notifications:** `notifications` table (`id, school_id, user_id, student_id, title, body, type, is_read, created_at`); `student_id` scopes multi-child parents. Edge function `send-attendance-notification` is the reference pattern: insert in-app row + Expo push if the recipient has a `push_token`.
- **Relationships:** parent↔student via `student_profiles.parent_profile_id → profiles(id)`; teacher↔section via `section_assignments` (homeroom) or `timetable` (subject teacher); enrollment via `student_enrollments(student_profile_id, section_id, academic_year_id, is_active)`. Active year via `get_active_academic_year(p_school_id)`.
- **Scope/RLS helpers:** `get_my_role()`, `get_my_school_id()` (read GUCs set by `scope_pre_request()` from request headers).

## State machine

**Homework level:** no stored status column. Homework is active by default; **"Overdue" is derived** (`due_date < today`). No draft, no stored "closed" state.

**Per-student level** (`homework_status`, one row per student per homework, created **lazily** on first action):

```
(no row) = Not Started
   │ parent opens detail screen
   ▼
 viewed ──parent taps "Mark as Done"──► done ──teacher reviews──► done + rating/comment
   ▲                                      │
   └────────── parent undo ───────────────┘   (undo allowed ONLY until reviewed_at is set; then locked)
```

- **Parent owns:** `state`, `viewed_at`, `done_at`.
- **Teacher owns:** `rating`, `teacher_comment`, `reviewed_at`, `reviewed_by`.
- `rating` ∈ {`good`, `satisfactory`, `needs_improvement`}.
- The teacher roster is `students enrolled in section` LEFT JOIN `homework_status`; students with no row render as **Not Started**.

## Data model

### 1. `homework` (modify)
- **Drop** the unused `attachment_url` column.
- Keep all other columns. **No status column added.**

### 2. `homework_attachments` (new)
```
id            UUID PK default gen_random_uuid()
homework_id   UUID NOT NULL REFERENCES homework(id) ON DELETE CASCADE
school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE
file_url      TEXT NOT NULL      -- storage object path (not a public URL)
file_name     TEXT NOT NULL
file_type     TEXT NOT NULL      -- mime type
file_size     INT  NOT NULL      -- bytes; enforced <= 2MB
created_at    TIMESTAMPTZ NOT NULL default now()
```
- Multiple attachments per homework.
- Allowed types: `.doc/.docx`, `.pdf`, images (`.jpg/.png`). Each file ≤ 2MB. Enforced client-side **and** re-checked (size) before insert.

### 3. `homework_status` (new)
```
id              UUID PK default gen_random_uuid()
homework_id     UUID NOT NULL REFERENCES homework(id) ON DELETE CASCADE
student_id      UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE
school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE
state           homework_state NOT NULL          -- enum: 'viewed' | 'done'
viewed_at       TIMESTAMPTZ
done_at         TIMESTAMPTZ
rating          homework_rating                  -- enum: 'good'|'satisfactory'|'needs_improvement', NULL until reviewed
teacher_comment TEXT
reviewed_at     TIMESTAMPTZ
reviewed_by     UUID REFERENCES auth.users(id)
created_at      TIMESTAMPTZ NOT NULL default now()
UNIQUE(homework_id, student_id)
```

New enums: `homework_state ('viewed','done')`, `homework_rating ('good','satisfactory','needs_improvement')`.

## Storage

- New **private** bucket `homework-attachments` (created via migration — `INSERT INTO storage.buckets (id, name, public) VALUES ('homework-attachments','homework-attachments',false)`).
- Path convention: `homework/{schoolId}/{homeworkId}/{timestamp}-{filename}`.
- Served via short-lived **signed URLs** (`createSignedUrl`) generated on demand for authorized users (teacher who owns/teaches it; parent of a student in that section).
- Storage RLS policies: writes restricted to staff of the owning school; reads gated to the school. (Signed URLs are generated server-/client-side for authorized roles; bucket is non-public so a leaked path alone is not readable.)
- **Mobile** gains the `expo-document-picker` dependency (Expo SDK 55 compatible) for DOC/PDF selection, alongside the existing `expo-image-picker` for photos.

## Security — column-aware RPCs

Direct table writes to `homework_status` are **locked down** by RLS (no client INSERT/UPDATE). All mutations go through `SECURITY DEFINER` RPCs that enforce ownership and touch only the caller's columns:

- `mark_homework_viewed(p_homework_id)` — caller must be the parent (`student_profiles.parent_profile_id = auth.uid()`) of a student enrolled in the homework's section. Upserts a row to `state='viewed'`, sets `viewed_at` if null. Idempotent (no downgrade from `done`).
- `mark_homework_done(p_homework_id)` — same parent check. Sets `state='done'`, `done_at=now()`.
- `unmark_homework_done(p_homework_id)` — same parent check. Reverts to `state='viewed'`, clears `done_at`. **Refuses (raises) if `reviewed_at` is set** (locked once reviewed).
- `review_homework(p_homework_id, p_student_id, p_rating, p_comment)` — caller must teach the section (homeroom via `section_assignments` OR subject via `timetable`, for the active academic year), mirroring the attendance authorization pattern. Sets `rating`, `teacher_comment`, `reviewed_at=now()`, `reviewed_by=auth.uid()`. Requires the student to be in `state='done'`.

RLS on `homework_status`: SELECT allowed for the owning parent (their children) and teachers/staff of the school; INSERT/UPDATE/DELETE denied to clients (RPC-only via definer).

RLS on `homework` and `homework_attachments`: keep the existing school-scoped read; writes for super_admin/school_admin/teacher of the school. Parents get SELECT on `homework`/`homework_attachments` for homework in their child's section (needed so the parent detail screen can read it) — scoped through enrollment.

## Notifications

Reuse the `notifications` table + Expo push pattern (`send-attendance-notification` as the template). Events:

1. **New homework → parents of the section.** Fired inline when homework is published (created). One notification per enrolled student, scoped via `student_id`, `type='homework_assigned'`. Push if parent has `push_token`. This is the core gap being fixed.
2. **Teacher reviewed → that parent.** Fired inline from `review_homework`. Single notification scoped to that `student_id`, `type='homework_reviewed'`.
3. **Due-date reminder → parents of undone students.** A **pg_cron** scheduled job invoking a new edge function (`send-homework-reminders`) that finds homework due "today" (or the evening before) and notifies parents of students with no `done` status. `type='homework_due'`.
   - **Infra note:** pg_cron + scheduled functions do not exist in the repo today. This job runs **only against the deployed/remote DB** — it cannot be exercised on the local stack. It will be built and migration-defined but **verified on deploy**, not locally. Sequenced as the final task so the rest of the feature is fully testable locally first.
4. **Parent marked Done → teacher: NOT notified.** The live roster ("X/Y done") + card badge convey this without per-Done notification noise.

## UI

### Teacher — Web (`apps/web/app/(school)/teacher/homework/`)
- `create-homework-form.tsx`: add a **multi-file attachment picker** (DOC/PDF/images, ≤2MB each), uploading to the private bucket and inserting `homework_attachments` rows.
- `page.tsx`: each homework row links to a new **detail page** `teacher/homework/[id]/page.tsx`. Add a live **"X/Y done"** column to the table.
- Detail page: **roster grouped by status** — collapsible sections "Done — needs review" (top), "Viewed (not done)", "Not started", plus a summary bar with counts. **Inline review**: expanding a "Done" row reveals three rating chips (Good / Satisfactory / Needs Improvement) + comment field + Save (calls `review_homework`). Attachments shown with signed-URL download links.
- Edit anytime (title/description/due date/attachments). Delete with a confirm warning if any student has engaged (cascades status rows).

### Teacher — Mobile (`apps/mobile/app/(teacher)/`)
- `classes.tsx` homework tab: cards become **tappable** with a live "X/Y done" hint; route to a new homework detail screen.
- New homework detail screen: same **status-grouped roster** + **inline row expand** review (rating chips + comment) as web.
- Create sheet: add the attachment picker (`expo-document-picker` + `expo-image-picker`), ≤2MB validation.

### Parent — Mobile only (`apps/mobile/app/(parent)/`)
- `academics.tsx` list: replace the fake badge with **real per-child status** — New (unviewed) / Viewed / Done / Reviewed (shows teacher rating); overdue-and-not-done in red.
- New homework **detail screen** (tap a card): **auto-marks Viewed** on open (`mark_homework_viewed`); shows full description + attachments (tap opens via signed URL); **"Mark as Done"** button (`mark_homework_done`), with undo (`unmark_homework_done`) available until reviewed. After review, shows the teacher's rating + comment.
- **No web equivalent** — parents do not use the web app.

## Parity summary

- **Teacher loop:** web **and** mobile (create + attachments + grouped roster + inline review).
- **Parent loop:** **mobile only** (real status, detail screen, auto-Viewed, Mark Done, view feedback) — because parents have no web presence.

## Testing strategy

No test framework in the repo. Verify via:
- `supabase db reset` + psql probes for migrations, enums, RLS, and the RPCs (including negative cases: parent cannot self-grade, parent cannot undo after review, teacher of wrong section is rejected).
- `npm run type-check` (web), `npx tsc --noEmit` (mobile).
- Manual flows on the emulator (teacher publish → parent notified → view → done → teacher review → parent sees feedback) and on web for the teacher loop.
- pg_cron reminder job: verified on deploy only (cannot run on local stack).

## Scope & sequencing

One coherent subsystem → one spec, one plan. Sequence so all **event-driven** pieces (schema, RPCs, attachments, notifications #1/#2, all UI) are built and locally testable first; the **pg_cron due-date reminder (#3)** is the final, deploy-verified task.

## Out of scope

- Numeric/marks-based grading for homework (using simple rating instead).
- Digital file submission *by parents/students* (parents acknowledge "Done"; no upload of completed work).
- Draft homework state and manual/auto "closed" state.
- Teacher notification on each parent "Done".
- Any parent-facing web UI.
