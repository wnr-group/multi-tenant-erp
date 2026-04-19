# Full UX Redesign — Web Portal (Admin, Teacher, Principal)

**Date:** 2026-04-19  
**Scope:** All web portal pages across school admin, teacher, and principal roles  
**Approach:** Option C — Full Product Redesign (shell + dashboards + page patterns + detail pages + polish)  
**Constraint:** No backend changes without explicit confirmation. Backend-dependent features are flagged and deferred.

---

## 1. App Shell & Chrome

### Problem
`(school)/layout.tsx` renders `<div className="min-h-screen bg-gray-50">{children}</div>`. The `Sidebar` component exists but is never mounted. Every page floats in a grey void with no navigation, no identity, no chrome.

### Solution
Replace the layout with a two-column flex shell:

```
┌─────────────────────────────────────────────────────────┐
│  Sidebar (w-60, fixed, brand-colored)                    │
│  ┌───────────────────────────────────────────────────┐  │
│  │  TopBar (h-14, white, border-b, sticky)           │  │
│  │  [Breadcrumb path]        [User avatar + role]    │  │
│  ├───────────────────────────────────────────────────┤  │
│  │  Page content (flex-1, overflow-y-auto, p-8)      │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Components

**Layout (`(school)/layout.tsx`)**
- Fetch: `schools.primary_color`, `profiles.full_name`, `user_roles.role` — single server query, no new tables
- Derive nav items from role: admin gets Teachers/Students/Classes/Subjects/Academics/Fees/Syllabus/Announcements/Settings; teacher gets Attendance/Homework/Results/Feedback; principal gets Reports/Discipline/Announcements
- Render `<Sidebar>` + right column (`flex-col flex-1 overflow-hidden`) containing `<TopBar>` + `<main>`

**TopBar (new component)**
- Left: breadcrumbs derived from `usePathname()` — e.g. `Dashboard / Teachers / Ravi Kumar`
- Right: avatar circle (initials, brand-colored bg), user full name, role badge (e.g. "School Admin")
- No data fetch — receives props from server layout

**Sidebar footer**
- Add a user section at the bottom: avatar initials + name + role
- Already has brand color support — no changes needed to sidebar logic

### Backend impact
One additional column read (`primary_color` from `schools`) — no new tables, no migrations.

---

## 2. Role-based Dashboards

Each role lands on a shared `/(school)/dashboard` route as their default home after login. The page renders different content based on `user_roles.role` fetched in the server component. The redirect after login points to `/(school)/dashboard` instead of any list page.

### 2a — Admin Dashboard (role branch: `school_admin`)

**Purpose:** Give the school admin or office staff a morning snapshot — what needs attention today.

**Layout:**
```
┌─ Stats Row (4 cards) ──────────────────────────────────────┐
│  Total Students    Total Teachers    Fees Collected*   Pending Fees*  │
│  [count]           [count]           [₹ amount]        [₹ amount]     │
└────────────────────────────────────────────────────────────┘
┌─ Quick Actions ────────────────────────────────────────────┐
│  [+ Add Student]   [+ Invite Teacher]   [+ Announcement]  │
└────────────────────────────────────────────────────────────┘
┌─ Recent Admissions (last 5) ───────────────────────────────┐
│  Name · Class · Section · Admitted on                      │
└────────────────────────────────────────────────────────────┘
```

**Stats sources:**
- Total Students: `COUNT` from `student_profiles` — existing query, no new fetch
- Total Teachers: `COUNT` from `teacher_profiles` — existing query
- Fees Collected / Pending: from `fee_payments` table — **BACKEND FLAGGED** (depends on Plan 3.5). Cards show "—" until confirmed.

**Recent Admissions:** last 5 rows from `student_profiles` ordered by `created_at desc` — no new table.

---

### 2b — Teacher Dashboard

**Purpose:** Show the teacher what they need to do today.

**Layout:**
```
┌─ Stats Row (3 cards) ──────────────────────────────────────┐
│  My Classes     Homework to Review     Attendance Status   │
│  [count]        [count pending]        [Marked / Not yet]  │
└────────────────────────────────────────────────────────────┘
┌─ Today's Tasks ────────────────────────────────────────────┐
│  ☐ Mark attendance for Class 6A                           │
│  ☐ 3 homework submissions need review                     │
└────────────────────────────────────────────────────────────┘
```

**Stats sources:**
- My Classes: count of teacher's assigned class sections — **BACKEND FLAGGED** (requires teacher-class assignment join)
- Homework to review: count of unreviewed submissions — **BACKEND FLAGGED**
- Attendance status: whether today's attendance has been marked — **BACKEND FLAGGED**

**Interim state:** Until backend is confirmed, teacher dashboard shows a welcome message with quick-action links to Attendance and Homework pages.

---

### 2c — Principal Dashboard

**Purpose:** Give the principal a school-health overview.

**Layout:**
```
┌─ Stats Row (3 cards) ──────────────────────────────────────┐
│  Today's Attendance %    Active Teachers    Active Students │
│  [%]*                    [count]            [count]         │
└────────────────────────────────────────────────────────────┘
┌─ Recent Announcements ────┐  ┌─ Recent Discipline Logs ───┐
│  Last 3 announcements     │  │  Last 3 records            │
│  Title · Date · Target    │  │  Student · Type · Date     │
└───────────────────────────┘  └────────────────────────────┘
```

**Stats sources:**
- Attendance %: requires `attendance_records` aggregate — **BACKEND FLAGGED**
- Announcements: existing query
- Discipline logs: existing `discipline_records` table

---

## 3. Page Patterns (applied to all list pages)

These patterns apply consistently to: Teachers, Students, Classes, Subjects, Academics, Announcements, Syllabus, Fees.

### 3a — Page Header with Stats Cards

Replace bare `<h1>` with a structured page header:

```
┌─ Page Header ──────────────────────────────────────────────┐
│  [Page Title]                          [+ Primary Action]  │
│  [Subtitle / description line]                             │
├────────────────────────────────────────────────────────────┤
│  [Stat Card 1]   [Stat Card 2]   [Stat Card 3]            │
└────────────────────────────────────────────────────────────┘
```

Stats per page (all computed from already-fetched data, zero extra queries):
- **Teachers:** Total Teachers · Subjects Covered · Classes with Teachers
- **Students:** Total Students · Classes · Sections
- **Classes:** Total Classes · Total Sections
- **Subjects:** Total Subjects · Classes Covered
- **Academics:** Academic Years · Current Year · Exams Scheduled
- **Announcements:** Total Sent · This Month
- **Syllabus:** Files Uploaded · Classes Covered · Academic Years

### 3b — Forms Move to Modal Dialogs

All inline add forms are removed from the page body and placed inside shadcn `Dialog` components, triggered by the "+ Add" / "+ Invite" button in the page header.

Pages affected: Teachers, Students, Classes (x2: class + section), Subjects, Academics (x2: academic year + exam), Announcements, Syllabus.

The dialog contains the existing form component unchanged — only the trigger and wrapper change. Frontend only.

### 3c — Search + Filter Toolbar

A toolbar sits between the page header and the table:

```
┌─ Table Toolbar ────────────────────────────────────────────┐
│  🔍  Search by name...              [Filter: Class ▾]      │
└────────────────────────────────────────────────────────────┘
```

- Search: client-side `useState` filter on already-loaded data
- Filters where applicable:
  - Students → Class, Section
  - Subjects → Class
  - Syllabus → Academic Year, Class
  - Announcements → Target Type
- Frontend only — no new queries

### 3d — Row Action Menu

Every table row gets a final column with a `DropdownMenu`:

```
│  Ravi Kumar   ravi@school.com   [⋯]  │
                                    ↓
                        [ View Profile ]
                        [ Edit         ]
                        [ ─────────── ]
                        [ Remove       ]  ← destructive, red
```

- **View** → navigate to detail page (`/admin/teachers/[id]`) — frontend only (routing)
- **Edit** → menu item renders now; clicking opens the Dialog form pre-filled (server action to persist — **BACKEND FLAGGED**)
- **Remove** → menu item renders now; clicking opens confirmation dialog — the delete server action is **BACKEND FLAGGED**
- The `DropdownMenu` UI shell is implemented in this plan on all tables; the server action wiring for Edit and Remove is excluded until backend items are confirmed

### 3e — Empty States

Replace `emptyMessage` plain text with a structured empty state component:

```
           [Lucide icon, muted, h-12 w-12]
         No teachers yet
    Invite your first teacher to get started.
              [+ Invite Teacher]
```

`EmptyState` component: `icon`, `title`, `description`, `action` (optional button). Frontend only.

---

## 4. Detail Pages

### 4a — Teacher Detail (`/admin/teachers/[id]`)

```
┌─ Profile Header ───────────────────────────────────────────┐
│  [Avatar — initials, brand-colored]  Full Name             │
│                                      email · Joined date   │
│                                      [Edit]  [Remove]      │
├────────────────────────────────────────────────────────────┤
│  ┌─ Assigned Classes ──┐  ┌─ Subjects Taught ─────────────┐│
│  │  Class 6A           │  │  Mathematics                  ││
│  │  Class 7B           │  │  Science                      ││
│  └─────────────────────┘  └───────────────────────────────┘│
└────────────────────────────────────────────────────────────┘
```

- Profile header: from `profiles` join — existing data, no new query
- Assigned Classes + Subjects: requires `teacher_class_assignments` join — **BACKEND FLAGGED**
- Interim: profile header card renders immediately; classes/subjects section shows "—" until backend confirmed

### 4b — Student Detail (`/admin/students/[id]`)

```
┌─ Profile Header ───────────────────────────────────────────┐
│  [Avatar]  Full Name              Roll No: 42              │
│            Class 6 · Section A    Adm No: S2025-001        │
│            [Edit]                                          │
├────────────────────────────────────────────────────────────┤
│  ┌─ Fee Status ──────────┐  ┌─ Attendance Summary ────────┐│
│  │  ₹12,000 paid          │  │  Present: 18  Absent: 2    ││
│  │  ₹3,000 pending  ⚠️   │  │  Attendance %: 90%         ││
│  └───────────────────────┘  └────────────────────────────┘│
└────────────────────────────────────────────────────────────┘
```

- Profile header: existing `student_profiles` + `profiles` data — no new query
- Fee status: `fee_payments` table — **BACKEND FLAGGED** (Plan 3.5)
- Attendance summary: `attendance_records` — **BACKEND FLAGGED**
- Interim: profile card renders; fee and attendance panels show placeholder state

---

## 5. Feedback & Polish

### Toasts
Wrap every server action response with a toast notification:
- Success: green, "Teacher invited successfully", auto-dismiss 4s
- Error: red, "Something went wrong — please try again"
- Use Sonner (already commonly paired with shadcn) or shadcn's `useToast`
- Frontend only

### Loading Skeletons
Every page gets a `loading.tsx` file (Next.js convention) that renders skeleton cards and table rows using shadcn `Skeleton` component, mirroring the real page layout. Frontend only.

### Confirmation Dialogs
Any destructive action (Remove teacher, Delete class, Delete announcement, Remove student) renders a confirmation `AlertDialog` before executing:

```
┌─────────────────────────────────────┐
│  Remove Ravi Kumar?                 │
│  This action cannot be undone.      │
│                                     │
│  [Cancel]              [Remove] 🔴  │
└─────────────────────────────────────┘
```

Frontend only — wraps the server action call.

### Breadcrumbs
`TopBar` derives breadcrumb segments from `usePathname()`. Segments are title-cased automatically (e.g. `teachers` → "Teachers"). For dynamic segments (e.g. `/teachers/[id]`), the breadcrumb shows "Detail" as a static label — full name resolution (e.g. "Ravi Kumar") is a future enhancement once detail pages are built. Frontend only.

### Sidebar User Footer
Add a user identity section at the bottom of the sidebar:
```
│  ─────────────────────────── │
│  [DS]  Dinesh Sharma         │
│        School Admin          │
└──────────────────────────────┘
```
Avatar: 2-letter initials, brand-colored background. Frontend only.

---

## Backend Items Requiring Confirmation

| Feature | What's needed | Depends on |
|---|---|---|
| Fee stats cards (admin dashboard) | `fee_payments` table | Plan 3.5 |
| Student fee status (detail page) | `fee_payments` join | Plan 3.5 |
| Student attendance summary (detail) | `attendance_records` aggregate | Existing table |
| Teacher assigned classes/subjects | `teacher_class_assignments` join | Schema confirmation |
| Teacher dashboard stats | Teacher-class join + homework + attendance | Multiple |
| Principal attendance % | `attendance_records` aggregate | Existing table |
| Row edit actions | Server actions per entity | Per-page |
| Row delete actions | Server actions per entity | Per-page |

All backend items are **excluded from the implementation plan** until confirmed individually.

---

## Implementation Phases

**Phase 1 — Foundation (frontend only)**
1. App shell: update `(school)/layout.tsx`, build `TopBar` component
2. Role-based nav items derived from session role
3. Sidebar user footer

**Phase 2 — Dashboards (frontend, with placeholders for backend items)**
4. Admin dashboard page with student/teacher counts + quick actions + recent admissions
5. Teacher dashboard (welcome + quick actions — full stats deferred)
6. Principal dashboard with announcement + discipline panels

**Phase 3 — Page Pattern Upgrades (frontend only)**
7. Page header + stats cards on all 8 admin pages
8. Forms → Dialog modals on all 8 pages
9. Search + filter toolbar on all 8 pages
10. Row action menus on all tables
11. Empty state component + wire up on all pages

**Phase 4 — Detail Pages (frontend, with placeholders)**
12. Teacher detail page (profile card)
13. Student detail page (profile card)

**Phase 5 — Polish (frontend only)**
14. Toast notifications on all form submissions
15. `loading.tsx` skeletons for all pages
16. Confirmation dialogs for all destructive actions
17. Breadcrumb logic in TopBar
