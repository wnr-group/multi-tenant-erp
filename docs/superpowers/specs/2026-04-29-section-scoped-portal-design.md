# Section-Scoped Portal Design Spec

> **Goal:** Replace the broken role-switching mechanism with a global section switcher that lets teachers, principals, and admins view and manage any class/section from a unified teacher portal. Add timetable management so teachers can be assigned to sections.

---

## Problem Statement

The current ERP has a "View as [Role]" mechanism that lets admins impersonate principals or teachers, and principals impersonate teachers. It's implemented via an `acting_as` cookie that swaps the sidebar nav and routes the user to the other role's pages.

**This is fundamentally broken for three reasons:**

1. **Principals see nothing useful as a "teacher."** When a principal clicks "Teacher View," they land on the teacher dashboard — but they have no `teacher_profile` row (no `class_teacher_of`, no timetable entries). The dashboard shows 0 periods, 0 sections, 0 students, "No section assigned yet." Every teacher page that depends on the logged-in user's teacher identity returns empty data.

2. **The wrong abstraction.** A principal doesn't think "let me be Teacher Ravi Kumar." They think "let me check Class 8A." The role-switch forces them to adopt a teacher's identity when what they need is a class/section lens on the data.

3. **Teachers with multiple sections can't navigate between them.** The teacher portal implicitly assumes one section via `class_teacher_of`. A teacher who teaches Math to Class 7A, 8A, and 9B (via timetable) can only see their homeroom section's data. The attendance page was the only page with a section picker — homework, results, discipline, and fees had none.

### What we're replacing it with

One teacher portal with a **global section switcher** in the sidebar. Every role gets the same portal — the only difference is which sections appear in the dropdown:

- **Teacher** → sections they're assigned to (from `class_teacher_of` + `timetable`)
- **Principal** → all school sections
- **School Admin** → all school sections

When a principal or admin picks a section, the sidebar swaps to the teacher portal nav. All pages scope to that section. An "Exit" button returns them to their own dashboard. No fake identity, no broken impersonation — just a section context.

---

## Design Decisions and Rationale

This section documents every decision made during the design process, including rejected alternatives and the reasoning.

### Decision 1: Section switcher vs. role switching

**Decided:** Global section switcher. Remove all "View as" role-switching.

**Rejected alternatives:**
- **(A) Fix role-switching by creating virtual teacher profiles for principals** — Would require fake timetable entries and a fake `class_teacher_of` for every principal. Adds complexity to maintain fake data, and still forces the wrong mental model ("be a teacher" vs. "inspect a class").
- **(B) Add class/section filters to each principal page independently** — Each page gets its own dropdown. Fragments the experience — the principal has to re-select the class on every page. No persistent context.
- **(C) Persistent class/section selector in the header** — Single global selector that all pages read. This is essentially what we're doing, but placed in the sidebar for better visibility and grouping.

**Why this approach:** Reuses the existing teacher portal code (no page duplication). The section switcher is the simplest mechanism that solves the core problem — scoping data to a class/section regardless of the viewer's role.

### Decision 2: Section switcher placement and format

**Decided:** Grouped dropdown in the sidebar header, below school name, above nav links. Sections grouped by class (Class 1 → A, B; Class 2 → A, B; etc.).

**Rejected alternatives:**
- **(A) Flat dropdown** — "Class 1 – A", "Class 1 – B", "Class 2 – A", etc. Works for teachers with 3 sections, but principals see all 24 sections (12 classes × 2). Unorganized.
- **(C) Two-step picker** — First pick class, then section. Two clicks per switch. Overkill when most classes have only 2 sections.

**Why grouped:** 24 items is manageable when visually grouped by class. One click to switch. Scanning by class header is fast. If schools add sections C/D later, the grouping still scales.

### Decision 3: What teachers see vs. principals vs. admins

**Decided:**
- **Teacher:** Only their assigned sections. Sourced from `teacher_profiles.class_teacher_of` (homeroom) + all distinct `section_id` values from `timetable` where `teacher_id = user.id`. Deduplicated.
- **Principal:** All sections in the school, ordered by class order then section name.
- **School Admin:** Same as principal — all sections.

**Why teachers don't see all sections:** A teacher has no business viewing Class 3B if they don't teach there. Scoping the switcher to assigned sections is both a security boundary and a UX improvement (fewer irrelevant options).

**Edge case — teacher with no assignments:** If a teacher has no `class_teacher_of` and no timetable entries, the switcher shows an empty state: "No sections assigned. Contact your administrator." This will happen until the admin populates the timetable.

### Decision 4: Default section on login

**Decided:**
- **Teacher:** Auto-select their `class_teacher_of` section. If they don't have one (subject-only teacher), auto-select the first section from their timetable entries (ordered by class order). If no timetable entries either, show "No sections assigned" empty state.
- **Principal / Admin:** No auto-selection. Show a "Select a class/section to get started" prompt on the teacher dashboard. The principal/admin dashboard (their own role's dashboard) shows school-wide stats — they only enter the section-scoped view when they deliberately choose a section.

**Why not auto-select for principals:** A principal doesn't have a "default" class. They're looking at the school-wide picture first, then drilling into a specific section when needed. Auto-selecting Class 1A would be arbitrary and confusing.

**Rejected alternative:**
- **(B) Force section selection before showing any data** — even for teachers. Adds friction for the daily use case: teacher opens app in the morning, wants to see their homeroom stats immediately.

### Decision 5: Nav sidebar behavior when section is selected

**Decided:** Full nav swap. When a section is selected, the sidebar completely changes to the teacher portal nav. For principals/admins, a "Back to [Principal/Admin]" button appears above the section switcher.

**Teacher sidebar (section selected):** Dashboard, Attendance, Homework, Results, Discipline, Fees, Feedback
**Principal/Admin sidebar (section selected):** Same as teacher, minus Feedback. Plus "Back to Principal" / "Back to Admin" exit button.

**Rejected alternatives:**
- **(B) Merged nav** — principal pages + teacher pages in one sidebar, separated by a divider. Creates confusion about what's section-scoped and what's school-wide. Too many nav items.
- **(C) Collapsible "Class View" sub-section** — Within the principal nav, a collapsible section that reveals teacher pages. Adds nesting complexity for no real benefit over a clean swap.

**Why full swap:** Cleanest mental model — you're either in "school-wide mode" or "section mode." The exit button is always one click away. This also mirrors what the current `acting_as` mechanism already does (swaps the sidebar), so users who've used the old system won't be disoriented.

### Decision 6: Feedback page scoping

**Decided:** Feedback is NOT section-scoped. It's personal to the logged-in user. Only visible to real teachers — hidden when a principal/admin is in section view.

**Rationale:** Feedback is user-to-user communication (parent → teacher). A parent sends feedback to "Mrs. Priya," not to "the teacher currently viewing Class 1A." Forcing feedback into the section model would mean principals see other teachers' private messages, which is wrong.

**Behavior:** The Feedback nav item only appears in the sidebar when `user_role = teacher` (checking the real role from the database, not the acting role). Principals and admins in section view don't see it at all.

### Decision 7: Fee access per role

**Decided:**
- **Teachers** can view fee status for their section's students AND record payments. They cannot create fee structures.
- **Admins** create fee structures (set amounts, types, due dates). This stays admin-only.
- **Principals** can view + record payments (same as teachers) when in section view.

**Rationale:** In Indian schools, teachers (especially class teachers) are often the first point of contact for fee questions. Parents hand cash to the class teacher. The teacher needs to mark it as paid. But setting the fee amounts/types is a school-level administrative decision — not something individual teachers should control.

### Decision 8: Exam types and ownership

**Decided:** Two exam types:
1. **Section-level exam** — created by a teacher for their specific section (e.g., "Unit Test 3 for Class 8A"). Only that section's students participate.
2. **Class-level exam** — created by admin from the Academics page (e.g., "Mid-Term Exam for Class 8"). All sections of that class participate. Teachers enter marks for their section's students.

**Who enters marks:**
- For section-level exams: the teacher who created it, or any teacher assigned to that section via timetable/class_teacher_of.
- For class-level exams: any teacher assigned to the section via timetable/class_teacher_of. Each teacher enters marks for their own subject.

**Why not a third "school-level" exam type:** A school-level exam (annual exam for all classes) is just a class-level exam created for each class. The admin creates "Annual Exam" for Class 1, Class 2, ... Class 12 separately. This avoids cross-class data complexity with no loss of functionality. Class-level is sufficient — it covers both mid-terms and annuals.

**Subject-awareness:** When a teacher clicks into an exam's marks entry page, the system knows which subjects they teach in that section (from timetable). It shows only their subject's column for mark entry. Other subjects' marks are read-only. This prevents Math teachers from accidentally editing English marks.

### Decision 9: Who can create discipline records

**Decided:** Any teacher assigned to the section (via timetable or class_teacher_of) AND principals can create discipline records for students in the selected section.

**Rationale:** A subject teacher who witnesses an incident in their class should be able to record it immediately — not relay it to the class teacher to log. Principals doing classroom rounds should also be able to log incidents directly.

### Decision 10: Section context persistence

**Decided:** Cookie-based. `active_section=<section_uuid>`, 8-hour TTL, on the school's subdomain (`.lvh.me` for local, `.balajierp.com` for production). Same domain pattern as the existing cookies.

**Why cookie (not URL param or server-side state):**
- **vs. URL param:** Every link would need `?section=uuid` appended. Ugly, fragile, easy to lose on manual navigation.
- **vs. server-side state:** Requires a DB write on every section switch. Overkill for a UI preference that only matters for the current browser session.
- **Cookie works because:** It survives page refreshes and tab switches. The middleware can read it and pass it as a header to server components. It's the same pattern the app already uses for school context. 8-hour TTL matches a school day — if the teacher logs in the next morning, they get their default section again (fresh auto-selection).

**Cleared on:** logout (cookie deleted), or "Exit" button click (for principal/admin returning to their dashboard).

### Decision 11: Principal/Admin dashboard content (school-wide view)

**Decided:** Keep the existing dashboards as-is. They are the "bird's eye view" before drilling into a section.

- **Admin Dashboard:** school-wide stats (students, teachers, classes, fee collected), fee chart, attendance donut, students by class, announcements.
- **Principal Dashboard:** school-wide stats (present/absent today, total students, discipline this month), weekly attendance trend, attendance by class, discipline incidents chart, announcements.

These dashboards already show real Supabase data (wired in this sprint). No changes needed except removing the "View as" buttons at the bottom.

### Decision 12: Admin sidebar — merging principal pages

**Decided:** Add Reports and Discipline to the admin sidebar as top-level items. The admin gets full access to everything the principal can see, plus admin-only features.

**Full admin sidebar:** Dashboard, Teachers, Students, Classes, Subjects, Timetable (NEW), Academics, Fees, Syllabus, Announcements, Discipline, Reports, Settings

**Why flat list (not grouped):** 13 items is manageable — most SaaS apps have more. Grouping adds visual complexity and component work we don't need at this stage. Can revisit if the sidebar grows further.

---

## Navigation Architecture — Complete Map

### Admin (no section selected)

```
Sidebar:
  [Section Switcher — "Select a class/section"]
  ─────────
  Dashboard          → /admin/dashboard (school-wide stats)
  Teachers           → /admin/teachers
  Students           → /admin/students
  Classes            → /admin/classes
  Subjects           → /admin/subjects
  Timetable          → /admin/timetable (NEW)
  Academics          → /admin/academics
  Fees               → /admin/fees
  Syllabus           → /admin/syllabus
  Announcements      → /admin/announcements
  Discipline         → /admin/discipline (school-wide list)
  Reports            → /admin/reports
  Settings           → /admin/settings
  ─────────
  [User profile + Logout]
```

### Principal (no section selected)

```
Sidebar:
  [Section Switcher — "Select a class/section"]
  ─────────
  Dashboard          → /principal/dashboard (school-wide stats)
  Announcements      → /principal/announcements
  Discipline         → /principal/discipline (school-wide list)
  Reports            → /principal/reports
  ─────────
  [User profile + Logout]
```

### Section-Scoped View (any role, section selected)

```
Sidebar:
  [Back to Admin/Principal] ← only for admin/principal
  [Section Switcher — "Class 8 – Section A"]
  ─────────
  Dashboard          → /teacher/dashboard (section stats)
  Attendance         → /teacher/attendance
  Homework           → /teacher/homework
  Results            → /teacher/results
  Discipline         → /teacher/discipline (section-scoped)
  Fees               → /teacher/fees
  Feedback           → /teacher/feedback (teachers only, hidden for admin/principal)
  ─────────
  [User profile + Logout]
```

### Teacher (auto-selected section on login)

Same as "Section-Scoped View" above, but:
- No "Back to" button (teacher doesn't have another dashboard to return to)
- Section switcher shows only assigned sections
- Feedback tab is visible

---

## Section Switcher — Technical Detail

### Component: `SectionSwitcher`

A client component rendered in the sidebar layout. Receives the section list as a server-component prop (queried at layout level).

**Props:**
```typescript
interface SectionSwitcherProps {
  sections: {
    id: string;
    name: string;        // "A", "B"
    className: string;   // "Class 8"
    classOrder: number;  // 8 (for sorting)
  }[];
  activeSectionId: string | null;  // from cookie
  userRole: 'teacher' | 'principal' | 'school_admin' | 'super_admin';
  exitUrl?: string;  // "/principal/dashboard" or "/admin/dashboard"
}
```

**Rendering logic:**
1. Sort sections by `classOrder` then `name`.
2. Group by `className`.
3. Render a `<select>` or custom dropdown with `<optgroup>` per class.
4. When selection changes:
   - Write `active_section` cookie with selected section UUID, 8-hour TTL, domain = parent domain
   - Navigate to `/teacher/dashboard` (hard navigation via `window.location.href`)
5. If `activeSectionId` is null and `userRole` is teacher, attempt auto-selection:
   - Find the section where `classTeacherOf` matches (needs to be passed as prop or flagged)
   - If none, select first in list
   - If list is empty, show "No sections assigned" message

**"Back to [Role]" button:**
Rendered above the dropdown when `exitUrl` is provided (principal/admin only). On click:
- Delete `active_section` cookie
- Navigate to `exitUrl`

### Data source query (in layout server component)

**For teacher:**
```sql
-- Homeroom section
SELECT s.id, s.name, c.name as class_name, c."order" as class_order
FROM teacher_profiles tp
JOIN sections s ON s.id = tp.class_teacher_of
JOIN classes c ON c.id = s.class_id
WHERE tp.profile_id = :userId

UNION

-- Timetable sections
SELECT DISTINCT s.id, s.name, c.name as class_name, c."order" as class_order
FROM timetable t
JOIN sections s ON s.id = t.section_id
JOIN classes c ON c.id = s.class_id
WHERE t.teacher_id = :userId

ORDER BY class_order, name
```

**For principal/admin:**
```sql
SELECT s.id, s.name, c.name as class_name, c."order" as class_order
FROM sections s
JOIN classes c ON c.id = s.class_id
WHERE s.school_id = :schoolId
ORDER BY c."order", s.name
```

### Middleware changes

The middleware (`apps/web/middleware.ts`) currently:
1. Resolves school from domain
2. Looks up user role
3. Reads `acting_as` cookie for effective role
4. Routes to role prefix

**New behavior:**
1. Resolves school from domain
2. Looks up user role (real role from DB)
3. Reads `active_section` cookie
4. Sets headers: `x-school-id`, `x-user-role`, `x-active-section`
5. Routing logic:
   - If path starts with `/teacher/*` AND user role is `principal`, `school_admin`, or `super_admin` AND `active_section` cookie exists → **allow** (they're in section-scoped view)
   - If path starts with `/teacher/*` AND user role is `teacher` → allow (normal teacher access)
   - If path starts with `/teacher/*` AND user role is `principal`/`admin` AND NO `active_section` → **redirect to their own dashboard** (can't access teacher pages without a section)
   - Remove all `acting_as` cookie handling

**Why the middleware needs to know about `active_section`:** Currently, the middleware blocks principals from accessing `/teacher/*` routes (it redirects them to `/principal/dashboard`). With the section switcher, principals with an active section SHOULD access teacher routes. The `active_section` cookie is the signal.

### Layout changes

The teacher layout (`apps/web/app/(school)/teacher/layout.tsx`) currently checks the real role and allows `teacher`, `principal`, `school_admin`, `super_admin`. This doesn't change — principals and admins are already authorized. But the layout needs to:

1. Read `x-active-section` header
2. If no active section AND user is a teacher → attempt auto-selection (set cookie, redirect)
3. If no active section AND user is principal/admin → redirect to their own dashboard (they shouldn't be on teacher pages without a section)
4. Pass the active section ID to all child pages via a context or prop

The school-level layout (`apps/web/app/(school)/layout.tsx`) currently reads `acting_as` to determine which nav to render. **Change this to:** read `active_section` cookie. If active_section exists, render teacher nav. If not, render nav based on the real user role.

---

## Section-Scoped Dashboard — Detailed Design

**Route:** `/teacher/dashboard`

**Data the page needs (all scoped to the active section):**

### Section Header

Query: `sections` joined with `classes` and `teacher_profiles` (to find the class teacher).

Display: "Class 8 – Section A · Ravi Kumar (Class Teacher) · 43 students"

If no class teacher is assigned to this section, show: "Class 8 – Section A · No class teacher assigned · 43 students"

### Widget 1: Today's Attendance

Query: `attendance_records` where `section_id = active_section` and `date = today`.

States:
- **Not yet marked:** Show "Attendance not marked today" with a prominent "Mark Attendance" button that navigates to `/teacher/attendance/mark?sectionId=X&date=today`.
- **Partially marked:** This shouldn't happen (attendance is saved as a batch for all students), but if it does, show the count.
- **Fully marked:** Show "38/43 present · 4 absent · 1 late" with a link to review/edit.

### Widget 2: Attendance Trend (7 days)

Query: `attendance_records` where `section_id = active_section` and `date` in last 7 school days (Mon-Fri).

Display: Bar chart showing % present per day. Same chart component as the current section attendance chart, just fed with the active section's data.

### Widget 3: Pending Homework

Query: `homework` where `section_id = active_section` and `due_date >= today`, ordered by `due_date ASC`, limit 5.

Display: Simple list. Each row: title, subject name, due date. If no homework, show "No upcoming homework."

### Widget 4: Recent Discipline

Query: `discipline_records` joined with `student_profiles` where `student_profiles.section_id = active_section`, ordered by `created_at DESC`, limit 3.

Display: Each row: student name, category, severity badge, date. If none, show "No recent incidents."

### What's NOT on this dashboard

- **Timetable / periods today:** This is personal to the teacher, not about the section. A principal viewing Class 8A doesn't have periods. For real teachers, timetable info could be shown as a collapsible bar or moved to a "My Schedule" page — but this is out of scope for this plan.
- **"My Sections" stat card:** Redundant — the section switcher already shows which section you're viewing.
- **Homework donut:** A donut showing "0% submitted" is not actionable. The pending homework list replaces it.
- **Fee collection stats:** Fees are a separate tab. The dashboard focuses on daily teaching activities.

---

## Timetable Management (Admin) — Detailed Design

### Why this is needed

The section switcher for teachers depends on `timetable` entries to know which sections a teacher is assigned to. Currently the timetable table exists in the schema but has zero data and no admin UI to populate it. Without this, subject-only teachers (those without `class_teacher_of`) would see zero sections in their switcher.

### Route

`/admin/timetable` — new page, new nav item in admin sidebar (between "Subjects" and "Academics").

### Page Layout

Two sections stacked vertically:

**Section 1: "Assign Teacher" form**

Form fields (all required):
- **Teacher** — dropdown of all teachers in the school. Query: `teacher_profiles` joined with `profiles` for name. Display: "Ravi Kumar".
- **Class** — dropdown of all classes. Cascading: selecting a class enables Section and Subject dropdowns.
- **Section** — dropdown of sections for the selected class. Cascading from Class.
- **Subject** — dropdown of subjects for the selected class. Cascading from Class.
- **Day of Week** — dropdown: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday.
- **Period** — dropdown: 1, 2, 3, 4, 5, 6, 7, 8.
- **"Apply to all weekdays" checkbox** — when checked, creates entries for Mon-Fri (5 entries) instead of the single selected day. The Day of Week dropdown becomes disabled/greyed out.

"Assign" button submits. On success: form resets, table below refreshes, success toast.

On conflict (same section+day+period already assigned): show error "Period 3 on Monday for Class 8A is already assigned to Priya Nair."

**Section 2: "Current Assignments" table**

Filterable table showing all timetable entries for the school.

Columns: Teacher, Class, Section, Subject, Day, Period.

Filters (dropdowns above the table):
- **Teacher** — filter by specific teacher or "All Teachers"
- **Class** — filter by class or "All Classes"
- **Day** — filter by day or "All Days"

Each row has a delete button (with confirmation). Deleting removes the timetable entry.

Default sort: Class order → Section name → Day → Period number.

### Schema

The existing `timetable` table has everything needed:
```sql
CREATE TABLE public.timetable (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     UUID NOT NULL REFERENCES public.schools(id),
  teacher_id    UUID NOT NULL REFERENCES auth.users(id),
  section_id    UUID NOT NULL REFERENCES public.sections(id),
  subject_id    UUID NOT NULL REFERENCES public.subjects(id),
  day_of_week   INT NOT NULL,  -- 1=Mon, 7=Sun
  period        INT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(school_id, section_id, day_of_week, period)
);
```

The unique constraint on `(school_id, section_id, day_of_week, period)` prevents double-booking a period for a section. It does NOT prevent double-booking a teacher (a teacher teaching two sections at the same time). Conflict detection for teacher schedules is out of scope.

### Seed Data

Add timetable entries to `seed.sql` for the 5 demo teachers. Realistic schedule:

| Teacher | Sections | Subject |
|---------|----------|---------|
| Ravi Kumar (teacher1) | Class 8A (homeroom), Class 8B, Class 7A | Mathematics |
| Priya Nair (teacher2) | Class 1A (homeroom), Class 1B, Class 2A | English |
| Suresh Babu (teacher3) | Class 3B (homeroom), Class 3A, Class 4A | Science |
| Kavitha Reddy (teacher4) | Class 5A (homeroom), Class 5B, Class 6A | Social Studies |
| Anand Pillai (teacher5) | Class 7B (homeroom), Class 7A, Class 9A | Hindi |

Each teacher gets 3-4 periods per day across their sections. This means ~15-20 timetable rows per teacher, ~80-100 rows total. Enough to make the section switcher show multiple sections per teacher.

---

## Teacher Portal Pages — Section-Scoped Detailed Design

All pages read the active section from the middleware header (`x-active-section`). A shared helper function `getActiveSection()` reads the header and returns the section UUID or null. If null and the page requires a section, render a "Select a class/section to get started" prompt.

### Attendance

**Current state:** Works after bug fixes. Has its own section picker (`AttendancePicker`) + mark page.

**Changes:**
1. Remove the `AttendancePicker` component from the attendance page. The global section switcher handles section selection.
2. The attendance page (`/teacher/attendance`) becomes a direct view of attendance status for the active section on today's date.
3. Show a table: student name, today's status (present/absent/late/not marked). If not yet marked, show a "Mark Attendance" button that navigates to the mark page.
4. The mark page (`/teacher/attendance/mark`) pre-populates with the active section. The `sectionId` and `date` come from the section context + today's date (or a date picker on the page for reviewing past days).
5. Keep the mark page's existing functionality: per-student status buttons, "All Present"/"All Absent" bulk actions, save.

**Date navigation:** Add a simple date picker on the attendance page to view past days' records. Default to today.

### Homework

**Current state:** Shows all homework by the teacher. Create form has class/section/subject cascading dropdowns.

**Changes:**
1. List shows homework for the **active section only** (filter by `section_id`), not all homework by this teacher.
2. The create form pre-selects the class and section from the active section context. Class and Section dropdowns are pre-filled and can be left as-is (or locked, since the section switcher controls this). Subject dropdown loads subjects for the class.
3. The homework list should show: title, subject, due date, description. Ordered by due_date DESC.

**Who sees what:** A teacher creating homework is recorded as `teacher_id = user.id`. But when viewing a section's homework list, ALL homework for that section is shown regardless of who created it. This lets a principal see all homework assigned to a section, and lets teachers see what other teachers assigned.

### Results / Exams

**Current state:** Broken. Loads all students school-wide. No section filtering. No exam creation flow for teachers.

**Complete rework required.**

**Page: `/teacher/results`**

Shows a list of exams relevant to the selected section's class:
- Section-level exams where `section_id = active_section`
- Class-level exams where `class_id = active_section's class`

Each exam row shows: exam name, type (section/class), subject, date, marks status ("42/43 entered" or "Not started").

**"New Exam" button** opens a create form:
- Title (text input)
- Subject (dropdown — subjects for the section's class)
- Max Marks (number input)
- Date (date input)
- Type is automatically "section-level" (teachers can only create section-level exams)
- `section_id`, `class_id`, `school_id` are set from context

**Click an exam row → marks entry page (`/teacher/results/[examId]`)**

Shows a table of all students in the active section:
- Student name
- Marks input field (number, max = exam's max marks)
- Absent checkbox

The page pre-loads any existing marks. Teacher fills in marks and saves.

**Subject gating:** If the exam has a subject, and the teacher is assigned to teach that subject in this section (via timetable), they can edit marks. If they teach a different subject, marks are read-only for that exam. This prevents the Math teacher from editing the English exam marks.

Exception: the class teacher (`class_teacher_of`) can edit all marks for their section regardless of subject. This handles the common case where the class teacher does final verification.

**Schema consideration:** The current `exam_results` table has: id, school_id, student_id, exam_id, marks_obtained, grade. It may need a `subject_id` column if exams are subject-specific. Check if the `exams` table already has a `subject_id` — if so, the subject is on the exam, not on individual results, which is correct.

### Discipline

**Current state:** Principal page shows school-wide list (fixed in this sprint). Teacher page shows records by the teacher. No create form in the UI.

**Changes:**
1. Scope the list to students in the active section: join `discipline_records` with `student_profiles` where `student_profiles.section_id = active_section`.
2. Show all discipline records for those students, regardless of who recorded them.
3. Add a "New Record" button that opens a form:
   - Student (dropdown — students in the active section)
   - Category (dropdown — enum values: behavioral, academic, attendance)
   - Severity (dropdown — enum values: verbal, written, suspension)
   - Description (textarea)
   - `recorded_by` = current user ID, `school_id` from context, `student_id` from dropdown

**Who can create:** Any teacher assigned to the section + principals + admins. The RLS policy already allows teachers and principals to write to `discipline_records` where `school_id` matches.

### Fees

**New page in teacher portal.** Currently fees only exist in the admin portal.

**Page: `/teacher/fees`**

Shows a table of all students in the active section with their fee status:
- Student name
- Fee type (from `fee_structures` for their class)
- Amount due (from `fee_structures.amount`)
- Amount paid (sum of `fee_payments.amount_paid` for this student + fee structure)
- Status: "Paid", "Pending", "Partial" (computed from amount paid vs. due)
- Action: "Record Payment" button for pending/partial

**"Record Payment" action** opens a modal or inline form:
- Amount Paid (₹) — pre-filled with remaining balance
- Payment Method — dropdown: Cash, UPI, Bank Transfer, Cheque
- Receipt Number (optional)
- Payment Date — defaults to today

On submit: inserts into `fee_payments` with `school_id`, `student_id`, `fee_structure_id`, `amount_paid`, `payment_method`, `payment_date`, `status = 'paid'` (or 'partial' if amount < due).

**What this page does NOT do:** Create or edit fee structures. That stays on the admin Fees page (`/admin/fees`).

### Feedback

**No changes to scoping.** Stays personal to the logged-in user.

**Visibility change:** Only render the "Feedback" nav item when the real user role is `teacher`. When a principal or admin is in section-scoped view, the Feedback tab is hidden from the sidebar.

**Existing bug to fix:** The current feedback page shows ALL teacher-directed feedback, not just for the logged-in teacher. Fix: filter by `to_user_id = user.id` or equivalent.

---

## Removals — Complete Inventory

### Components to delete

1. **`apps/web/components/switch-role-panel.tsx`** — the "View as Principal/Teacher" buttons. Used on admin and principal dashboards. Delete entirely.

2. **`apps/web/app/platform-admin/schools/[id]/view-as-button.tsx`** — super admin "View as" button. Delete entirely.

### API routes to delete

3. **`apps/web/app/api/context-switch/`** — POST endpoint that writes the `acting_as` cookie + audit log. Delete.
4. **`apps/web/app/api/context-exit/`** — POST endpoint that clears the `acting_as` cookie. Delete.

### Cookie references to remove

5. All reads/writes of the `acting_as` cookie in:
   - Middleware (`apps/web/middleware.ts`)
   - School layout (`apps/web/app/(school)/layout.tsx`)
   - `SwitchRolePanel` (deleted above)
   - Any other file that references `acting_as`

### Dashboard changes

6. **Admin dashboard (`apps/web/app/(school)/admin/dashboard/page.tsx`)** — remove the `<SwitchRolePanel roles={["principal", "teacher"]} />` at the bottom.
7. **Principal dashboard (`apps/web/app/(school)/principal/dashboard/page.tsx`)** — remove the `<SwitchRolePanel roles={["teacher"]} />` at the bottom.

### Banner to remove

8. The "Viewing as [Role] · Actions logged under your real identity · Exit View" banner on teacher/principal pages — remove. Replaced by the section context in the sidebar switcher.

---

## Data Flow — Complete Lifecycle

### Login Flow

```
1. User navigates to school1.lvh.me:3000
2. Middleware:
   a. Resolves school from domain → sets x-school-id header
   b. Gets auth session from Supabase
   c. Queries user_roles for (user_id, school_id) → gets role
   d. Reads active_section cookie (if any)
   e. Sets headers: x-school-id, x-user-role, x-active-section
   f. Routes based on role:
      - school_admin → /admin/dashboard
      - principal → /principal/dashboard
      - teacher → /teacher/dashboard
3. Layout renders:
   a. Reads x-user-role to determine sidebar variant
   b. Reads x-active-section:
      - If set → render teacher sidebar with section switcher showing active section
      - If not set and role is teacher → auto-select default, set cookie, redirect
      - If not set and role is principal/admin → render their role's sidebar
   c. Queries section list for the switcher (role-appropriate)
```

### Section Switch Flow

```
1. User clicks section in dropdown
2. Client-side:
   a. Sets active_section cookie = section UUID, 8-hour TTL
   b. window.location.href = '/teacher/dashboard'
3. Middleware:
   a. Reads active_section cookie → sets x-active-section header
   b. User role is principal/admin but active_section exists → allows /teacher/* access
4. Teacher layout:
   a. Reads x-active-section → passes to all child components
   b. Renders teacher sidebar with section switcher
   c. For principal/admin: shows "Back to [Role]" button
5. Dashboard page:
   a. Reads active section
   b. Queries attendance, homework, discipline scoped to that section
```

### Exit Flow (Principal/Admin only)

```
1. User clicks "Back to Principal" / "Back to Admin"
2. Client-side:
   a. Deletes active_section cookie
   b. window.location.href = '/principal/dashboard' or '/admin/dashboard'
3. Middleware:
   a. No active_section cookie → normal role routing
4. Principal/Admin layout:
   a. No active section → render role-specific sidebar
   b. Section switcher shows "Select a class/section"
```

---

## Edge Cases

### Teacher with no assignments
A newly added teacher with no `class_teacher_of` and no timetable entries. The section switcher shows: "No sections assigned. Contact your administrator." All teacher pages show a similar empty state.

### Multiple browser tabs
Teacher has Class 8A in tab 1 and switches to Class 1A in tab 2. The cookie updates to Class 1A. Tab 1 still shows Class 8A data (server-rendered). On next navigation in tab 1, it picks up Class 1A. This is acceptable — cookies are inherently per-browser, not per-tab. Not worth solving with URL params for this.

### Principal opens teacher page without section
Possible if they manually type `/teacher/dashboard` in the URL without selecting a section. The middleware allows it (principal has teacher layout access). The layout detects no active section for a non-teacher role → redirects to `/principal/dashboard`.

### Teacher is also a principal
The database allows multiple roles per user (`user_roles` unique on `user_id, school_id, role`). The middleware currently uses `.maybeSingle()` which could fail. **This needs a fix:** query all roles, pick the highest-privilege one as the "primary role" (super_admin > school_admin > principal > teacher). The section switcher for a teacher-principal shows all school sections (principal-level access).

### Session expiry
The `active_section` cookie has an 8-hour TTL. If it expires mid-session, the next page load will:
- For teachers: trigger auto-selection of default section
- For principals/admins: redirect to their own dashboard

---

## Out of Scope

- Visual timetable grid builder (future polish — current simple form is sufficient)
- Cross-section aggregate views (e.g., "show me homework across all my sections")
- Parent portal and student portal
- Timetable conflict detection (double-booking a teacher for the same period)
- Automated timetable generation
- Exam analytics / report cards
- Fee reminders / notifications
- Bulk exam creation across classes
