# Academic Year Redesign — Design Spec

**Date:** 2026-06-02
**Status:** Approved
**Scope:** Full multi-year data model, year context switching, promotion flow, year creation wizard

---

## Context

The current schema treats academic year as a loose tag on a few tables (`exams`, `fee_structures`, `syllabus`). Core data — student class assignments, timetable, teacher assignments, attendance, homework — has no year scoping. This makes it impossible to:

- View historical data by year
- Set up next year while current year is running
- Promote students from one year to the next
- Switch the entire admin context to a different year

This spec defines the complete redesign: schema changes, year context mechanism, year creation wizard, student promotion flow, and top-bar switcher.

---

## Decision Summary

| # | Decision |
|---|---|
| 1 | `classes` + `subjects` = permanent school-level master data. No year scoping. |
| 2 | Year context stored as a cookie → read as `x-academic-year-id` header in middleware |
| 3 | New `student_enrollments` table replaces `class_id`, `section_id`, `roll_number` on `student_profiles` |
| 4 | New `section_assignments` table for class teacher per year. `timetable` gets `academic_year_id`. Drop `teacher_profiles.class_teacher_of` and `teacher_profiles.subjects[]` |
| 5 | `attendance_records` + `homework` get `academic_year_id` |
| 6 | `discipline_records` + `feedback` get `academic_year_id` (default filter, history accessible via toggle) |
| 7 | `announcements` gets nullable `academic_year_id` |
| 8 | `school_gallery` gets nullable `academic_year_id` |
| 9 | Year switcher visible to `school_admin` + `principal` only. Teachers always locked to active year. |
| 10 | Bulk promotion flow with per-student override. Parent access revocation = prompted manual step on inactivation. |
| 11 | New year auto-copies sections, timetable, `section_assignments`, `fee_structures` into draft. 4-step wizard for year creation. |
| 12 | Clean rewrite — no backfill needed (app not yet in production). |
| 13 | `is_current boolean` → `status enum ('draft' \| 'active' \| 'archived')`. Partial unique index enforces one active year per school. |
| 14 | Partial promotion allowed. Students with pending results flagged but not blocked. |

---

## Schema Changes

### `academic_years` — replace `is_current` with `status`

```sql
ALTER TABLE public.academic_years
  DROP COLUMN is_current,
  ADD COLUMN status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'archived'));

-- Only one active year per school
CREATE UNIQUE INDEX idx_academic_years_one_active
  ON public.academic_years (school_id)
  WHERE status = 'active';
```

### `student_enrollments` — new table

```sql
CREATE TABLE public.student_enrollments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_profile_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  academic_year_id   UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  school_id          UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id           UUID NOT NULL REFERENCES public.classes(id),
  section_id         UUID NOT NULL REFERENCES public.sections(id),
  roll_number        TEXT,
  is_active          BOOLEAN NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_profile_id, academic_year_id)
);
```

### `student_profiles` — strip year-specific columns

```sql
ALTER TABLE public.student_profiles
  DROP COLUMN class_id,
  DROP COLUMN section_id,
  DROP COLUMN roll_number;
```

### `section_assignments` — new table (class teacher per year)

```sql
CREATE TABLE public.section_assignments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id       UUID NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  class_teacher_id UUID NOT NULL REFERENCES auth.users(id),
  school_id        UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(section_id, academic_year_id)
);
```

### `teacher_profiles` — drop year-specific columns

```sql
ALTER TABLE public.teacher_profiles
  DROP COLUMN class_teacher_of,
  DROP COLUMN subjects;
```

### `sections` — add `academic_year_id`

```sql
ALTER TABLE public.sections
  ADD COLUMN academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE CASCADE;
```

Note: Since there is no production data, existing seed sections will be dropped and re-seeded as year-specific rows tied to the active academic year.

### `timetable` — add `academic_year_id`

```sql
ALTER TABLE public.timetable
  ADD COLUMN academic_year_id UUID NOT NULL REFERENCES public.academic_years(id);

-- Drop old unique constraint, add year-scoped one
ALTER TABLE public.timetable
  DROP CONSTRAINT timetable_section_id_day_of_week_period_key;

ALTER TABLE public.timetable
  ADD CONSTRAINT timetable_section_year_day_period_unique
  UNIQUE(section_id, academic_year_id, day_of_week, period);
```

### `attendance_records` — add `academic_year_id`

```sql
ALTER TABLE public.attendance_records
  ADD COLUMN academic_year_id UUID NOT NULL REFERENCES public.academic_years(id);
```

### `homework` — add `academic_year_id`

```sql
ALTER TABLE public.homework
  ADD COLUMN academic_year_id UUID NOT NULL REFERENCES public.academic_years(id);
```

### `discipline_records` — add `academic_year_id`

```sql
ALTER TABLE public.discipline_records
  ADD COLUMN academic_year_id UUID REFERENCES public.academic_years(id);
```

Nullable — existing records and records without a year context remain valid. Default filter in UI shows active year; "View all years" toggle removes filter.

### `feedback` — add `academic_year_id`

```sql
ALTER TABLE public.feedback
  ADD COLUMN academic_year_id UUID REFERENCES public.academic_years(id);
```

Same nullable pattern as discipline.

### `announcements` — add nullable `academic_year_id`

```sql
ALTER TABLE public.announcements
  ADD COLUMN academic_year_id UUID REFERENCES public.academic_years(id);
```

- Null = timely/evergreen announcement, always visible regardless of year context
- Non-null = year-specific, shown only when that year is active context
- Parent/teacher views always show: current year + null-year announcements

### `school_gallery` — add nullable `academic_year_id`

```sql
ALTER TABLE public.school_gallery
  ADD COLUMN academic_year_id UUID REFERENCES public.academic_years(id);
```

Same nullable pattern as announcements.

---

## Year Context Mechanism

### Cookie

Name: `academic_year_id`
Set by: the top-bar year switcher (client-side)
Domain: `.lvh.me` / `.balajierp.com` (same pattern as `active_section`)
Default: if cookie absent, middleware resolves to the school's `active` year

### Middleware

In `middleware.ts`, after resolving the school and user role:

1. Read `academic_year_id` cookie
2. If absent or invalid, query `academic_years` where `school_id = schoolId AND status = 'active'` and use that ID
3. Set `x-academic-year-id` request header
4. All server components and API routes read `request.headers.get('x-academic-year-id')`

### Teacher Lock

Teachers do not get a year switcher. For teachers, middleware always resolves to the active year regardless of cookie value. The cookie is ignored for the `teacher` role.

---

## Top-Bar Year Switcher

Visible to `school_admin` and `principal` only.

**Component:** `AcademicYearSwitcher` — a dropdown in the `TopBar` component, positioned between the breadcrumb and the right-side actions.

**Behaviour:**
- Lists all years for the school ordered by start date descending
- Current selection shown as chip: e.g. "2025-26 (Active)" or "2024-25 (Archived)"
- Draft years shown with a "Draft" badge — switchable so admin can preview and configure
- On select: sets `academic_year_id` cookie and does `router.refresh()` to re-fetch all server components with new year context
- If the selected year is `draft`, a yellow banner appears at the top of every page: "You are viewing a draft year — changes here will not affect the live school until this year is activated."

---

## Year Creation Wizard (New Academic Year)

Triggered from the Academics page when the admin clicks "New Academic Year". A 4-step **modal wizard** (not full-page — the school is already running, this is not first-time setup).

### Step 1 — Create Year
- Year name, start date, end date
- Inserts with `status = 'draft'`

### Step 2 — Review Sections
- System auto-copies all sections from the previous active year into the new draft year
- Admin sees a table: existing sections with checkboxes (deselect to remove), plus "Add section" to create new ones
- Confirms section list for the new year

### Step 3 — Review Teacher Assignments
- System auto-copies `section_assignments` and `timetable` from the previous active year
- Admin reviews a table of section → class teacher mappings, can reassign
- Timetable copy is silent (done in background) — admin can edit timetable in detail from the Timetable page later

### Step 4 — Review Fee Structures
- System auto-copies `fee_structures` from the previous active year
- Admin sees a table with amounts — can edit amounts inline before confirming
- Confirms fee structures for new year

**After wizard completes:** Year stays in `draft`. Admin configures further (timetable details, additional sections) before running the promotion flow.

### Activating a Draft Year
A prominent "Activate Year" button on the Academics page when a draft year exists. This:
1. Sets the draft year `status = 'active'`
2. Sets the previously active year `status = 'archived'`
3. Switches the `academic_year_id` cookie to the new year for all admins
4. Cannot be undone without manual DB intervention

---

## Student Promotion Flow

Triggered from the Academics page: "Promote Students →" button, only visible when a draft year exists.

### Flow

1. System fetches all students with an `is_active = true` enrollment in the current active year
2. Builds a promotion table:
   - Student name
   - Current class/section
   - Suggested next class (auto-incremented: Class 5 → Class 6, Class 12 → flagged as "Graduated")
   - Suggested section (same section name if it exists in new year, else first available)
   - Status: "Ready", "Pending results" (has exams with no results), "Needs review"
   - Override dropdown: admin can change target class/section per student
3. Students with pending exam results are flagged but not blocked — admin can promote them anyway
4. Filters: "Show all", "Show pending only", "Show ready only"
5. Bulk actions: "Promote all ready", "Promote selected"
6. On confirm: inserts `student_enrollments` rows for the draft year for each promoted student

### Inactive / Not Promoted Students

When an admin marks a student as "not promoting" (dropped out, transferred, detained):
- Their `student_enrollments.is_active` for the current year is set to `false`
- A modal prompts: "Revoke parent app access? This will prevent the parent from logging in." — Yes (default) / No
- If Yes: `user_roles.is_active = false` for the parent's role

---

## Pages Affected by Year Context

Every page that queries year-scoped data must read `x-academic-year-id` from headers and use it in all queries. Pages include:

| Page | Year-scoped queries |
|---|---|
| Dashboard | Student count, teacher count, fee collection, attendance |
| Students | `student_enrollments` for the year |
| Teachers | `section_assignments` + `timetable` for the year |
| Classes | `sections` for the year |
| Timetable | `timetable` for the year |
| Academics | `exams` for the year |
| Fees | `fee_structures` + `fee_line_items` for the year |
| Syllabus | `syllabus` for the year |
| Attendance | `attendance_records` for the year |
| Homework | `homework` for the year |
| Discipline | `discipline_records` default filter for the year (toggle for all years) |
| Feedback | `feedback` default filter for the year (toggle for all years) |
| Announcements | Year-specific + null-year announcements |
| Gallery | Year-specific + null-year gallery items |
| Reports | All reports scoped to selected year |

---

## Files Affected

### New migrations
Migration filenames will be timestamped sequentially at implementation time.

| Migration | Purpose |
|---|---|
| `_academic_year_status` | Replace `is_current` with `status` enum + unique index |
| `_student_enrollments` | New `student_enrollments` table + drop `student_profiles` year cols |
| `_section_assignments` | New `section_assignments` + drop `teacher_profiles` year cols |
| `_year_scope_columns` | Add `academic_year_id` to `sections`, `timetable`, `attendance_records`, `homework`, `discipline_records`, `feedback`, `announcements`, `school_gallery` |

### App changes
| File | Change |
|---|---|
| `middleware.ts` | Add year context resolution → `x-academic-year-id` header |
| `components/top-bar.tsx` | Add `AcademicYearSwitcher` for `school_admin` + `principal` |
| `components/academic-year-switcher.tsx` | New — dropdown + cookie setter |
| `app/(school)/layout.tsx` | Pass `academicYearId` to server components via headers |
| `app/(school)/admin/academics/page.tsx` | Year management, "New Year" wizard trigger, "Promote Students" trigger |
| `app/(school)/admin/academics/new-year-wizard.tsx` | New — 4-step modal wizard |
| `app/(school)/admin/academics/promotion-flow.tsx` | New — bulk promotion table |
| All admin pages listed above | Update queries to use `x-academic-year-id` header |

---

## Out of Scope

- Mobile app year switching — Expo app always uses the active year
- Platform admin year management — super_admin manages years through the school admin interface
- Archiving/deleting years — years are never deleted, only archived
- Subject schema changes — subjects remain school-level permanent data
