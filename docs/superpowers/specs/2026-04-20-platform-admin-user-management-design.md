# Platform Admin — School Management & User CRUD + Bulk Import

**Date:** 2026-04-20
**Scope:** Platform admin school detail page: simplified school creation, user CRUD, CSV bulk import
**Constraint:** super_admin auth required for all operations

---

## 1. Simplified "New School" Form

**Change:** Remove admin invite fields from `/platform-admin/schools/new/page.tsx`. Form becomes 4 fields only:
- School Name (required)
- Web Domain (required)
- Primary Color (hex)
- School Contact Email

On submit: insert into `schools` table, redirect to `/platform-admin/schools/[id]` (the detail page where admin can be invited).

Button label changes from "Create School & Invite Admin" to "Create School".

---

## 2. School Detail Page — Tabbed Layout

**Route:** `/platform-admin/schools/[id]`

Replace current flat layout with a tabbed interface using URL-based tabs (query param `?tab=overview|users|import`).

### 2a. Overview Tab (default)

- **Editable school info card:** Name, Domain, Primary Color (with preview), Contact Email. "Save Changes" button calls `PATCH /api/schools/[id]`.
- **School stats row:** Total Users, Admins, Teachers, Students — counts from `user_roles` for this school.
- **Toggle Active button** (existing component, keep as-is)
- **View-As dropdown** (existing component, keep as-is)

### 2b. Users Tab

- **"+ Invite User" button** → opens dialog with:
  - Full Name (required)
  - Email (required)
  - Role dropdown: school_admin, principal, teacher, student, parent (required)
- On submit: calls `POST /api/schools/[id]/users` which uses the existing invite-user logic (Supabase `admin.inviteUserByEmail` + create profile + create user_role).

- **User table:** columns — Name, Email, Role, Status (badge: Active/Inactive), Actions
- **Row actions:**
  - **Edit Role** → dialog with role dropdown pre-filled. Calls `PATCH /api/schools/[id]/users/[roleId]`.
  - **Deactivate** → confirmation dialog. Sets `user_roles.is_active = false`. User keeps their auth account but loses access.
  - **Activate** → sets `user_roles.is_active = true` (shown only for inactive users).
  - **Remove** → confirmation dialog. Deletes `user_roles` row. Does NOT delete auth user (they may belong to other schools).

### 2c. Bulk Import Tab

- **Role selector:** dropdown to pick import role (student / teacher / parent)
- **"Download Template" button:** generates CSV with columns based on selected role:
  - Student: `full_name, email, roll_number, class, section`
  - Teacher: `full_name, email`
  - Parent: `full_name, email, student_email` (links parent to student)
- **File upload:** drag-and-drop zone or file picker. Accepts `.csv` only.
- **Client-side parsing:** parse CSV in browser using a lightweight parser. No file upload to server.
- **Preview table:** shows parsed rows with per-row validation:
  - Green check: valid row
  - Red X: invalid (missing required field, invalid email format, duplicate email, class/section not found)
  - For students: resolve `class` and `section` names to IDs by fetching school's classes/sections
- **"Import X Users" button:** sends validated rows as JSON to `POST /api/schools/[id]/import`.
- **Progress + results:** show progress bar during import, then summary: "X imported, Y skipped (errors)". List errors with row number + reason.

---

## 3. API Routes

### `PATCH /api/schools/[id]/route.ts`
- Auth: super_admin required
- Body: `{ name?, domain?, primary_color?, contact_email? }`
- Action: update `schools` row
- Returns: updated school

### `POST /api/schools/[id]/users/route.ts`
- Auth: super_admin required
- Body: `{ email, fullName, role }`
- Action: reuse existing invite-user logic — `admin.inviteUserByEmail()` + insert `user_roles` + update `profiles`
- For student role: also insert `student_profiles`
- For teacher role: also insert `teacher_profiles`
- Returns: `{ userId }` or error

### `PATCH /api/schools/[id]/users/[roleId]/route.ts`
- Auth: super_admin required
- Body: `{ role?, is_active? }`
- Action: update `user_roles` row
- Returns: updated role

### `DELETE /api/schools/[id]/users/[roleId]/route.ts`
- Auth: super_admin required
- Action: delete `user_roles` row. Does NOT delete auth user or profile (user may belong to other schools).
- Returns: `{ ok: true }`

### `POST /api/schools/[id]/import/route.ts`
- Auth: super_admin required
- Body: `{ role, rows: Array<{ full_name, email, roll_number?, class_name?, section_name? }> }`
- Action: for each row:
  1. `admin.inviteUserByEmail()` — create auth user
  2. Update `profiles` — set full_name, school_id
  3. Insert `user_roles` — set role, school_id
  4. If student: resolve class_name + section_name to IDs, insert `student_profiles`
  5. If teacher: insert `teacher_profiles`
  6. If parent: look up student by email, insert parent link (if parent_profiles table exists; otherwise skip)
- Returns: `{ results: Array<{ row: number, status: "ok" | "error", error?: string }> }`
- Processing is sequential per row (not parallel) to avoid race conditions.

---

## 4. Schema

No new tables. All operations use existing tables:
- `schools` — CRUD
- `user_roles` — role assignments (id, user_id, school_id, role, is_active)
- `profiles` — user profiles (id, full_name, email, school_id)
- `student_profiles` — student-specific data (school_id, class_id, section_id, roll_number)
- `teacher_profiles` — teacher-specific data (school_id)

Class/section name resolution for student import: query `classes` and `sections` tables for the school, match by name.

---

## 5. Files to Create/Modify

### New files
- `apps/web/app/api/schools/[id]/route.ts` — school PATCH
- `apps/web/app/api/schools/[id]/users/route.ts` — invite user POST
- `apps/web/app/api/schools/[id]/users/[roleId]/route.ts` — edit/delete user role
- `apps/web/app/api/schools/[id]/import/route.ts` — bulk import
- `apps/web/app/platform-admin/schools/[id]/school-tabs.tsx` — client component for tab navigation
- `apps/web/app/platform-admin/schools/[id]/overview-tab.tsx` — editable school info
- `apps/web/app/platform-admin/schools/[id]/users-tab.tsx` — user list + actions
- `apps/web/app/platform-admin/schools/[id]/invite-user-dialog.tsx` — invite form dialog
- `apps/web/app/platform-admin/schools/[id]/edit-role-dialog.tsx` — edit role dialog
- `apps/web/app/platform-admin/schools/[id]/import-tab.tsx` — bulk import UI
- `apps/web/lib/csv-parser.ts` — lightweight CSV parsing utility (client-side)

### Modified files
- `apps/web/app/platform-admin/schools/new/page.tsx` — remove admin invite fields
- `apps/web/app/platform-admin/schools/[id]/page.tsx` — replace with tabbed layout
