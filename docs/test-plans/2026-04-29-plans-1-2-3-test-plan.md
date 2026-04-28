# Test Plan: Plans 1–3 (Timetable, Section Switcher, Section-Scoped Pages)

**Date:** 2026-04-29
**Branch:** `feature/dashboard-backend-seed`
**Prereq:** `supabase db reset` then `cd apps/web && pnpm dev --port 3000`
**Base URL:** `http://school1.lvh.me:3000`

---

## Test Accounts

| Role | Email | Password | Name | Homeroom |
|------|-------|----------|------|----------|
| School Admin | `schooladmin@demo.com` | `Admin@1234` | Arjun Sharma | — |
| Principal | `principal@demo.com` | `Admin@1234` | Dr. Meena Iyer | — |
| Teacher 1 | `teacher1@demo.com` | `Admin@1234` | Ravi Kumar | Class 8A |
| Teacher 2 | `teacher2@demo.com` | `Admin@1234` | Priya Nair | Class 1A |

## Seed Data Reference

- 12 classes (Class 1–12), 2 sections each (A, B) = 24 sections
- 43 students per A section, 42 per B section (~1,020 total)
- 5 teachers, each teaching 3 sections (via timetable), each homeroom of 1 section
- 125 timetable slots (5 teachers × 3 sections × 5 days × varying periods)
- 12 discipline records (seeded)
- 6,120 fee payments (seeded)
- 7,140 attendance records (seeded)
- 0 homework, 0 exams (must be created during testing)
- 5 subjects per class: Mathematics, English, Science, Social Studies, Hindi

---

## Plan 1: Timetable Management

### TC-1.1: Admin nav shows Timetable

1. Login as `schooladmin@demo.com` / `Admin@1234`
2. **Verify:** sidebar has 13 items: Dashboard, Teachers, Students, Classes, Subjects, **Timetable**, Academics, Fees, Syllabus, Announcements, Discipline, Reports, Settings
3. Click **Timetable**
4. **Verify:** URL is `/admin/timetable`
5. **Verify:** page heading "Timetable" with subtext "Assign teachers to class sections, subjects, and periods."

### TC-1.2: Timetable table shows seeded data

1. On `/admin/timetable`
2. **Verify:** "Current Assignments" table has 125 rows
3. **Verify:** columns are Teacher, Class, Section, Subject, Day, Period
4. **Verify:** first visible rows show Monday entries across multiple teachers
5. Use the "All Teachers" filter dropdown → select "Ravi Kumar"
6. **Verify:** only Ravi Kumar's rows are shown (~25 rows)
7. **Verify:** his entries span Class 8 A (P1, P2), Class 8 B (P3, P4), Class 7 A (P5) across Mon–Fri
8. Clear the filter
9. Type "Science" in the search box
10. **Verify:** only rows where Subject = "Science" are shown (Suresh Babu's entries)

### TC-1.3: Create a timetable entry

1. On `/admin/timetable`, fill the "Assign Teacher" form:
   - Teacher: **Ravi Kumar**
   - Class: **Class 8**
   - Section: **A** (should appear after Class is picked)
   - Subject: **Mathematics** (should appear after Class is picked)
   - Day: **Saturday**
   - Period: **Period 1**
2. Click **Assign**
3. **Verify:** toast "Timetable slot added." (or similar success message)
4. **Verify:** table now shows the new "Ravi Kumar | Class 8 | A | Mathematics | Saturday | P1" row
5. Scroll to find it (or search "Saturday")

### TC-1.4: Bulk assign with "Apply to all weekdays"

1. Fill the form:
   - Teacher: **Priya Nair**
   - Class: **Class 1**
   - Section: **A**
   - Subject: **English**
   - Period: **Period 7**
2. Check **"Apply to all weekdays (Mon–Fri)"**
3. **Verify:** Day dropdown is disabled
4. Click **Assign**
5. **Verify:** toast indicates 5 slots assigned
6. **Verify:** table now has 5 new rows for Priya Nair, Class 1, A, English, P7 on Mon–Fri

### TC-1.5: Conflict detection

1. Try to assign the exact same slot as TC-1.3:
   - Teacher: **Ravi Kumar**, Class: **Class 8**, Section: **A**, Subject: **Mathematics**, Day: **Saturday**, Period: **Period 1**
2. Click **Assign**
3. **Verify:** error toast about conflict/duplicate ("one or more slots are already assigned" or similar)
4. **Verify:** no new row added

### TC-1.6: Delete a timetable entry

1. Find the Saturday P1 row created in TC-1.3
2. Click the **trash icon** on that row
3. **Verify:** confirm dialog appears
4. Confirm
5. **Verify:** toast "Entry removed." (or similar)
6. **Verify:** the row disappears from the table

### TC-1.7: Cascading dropdowns

1. Select Class: **Class 3**
2. **Verify:** Section dropdown enables and shows "A", "B"
3. **Verify:** Subject dropdown enables and shows Mathematics, English, Science, Social Studies, Hindi
4. Change Class to **Class 10**
5. **Verify:** Section and Subject dropdowns reset and show options for Class 10
6. **Verify:** previously selected Section/Subject are cleared

---

## Plan 2: Section Switcher + Nav Architecture

### TC-2.1: Admin — section switcher visible with all sections

1. Login as `schooladmin@demo.com` / `Admin@1234`
2. **Verify:** URL is `/admin/dashboard`
3. **Verify:** section switcher dropdown at top of sidebar shows "Select section…"
4. Click the dropdown
5. **Verify:** 24 options grouped by class (Class 1 – Section A, Class 1 – Section B, ... Class 12 – Section B)
6. **Verify:** no "← Back to Admin" button visible (no section selected yet)

### TC-2.2: Admin — select section → nav swaps to teacher view

1. Select **"Class 8 – Section A"** from the section switcher
2. **Verify:** page redirects to `/teacher/dashboard`
3. **Verify:** sidebar nav shows: Dashboard, Attendance, Homework, Results, Discipline, Fees
4. **Verify:** sidebar does **NOT** show "Feedback" (admin viewing as teacher)
5. **Verify:** "← Back to Admin" button appears above the nav
6. **Verify:** section switcher shows "Class 8 – Section A" selected
7. **Verify:** user identity still shows "Arjun Sharma · School Admin"

### TC-2.3: Admin — "Back to Admin" exits section view

1. From the teacher view (TC-2.2), click **"← Back to Admin"**
2. **Verify:** redirects to `/admin/dashboard`
3. **Verify:** sidebar nav returns to full admin nav (13 items)
4. **Verify:** section switcher resets to "Select section…"
5. **Verify:** no "← Back" button visible

### TC-2.4: Principal — section switcher and nav swap

1. Logout, login as `principal@demo.com` / `Admin@1234`
2. **Verify:** URL is `/principal/dashboard`
3. **Verify:** sidebar shows Dashboard, Announcements, Discipline, Reports
4. **Verify:** section switcher shows all 24 sections
5. Select **"Class 1 – Section A"**
6. **Verify:** redirects to `/teacher/dashboard`
7. **Verify:** "← Back to Principal" button appears (not "Back to Admin")
8. Click back
9. **Verify:** returns to `/principal/dashboard`

### TC-2.5: Teacher — sees only assigned sections

1. Logout, login as `teacher1@demo.com` / `Admin@1234` (Ravi Kumar)
2. **Verify:** URL is `/teacher/dashboard`
3. **Verify:** section switcher shows exactly 3 sections:
   - Class 7 – Section A (from timetable)
   - Class 8 – Section A (homeroom + timetable)
   - Class 8 – Section B (from timetable)
4. **Verify:** no "← Back to" button (teachers don't have another dashboard)
5. **Verify:** sidebar shows Feedback (teachers get Feedback; admins/principals don't)

### TC-2.6: Teacher — switch between sections

1. As Ravi Kumar, current section should be visible in switcher
2. Switch to **"Class 7 – Section A"**
3. **Verify:** page reloads to `/teacher/dashboard`
4. **Verify:** dashboard heading changes to "Class 7 – Section A"
5. Switch back to **"Class 8 – Section A"**
6. **Verify:** heading shows "Class 8 – Section A"

### TC-2.7: Route protection — non-teacher without section can't access /teacher

1. Login as `principal@demo.com` / `Admin@1234`
2. Manually navigate to `http://school1.lvh.me:3000/teacher/dashboard` (without selecting a section)
3. **Verify:** redirects to `/principal/dashboard`

### TC-2.8: Route protection — teacher can't access /admin

1. Login as `teacher1@demo.com` / `Admin@1234`
2. Manually navigate to `http://school1.lvh.me:3000/admin/dashboard`
3. **Verify:** redirects to `/teacher/dashboard`

---

## Plan 3: Section-Scoped Teacher Portal Pages

> **Setup for all Plan 3 tests:** Login as `schooladmin@demo.com` / `Admin@1234`, select **"Class 8 – Section A"** from the section switcher. This puts you in the teacher view for Class 8A with 43 students.

### TC-3.1: Dashboard — section header and stats

1. On `/teacher/dashboard` with Class 8A selected
2. **Verify:** heading is "Class 8 – Section A"
3. **Verify:** subtext shows "Class Teacher: Ravi Kumar" and "43 students"
4. **Verify:** "Today's Attendance" card is visible with a "Mark Attendance" button
5. **Verify:** "7-Day Attendance Trend" chart is visible with bar chart
6. **Verify:** "Upcoming Homework" card shows "No upcoming homework." (no homework seeded)
7. **Verify:** "Recent Discipline Incidents" card shows incidents or "No recent incidents."

### TC-3.2: Attendance — view today's status

1. Click **Attendance** in the sidebar
2. **Verify:** URL is `/teacher/attendance`
3. **Verify:** heading "Attendance" with "Class 8 – Section A" and today's date
4. **Verify:** either "Attendance not yet marked" empty state OR a table of 43 students with status badges
5. **Verify:** "Mark Attendance" or "Edit Attendance" button is visible

### TC-3.3: Attendance — mark attendance for Class 8A

1. Click **"Mark Attendance"** button
2. **Verify:** URL is `/teacher/attendance/mark?sectionId=...&date=...`
3. **Verify:** page shows 43 students (Student 8A-1 through Student 8A-43) with radio buttons or status selectors
4. Mark the first 3 students as **Present**
5. Mark the 4th student as **Absent**
6. Mark the 5th student as **Late** (if the option exists)
7. Click **Save** (or submit button)
8. **Verify:** toast confirms attendance saved
9. **Verify:** redirects back to attendance page
10. **Verify:** table now shows the 5 marked students with correct color-coded status badges (green=present, red=absent, amber=late)

### TC-3.4: Attendance — edit existing attendance

1. From the attendance page, click **"Edit Attendance"**
2. **Verify:** mark page loads with previously saved statuses pre-filled
3. Change the 4th student from Absent to **Present**
4. Save
5. **Verify:** attendance page now shows the updated status

### TC-3.5: Dashboard — attendance reflects after marking

1. Go back to **Dashboard**
2. **Verify:** "Today's Attendance" card now shows actual numbers (e.g., "4/43 present" or whatever was marked)
3. **Verify:** "Mark Attendance" button now says "Edit Attendance"

### TC-3.6: Homework — empty state with section scope

1. Click **Homework** in the sidebar
2. **Verify:** URL is `/teacher/homework`
3. **Verify:** homework list is empty (no homework seeded)
4. **Verify:** create form is visible with Class and Section pre-filled for Class 8A

### TC-3.7: Homework — create homework for Class 8A

1. In the create homework form:
   - **Verify:** Class dropdown is pre-set to "Class 8"
   - **Verify:** Section dropdown is pre-set to "A" (or the active section)
   - Select Subject: **Mathematics**
   - Title: **"Chapter 5 Exercises"**
   - Description: **"Complete exercises 5.1 to 5.5 from textbook"**
   - Due Date: **pick a date 3 days from today**
2. Click **Create** (or submit button)
3. **Verify:** toast confirms homework created
4. **Verify:** the new homework appears in the table: "Chapter 5 Exercises | Mathematics | Class 8 | A | [due date]"

### TC-3.8: Homework — create a second homework and verify list

1. Create another homework:
   - Subject: **Science**
   - Title: **"Lab Report: Photosynthesis"**
   - Description: **"Submit lab report for the photosynthesis experiment"**
   - Due Date: **5 days from today**
2. Submit
3. **Verify:** both homework items appear in the table
4. **Verify:** ordered by due date (descending or ascending — check which)

### TC-3.9: Dashboard — homework reflects after creation

1. Go back to **Dashboard**
2. **Verify:** "Upcoming Homework" card now shows the 2 homework items created
3. **Verify:** each shows title, subject, and due date

### TC-3.10: Discipline — view and create incident

1. Click **Discipline** in the sidebar
2. **Verify:** URL is `/teacher/discipline`
3. **Verify:** heading "Discipline"
4. **Verify:** "New Discipline Record" form is visible with Student, Category, Severity, Description fields
5. **Verify:** Student dropdown lists all 43 students from Class 8A (Student 8A-1, Student 8A-10, ...)
6. Fill the form:
   - Student: **Student 8A-1**
   - Category: **Behavioral**
   - Severity: **Verbal Warning**
   - Description: **"Disrupted class during mathematics lecture"**
7. Click **Record Incident**
8. **Verify:** toast "Discipline record created."
9. **Verify:** table below updates to show the new record with columns: Student, Category, Severity, Description, Date

### TC-3.11: Discipline — create a second incident

1. Fill the form:
   - Student: **Student 8A-10**
   - Category: **Academic**
   - Severity: **Written Warning**
   - Description: **"Failed to submit three consecutive homework assignments"**
2. Submit
3. **Verify:** table now shows 2 discipline records, most recent first

### TC-3.12: Dashboard — discipline reflects after creation

1. Go back to **Dashboard**
2. **Verify:** "Recent Discipline Incidents" card now shows the 2 incidents created
3. **Verify:** each shows student name, category, severity, and date

### TC-3.13: Fees — view fee status for Class 8A

1. Click **Fees** in the sidebar
2. **Verify:** URL is `/teacher/fees`
3. **Verify:** heading "Fees" with "Class 8 – Section A"
4. **Verify:** table shows 43 rows (one per student) with columns: Student, Fee Type, Due, Paid, Status, Action
5. **Verify:** Fee Type is "Tuition" and Due is "₹5,000" for each student
6. **Verify:** most students show "paid" status (green badge) since fee payments are seeded
7. **Verify:** any "pending" or "partial" students have a "Record Payment" link

### TC-3.14: Fees — record a payment

1. Find a student with status "pending" or "partial" (if all are paid, skip this test)
2. Click **"Record Payment"**
3. **Verify:** inline payment form appears with:
   - Student name
   - Amount pre-filled with remaining balance
   - Method dropdown (Cash, UPI, Bank Transfer, Cheque)
   - Receipt # (optional)
4. Select Method: **Cash**
5. Click **Record Payment**
6. **Verify:** toast "Payment of ₹[amount] recorded for [student name]."
7. **Verify:** the student's status updates to "paid" and "Record Payment" link disappears
8. Click **Cancel** on another payment form to verify cancel works

### TC-3.15: Results — view exam list (empty state)

1. Click **Results** in the sidebar
2. **Verify:** URL is `/teacher/results`
3. **Verify:** heading "Results"
4. **Verify:** exam table shows "No exams found." (no exams seeded)

### TC-3.16: Feedback — scoped to school

1. Switch back to teacher view if needed
2. As admin in section view, Feedback is **not** in the nav (correct — only real teachers see it)
3. Logout, login as `teacher1@demo.com` / `Admin@1234`
4. **Verify:** Feedback appears in the sidebar
5. Click **Feedback**
6. **Verify:** page loads without error
7. **Verify:** shows feedback addressed to teachers for this school (may be empty)

### TC-3.17: Section switch — verify scoping updates

1. As `teacher1@demo.com`, switch from **Class 8 – Section A** to **Class 7 – Section A**
2. **Verify:** dashboard heading changes to "Class 7 – Section A"
3. **Verify:** student count changes (42 students for Class 7A vs 43 for Class 8A)
4. Click **Attendance**
5. **Verify:** attendance shows Class 7A students (Student 7A-1, etc.)
6. Click **Homework**
7. **Verify:** homework list is empty (homework created earlier was for Class 8A)
8. Click **Discipline**
9. **Verify:** discipline table is empty or shows only Class 7A incidents
10. Click **Fees**
11. **Verify:** fee table shows Class 7 students with Class 7's fee structure

### TC-3.18: No section selected — prompt shown

1. Login as `schooladmin@demo.com` / `Admin@1234`
2. **Do not** select any section — stay on admin dashboard
3. Manually navigate to `http://school1.lvh.me:3000/teacher/dashboard`
4. **Verify:** redirects to `/admin/dashboard` (middleware protection)
5. Now select a section, go to teacher dashboard, then clear the `active_section` cookie manually (DevTools → Application → Cookies → delete `active_section`)
6. Refresh the page
7. **Verify:** either redirects to admin dashboard OR shows "No section selected" prompt

---

## Edge Cases

### TC-E.1: Rapid section switching

1. As admin with a section selected, quickly switch sections 3 times
2. **Verify:** final page loads correctly with the last selected section's data
3. **Verify:** no stale data from previous sections

### TC-E.2: Timetable conflict on bulk assign

1. On `/admin/timetable`, try to bulk-assign (all weekdays) for a slot that already exists on some days
2. **Verify:** error toast about conflict
3. **Verify:** no partial insertion (none of the 5 days should be inserted)

### TC-E.3: Empty section

1. As admin, select a section that has no seed data (e.g., Class 12 – Section A)
2. Go to dashboard → **Verify:** shows 0 students, empty states for all cards
3. Go to attendance → **Verify:** "Attendance not yet marked" empty state
4. Go to homework → **Verify:** empty homework list
5. Go to discipline → **Verify:** empty discipline table
6. Go to fees → **Verify:** empty fees table or "No fee records"

---

## Post-Test Cleanup

After all tests, run `supabase db reset` to restore the database to its seed state. This removes any test data created during the test run.
