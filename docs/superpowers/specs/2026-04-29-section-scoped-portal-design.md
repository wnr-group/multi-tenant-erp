# Section-Scoped Portal Design Spec

> **Goal:** Replace the broken role-switching mechanism with a global section switcher that lets teachers, principals, and admins view and manage any class/section from a unified teacher portal. Add timetable management so teachers can be assigned to sections.

---

## Core Concept

One teacher portal. One section switcher. The only difference between roles is **which sections appear in the switcher**:

| Role | Sections available | Default on login |
|------|-------------------|-----------------|
| Teacher | Sections from `class_teacher_of` + `timetable` entries | Auto-select `class_teacher_of` section |
| Principal | All school sections | No default — "Select a class/section" prompt |
| School Admin | All school sections | No default — "Select a class/section" prompt |

When a principal or admin selects a section, the sidebar swaps to the teacher portal nav. An "Exit" button returns them to their own dashboard.

---

## Navigation Architecture

### Admin Sidebar (no section selected)

Dashboard, Teachers, Students, Classes, Subjects, Timetable (NEW), Academics, Fees, Syllabus, Announcements, Discipline (MOVED from principal), Reports (MOVED from principal), Settings

At the top of the sidebar: section switcher (grouped dropdown, all sections).

### Principal Sidebar (no section selected)

Dashboard (school-wide stats), Announcements, Discipline, Reports

At the top of the sidebar: section switcher (grouped dropdown, all sections).

### Teacher Sidebar / Section-Scoped View (section selected)

Dashboard, Attendance, Homework, Results, Discipline, Fees, Feedback (teachers only — hidden for principal/admin)

At the top of the sidebar: section switcher showing current selection. For principal/admin: "Back to [Principal/Admin]" button above the switcher.

### Removed

- All "View as Principal/Teacher" buttons (`SwitchRolePanel` component)
- The `acting_as` cookie mechanism for role switching
- The `/api/context-switch` and `/api/context-exit` endpoints
- The `ViewAsButton` component from platform admin

---

## Section Switcher Component

### Placement
Sidebar header area, below school name, above nav links. Always visible.

### Display
Grouped dropdown. Sections organized under class headers:

```
┌─────────────────────────┐
│ Class 8 – Section A   ▾ │
├─────────────────────────┤
│ Class 1                 │
│   A                     │
│   B                     │
│ Class 2                 │
│   A                     │
│   B                     │
│ ...                     │
│ Class 12                │
│   A                     │
│   B                     │
└─────────────────────────┘
```

### Data source
Server component queries at layout level:
- **Teacher**: `teacher_profiles.class_teacher_of` (homeroom) UNION `timetable` entries (teaching assignments) → deduplicated section list
- **Principal/Admin**: all sections for the school, ordered by class order then section name

### Persistence
Cookie: `active_section=<section_uuid>`, 8-hour TTL, same domain pattern as existing cookies. Cleared on logout or "Exit" back to principal/admin.

Middleware reads the cookie and passes it as `x-active-section` header to server components, same pattern as `x-school-id`.

---

## Section-Scoped Dashboard

When a section is selected, the dashboard answers: **"How is this section doing right now?"**

### Section Header
"Class 8 – Section A · Ravi Kumar (Class Teacher) · 43 students"

### Widgets

1. **Today's Attendance** — big number: "38/43 present". "Mark Attendance" button if not yet marked today. This is the #1 daily action.
2. **Attendance Trend (7 days)** — bar/line chart for the selected section's last 7 school days.
3. **Pending Homework** — list of recent homework for this section with title, due date. Not a donut — actionable list.
4. **Recent Discipline** — last 2-3 incidents for students in this section.

### Dropped from current dashboard
- Timetable schedule (personal to teacher, not about the section — only show for real teachers, as a collapsible top bar or separate "My Schedule" link)
- "My Sections" stat card (redundant with switcher)
- Homework donut chart (replaced with actionable list)

---

## Timetable Management (Admin — NEW)

### Location
New nav item "Timetable" in admin sidebar.

### UI
Simple assignment form + filterable table. Not a visual grid builder.

**Form fields:**
- Teacher (dropdown — all teachers in school)
- Class (dropdown — cascading)
- Section (dropdown — cascading from class)
- Subject (dropdown — subjects for the selected class)
- Day of Week (Mon–Sat)
- Period Number (1–8)

"Assign" button creates one timetable entry.

**Bulk shortcut:** Checkbox "Apply to all weekdays (Mon–Fri)" creates 5 entries at once for the same teacher/section/subject/period.

**Table below:**
Filterable by teacher, class, or day. Shows all current assignments. Each row has a delete action.

### Schema
Existing `timetable` table: id, school_id, teacher_id, section_id, subject_id, day_of_week (1=Mon..7=Sun), period. No schema changes needed.

### Seed data
Add timetable entries to `seed.sql` for all 5 demo teachers with realistic assignments (e.g., Ravi Kumar teaches Math to Class 8A and 8B, Priya Nair teaches English to Class 1A and 1B, etc.).

---

## Teacher Portal Pages (Section-Scoped)

All pages read the selected section from the `active_section` cookie (via middleware header). If no section is selected, show a "Select a class/section to get started" prompt.

### Attendance
**Already mostly works.** Changes:
- Remove the section picker from the page (global switcher handles it)
- Pre-populate with the selected section + today's date
- "Mark Attendance" navigates directly to the mark page for the active section
- Fix existing bugs (already committed): school_id, marked_by, student full_name

### Homework
**Changes:**
- List shows homework for the selected section only (filter by section_id)
- Create form pre-selects the class and section from the global context
- Subject dropdown scoped to the class (already works)
- Teacher can create homework for their selected section

### Results / Exams
**Currently broken — needs significant rework.**

Two exam types:
- **Section-level exam** — teacher creates for their selected section. Only that section's students take it.
- **Class-level exam** — admin creates from the admin Academics page. All sections of that class take it. Teachers enter marks for their section's students.

Teacher Results page shows:
- Exams relevant to the selected section's class (both section-level and class-level)
- "New Exam" button for section-level exams
- Click an exam → marks entry page scoped to the section's students
- Subject-aware: teacher enters marks for their subject only (based on timetable assignment)

### Discipline
**Changes:**
- Scope list to students in the selected section
- Add "New Record" button/form
- Form fields: student (dropdown — section's students), category, severity, description
- Any teacher or principal with the section selected can create records

### Fees
**New in teacher portal.**
- Read-only list of fee status for the selected section's students
- Each row: student name, fee type, amount due, amount paid, status (paid/pending/partial)
- "Record Payment" action per student — opens inline form or modal
- Fields: amount paid, payment method (cash/UPI/bank/cheque), receipt number
- Creating fee structures stays admin-only (not in teacher portal)

### Feedback
- **Not section-scoped.** Personal to the logged-in user.
- Only visible for real teachers, hidden when principal/admin is in section view.
- Shows feedback where the logged-in teacher is the recipient.

---

## Role-Specific Dashboards (No Section Selected)

These are the dashboards users see before picking a section.

### Admin Dashboard
Stays as-is: school-wide stats (students, teachers, classes, fee collected), fee chart, attendance donut, students by class, announcements.

### Principal Dashboard
Stays as-is: school-wide stats (present/absent today, total students, discipline this month), weekly attendance trend, attendance by class, discipline incidents chart, announcements.

These dashboards are the "bird's eye view." The section switcher is the entry point to drill down.

---

## Changes to Remove

1. `SwitchRolePanel` component — delete
2. `acting_as` cookie — remove from middleware, layouts, all references
3. `/api/context-switch` endpoint — delete
4. `/api/context-exit` endpoint — delete
5. `ViewAsButton` from platform admin — delete
6. The `acting_as` banner ("Viewing as Teacher") on teacher pages — replaced by section context header

---

## Data Flow Summary

```
User logs in
  → Middleware resolves role from user_roles table
  → Middleware reads active_section cookie
  → Sets x-school-id, x-active-section, x-user-role headers
  → Routes to correct role prefix (/admin, /principal, /teacher)

Section switcher change
  → Sets active_section cookie
  → Hard navigation to /teacher/dashboard
  → Middleware sees active_section cookie → allows access to /teacher/* for principal/admin roles
  → Layout reads active_section → renders teacher nav with "Back to [role]" button

"Exit" button (principal/admin only)
  → Clears active_section cookie
  → Navigates back to /principal/dashboard or /admin/dashboard
```

---

## Out of Scope

- Visual timetable grid builder (future polish)
- Cross-section aggregate views (e.g., "show me homework across all my sections")
- Parent portal
- Student portal
- Timetable conflict detection (double-booking a teacher)
- Automated timetable generation
