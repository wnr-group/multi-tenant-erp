# Testing Plan: 6 Features (2026-05-14)

> **For agentic workers:** Use this plan to verify all 6 features implemented in commits `444a396` through `20d19b6`. Start the dev server, then test each feature in order. Use Chrome DevTools MCP or manual browser testing.

**Goal:** Verify all 6 features work correctly in the browser — golden path + edge cases.

**Prerequisites:**
- Dev server running: `cd apps/web && pnpm dev`
- Supabase local running: `supabase start` (or connected to remote)
- Login as school_admin (has access to all features)
- Have at least 1 school with students, teachers, classes, sections, exams, and exam results seeded

**Dev URL:** `http://admin.lvh.me:3000` (or your configured subdomain)

---

## Feature 1: Discipline — Roll Number Column

**Pages to test:**
- `/admin/discipline`
- `/principal/discipline`
- `/teacher/discipline` (requires active section)

### Tests

- [ ] **1.1** Navigate to admin discipline page → "Roll No." column appears after "Student", before "Class / Section"
- [ ] **1.2** Roll numbers display correctly for students that have them
- [ ] **1.3** Students without roll numbers show "—"
- [ ] **1.4** Navigate to principal discipline page → "Roll No." column appears after Student link, before Category
- [ ] **1.5** Navigate to teacher discipline page (select a section first) → "Roll No." column appears after Student, before Category
- [ ] **1.6** Log a new discipline incident via teacher form → new row shows correct roll number

---

## Feature 2: Unified Management Feedback Inbox

**Pages to test:**
- `/admin/feedback`
- `/principal/feedback`

### Tests

- [ ] **2.1** Navigate to admin feedback → page title is "Feedback" (not "Feedback — Management")
- [ ] **2.2** Admin feedback shows ALL management feedback (both `to_role=school_admin` AND `to_role=principal`)
- [ ] **2.3** Navigate to principal feedback → shows the SAME items as admin feedback
- [ ] **2.4** Respond to a feedback item as admin → response saves correctly
- [ ] **2.5** Respond to a feedback item as principal → response saves correctly
- [ ] **2.6** If no feedback exists, both pages show "No feedback received yet." empty state

---

## Feature 3: Global Search + Top Bar Redesign

**Pages to test:**
- Any page (top bar is global)

### Tests

- [ ] **3.1** Top bar shows: breadcrumbs (left), search button with "⌘K" hint, bell icon, user avatar (right)
- [ ] **3.2** Click the search button → spotlight modal opens with input focused
- [ ] **3.3** Press `Cmd+K` (or `Ctrl+K`) → spotlight modal opens
- [ ] **3.4** Press `Escape` → modal closes
- [ ] **3.5** Click the dark overlay behind modal → modal closes
- [ ] **3.6** Type 1 character → shows "Type at least 2 characters to search..."
- [ ] **3.7** Type a student name (2+ chars) → shows matching students with class/section detail
- [ ] **3.8** Type a roll number → shows matching students
- [ ] **3.9** Type a teacher name → shows matching teachers with "Teacher" label
- [ ] **3.10** No matches → shows "No results found."
- [ ] **3.11** Use arrow keys to navigate results → active item highlighted
- [ ] **3.12** Press Enter on a student result → navigates to `/admin/students/{id}` (or role-appropriate path)
- [ ] **3.13** Press Enter on a teacher result → navigates to `/admin/teachers/{id}`
- [ ] **3.14** Click a result → navigates correctly
- [ ] **3.15** Bell icon is visible (placeholder, no action needed yet)
- [ ] **3.16** User name/role hidden on small screens (`sm:block`)
- [ ] **3.17** Test as principal → search results navigate to `/principal/students/{id}`
- [ ] **3.18** Test as teacher → search results navigate to `/teacher/students/{id}`

---

## Feature 4: Enterprise UI Improvements

**Pages to test:**
- `/admin/dashboard`
- `/admin/students`
- `/admin/discipline`
- `/principal/discipline`
- `/teacher/discipline`

### Tests

- [ ] **4.1** DataTable has subtle shadow (`shadow-sm`) and alternating row tinting (every other row slightly shaded)
- [ ] **4.2** Table header is compact (h-10) with uppercase tracking-wider labels
- [ ] **4.3** Table cells have consistent padding (px-4 py-3)
- [ ] **4.4** FilterableDataTable search bar is constrained width (max-w-sm), not full-width
- [ ] **4.5** Filter dropdown height matches search input (h-9)
- [ ] **4.6** Admin dashboard stat cards: smaller padding (p-4), smaller icon (h-10 w-10), value is text-xl, label is uppercase text-[11px] with tracking
- [ ] **4.7** Stat cards have permanent subtle shadow, no hover-translate animation
- [ ] **4.8** Discipline pages use `text-foreground` (not `text-gray-900`) and have subtitle descriptions
- [ ] **4.9** Principal discipline subtitle: "All discipline incidents across the school."
- [ ] **4.10** Teacher discipline subtitle: "Discipline records for your section."

---

## Feature 5: Bulk Upload/Download Students

**Pages to test:**
- `/admin/students`

### Tests

- [ ] **5.1** "Bulk Actions" dropdown button appears next to "Add Student" button
- [ ] **5.2** Click "Bulk Actions" → dropdown shows 3 options: Download Students, Download Template, Upload CSV
- [ ] **5.3** Click outside dropdown → closes
- [ ] **5.4** Click "Download Template" → downloads `students_template.csv` with headers: `full_name,email,roll_number,admission_number,class_name,section_name,parent_phone`
- [ ] **5.5** Click "Download Students" → downloads `students.csv` with current student data (all rows, quoted values)
- [ ] **5.6** Open downloaded CSV → verify data matches what's shown in the table
- [ ] **5.7** Upload a CSV with NEW students (no admission_number match) → shows "X created"
- [ ] **5.8** Page refreshes and new students appear in the list
- [ ] **5.9** Upload a CSV with EXISTING admission_numbers and changed data (e.g., different roll_number) → shows "X updated"
- [ ] **5.10** Verify the updated student data reflects the CSV changes
- [ ] **5.11** Upload CSV with a row missing `full_name` → shows error count
- [ ] **5.12** Upload CSV with invalid class_name → student created but with null class_id (no error)
- [ ] **5.13** During upload, button shows "Importing..." and is disabled
- [ ] **5.14** After import, result popup shows created/updated/errors counts with dismiss button
- [ ] **5.15** Non-admin roles should NOT see the bulk actions button (test as teacher/principal — they don't have the students page with this component)

---

## Feature 6: Report Card

**Pages to test:**
- `/admin/report-cards`
- `/admin/report-cards/[studentId]?examId=[examId]`

### Prerequisites for this test:
- At least 1 exam exists
- At least 1 student has exam results (marks entered by teacher)
- Attendance records exist for at least 1 student

### Tests

- [ ] **6.1** "Report Cards" appears in admin sidebar (with FileText icon) after "Reports"
- [ ] **6.2** Navigate to `/admin/report-cards` → shows page header with title, description, student count
- [ ] **6.3** Exam selector dropdown shows available exams (most recent first)
- [ ] **6.4** Student table is searchable by name and roll number
- [ ] **6.5** Class filter dropdown works
- [ ] **6.6** Each student row has a "View" button linking to their report card
- [ ] **6.7** Click "View" → navigates to report card page with examId in URL
- [ ] **6.8** Report card shows: school name (colored), exam name, academic year
- [ ] **6.9** Student info grid: name, roll number, class–section, admission number
- [ ] **6.10** Subject table: Subject, Marks, Max, %, Grade columns
- [ ] **6.11** Total row at bottom with overall marks/percentage/grade
- [ ] **6.12** Summary cards: Percentage, Grade (with label), Attendance %
- [ ] **6.13** Grade calculation is correct (91+ = A+, 81+ = A, 71+ = B+, etc.)
- [ ] **6.14** Attendance percentage reflects actual attendance records for that student
- [ ] **6.15** If no attendance records exist → attendance card doesn't show
- [ ] **6.16** If no exam results for student → shows "No exam results found for this student."
- [ ] **6.17** "Back to Report Cards" link navigates back to the list
- [ ] **6.18** Click "Download PDF" → new window opens with styled report card and print dialog
- [ ] **6.19** PDF layout: school header with color, info grid, marks table, summary cards
- [ ] **6.20** Print/save as PDF → clean single-page output

---

## Regression Checks

After all feature tests pass, verify these existing features still work:

- [ ] **R.1** Admin dashboard loads without errors (charts, stats, announcements)
- [ ] **R.2** Admin students list → search works, class filter works, click "View Profile" works
- [ ] **R.3** Teacher results page → can enter marks for an exam
- [ ] **R.4** Teacher feedback page → still shows only feedback addressed to that teacher
- [ ] **R.5** Section switcher → admin/principal can switch to teacher view and back
- [ ] **R.6** Sidebar navigation highlights active page correctly
- [ ] **R.7** Logout works from sidebar

---

## Bug Template

If a test fails, log it as:

```
**Test:** [test ID, e.g., 3.7]
**Expected:** [what should happen]
**Actual:** [what happened]
**Steps to reproduce:** [exact clicks/actions]
**Screenshot:** [if applicable]
**Console errors:** [if any]
```
