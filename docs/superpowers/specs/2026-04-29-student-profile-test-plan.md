# Student Profile Feature — Manual Test Plan

**Date:** 2026-04-29  
**Feature:** Student photo, parent phone, attendance history, academics, fees tabs — admin + teacher views  
**Base URL:** `http://school1.lvh.me:3000`

---

## Prerequisites

1. Dev server running: `cd apps/web && npm run dev`
2. Browser open at `http://school1.lvh.me:3000`
3. Have two browser tabs ready (one for admin, one for teacher)

---

## Section A — Admin: Add Student with Parent Phone

**Login:** `schooladmin@demo.com` / `Admin@1234`

| # | Step | Expected |
|---|------|----------|
| A1 | Go to `/admin/students` → click "Add Student" | Drawer/modal opens |
| A2 | Observe the form fields | See "Parent Phone *" and "Admission Number" fields present |
| A3 | Submit the form with all fields blank | Form blocks — Full Name and Parent Phone are required |
| A4 | Fill in: Full Name = "Test Student", Parent Phone = "+91 98765 43210", select any class | Submit succeeds, toast "Student added." appears |
| A5 | Find "Test Student" in the table | Student appears with correct name |

---

## Section B — Admin: Student Detail Page

**Login:** `schooladmin@demo.com` / `Admin@1234`

Navigate to `/admin/students` → find any student → dropdown → "View Profile"

| # | Step | Expected |
|---|------|----------|
| B1 | Open any student's profile | Page loads with student name, class/section, roll number |
| B2 | Observe the avatar area | Shows initials (e.g. "AS") in emerald circle |
| B3 | Hover over the avatar | Camera icon overlay appears |
| B4 | Click the avatar | File picker opens |
| B5 | Select any image file (JPG/PNG) | Image uploads, avatar updates immediately, toast "Photo updated." |
| B6 | Refresh the page | Photo persists (stored in Supabase Storage) |
| B7 | Try uploading a non-image file (e.g. .pdf) | Toast error "Please select an image file." |
| B8 | Observe Edit Profile section | Pre-filled with student's current name, email, roll, class, section, parent phone |
| B9 | Change the student's name → "Save Changes" | Toast "Student profile updated." appears |
| B10 | Change class to a different class | Section dropdown resets and loads new class's sections |
| B11 | Select a new section → Save | Saves successfully; refresh shows updated class/section |

---

## Section C — Admin: Attendance Tab

**Continue from Section B (same student detail page)**

| # | Step | Expected |
|---|------|----------|
| C1 | Click "Attendance" tab | Tab becomes active (indigo underline), calendar view appears |
| C2 | Observe the stat cards | 4 cards visible: Attendance %, Present, Absent, Late |
| C3 | Observe the calendar | 7-column grid, day labels Su Mo Tu We Th Fr Sa, correct month/year shown |
| C4 | Cells with attendance data | Emerald = present, rose = absent, amber = late, grey = no record |
| C5 | Click "←" (prev month) | URL updates `?tab=attendance&month=X&year=Y`, previous month calendar loads |
| C6 | Click "→" (next month) | Next month calendar loads |
| C7 | Legend visible | Shows 4 color swatches with labels |

---

## Section D — Admin: Academics Tab

**Continue from Section B (same student detail page)**

| # | Step | Expected |
|---|------|----------|
| D1 | Click "Academics" tab | Tab becomes active |
| D2 | If student has exam results | Results shown grouped by exam name with exam date, total score badge |
| D3 | Score ≥ 60% | Badge is emerald "XX/YY · ZZ%" |
| D4 | Score < 60% | Badge is rose |
| D5 | Per exam: subject table | Columns: Subject, Marks (obtained/max), Grade |
| D6 | Student with no results | Shows "No exam results recorded yet." message |

---

## Section E — Admin: Fees Tab

**Continue from Section B (same student detail page)**

| # | Step | Expected |
|---|------|----------|
| E1 | Click "Fees" tab | Tab becomes active |
| E2 | Summary cards visible | 3 cards: Total Due, Paid, Outstanding (amounts in ₹) |
| E3 | Table visible | Columns: Fee Type, Due (₹), Paid (₹), Concession (₹), Status, Action |
| E4 | Row with pending/partial status | "Record Payment" button visible in Action column |
| E5 | Row with paid status | No "Record Payment" button shown |
| E6 | Click "Record Payment" on a pending row | Inline payment form appears above the table |
| E7 | Fill in an amount → submit | Payment recorded, toast confirms, table updates |
| E8 | Close the payment form (onClose) | Form hides, table shows updated amounts |
| E9 | Student with no fee structures | Table shows "No fee structures assigned to this student's class." |

---

## Section F — Teacher: Students Nav Item

**Login:** `teacher1@demo.com` / `Admin@1234` (Class 8A)

| # | Step | Expected |
|---|------|----------|
| F1 | Log in as teacher1 | Teacher sidebar visible |
| F2 | Observe sidebar | "Students" nav item present (after Dashboard) |
| F3 | Click "Students" | Navigates to `/teacher/students` |

---

## Section G — Teacher: Section-Scoped Student List

**Continue from Section F**

| # | Step | Expected |
|---|------|----------|
| G1 | Observe page heading | "Students" heading, subtitle shows "Class 8 – Section A · N students" |
| G2 | Observe table columns | Student (avatar+name), Roll No., Admission No., Parent Phone, (View Profile link) |
| G3 | Students shown are only from 8A | No students from other sections/classes |
| G4 | Students with photos | Avatar shows photo thumbnail, not initials |
| G5 | Students without photos | Avatar shows initials |
| G6 | Parent phone column | Shows "+91 ..." if stored, "—" if empty |
| G7 | Click "View Profile" on any student | Navigates to `/teacher/students/{id}` |

---

## Section H — Teacher: Student Detail Page

**Continue from Section G (after clicking View Profile)**

| # | Step | Expected |
|---|------|----------|
| H1 | Page loads | Student name, class/section, roll number in header |
| H2 | "Back to Students" button | Present, links back to `/teacher/students` |
| H3 | Avatar click | File picker opens — teacher can upload photo |
| H4 | Upload a photo | Photo updates, toast "Photo updated." |
| H5 | Edit Profile form | Pre-filled, same fields as admin view |
| H6 | Change parent phone → Save | Saves, toast confirms |
| H7 | Attendance tab | Same calendar + stats as admin view |
| H8 | Academics tab | Same results table as admin view |
| H9 | Fees tab | Same fee table + Record Payment as admin view |

---

## Section I — Teacher with No Section (Edge Case)

**Login:** `teacher2@demo.com` / `Admin@1234` — then manually clear their active section in the UI (or use a teacher account with no timetable assignment if available)

| # | Step | Expected |
|---|------|----------|
| I1 | Navigate to `/teacher/students` | "No section selected" prompt shown (NoSectionPrompt component) |
| I2 | Prompt has action to select section | Clicking it lets teacher pick a section |

---

## Section J — Cross-Role Data Isolation

| # | Step | Expected |
|---|------|----------|
| J1 | Log in as `teacher1@demo.com` (Class 8A), view students list | Only Class 8A students visible |
| J2 | Log in as `teacher3@demo.com` (Class 3B), view students list | Only Class 3B students visible — no Class 8A students |
| J3 | Try accessing `/teacher/students/{id}` for a student NOT in teacher's section | Page should either show the student (RLS still returns it since student_profiles allows school-wide teacher read) OR redirect — note the actual behaviour |

---

## Section K — Photo Upload Edge Cases

| # | Step | Expected |
|---|------|----------|
| K1 | Upload a file > 5 MB | Toast error "Image must be under 5 MB." |
| K2 | Upload a .pdf file | Toast error "Please select an image file." |
| K3 | Upload the same student's photo twice | Upsert works, second upload replaces the first (no duplicate error) |
| K4 | While upload is in progress | Spinner visible on avatar; does NOT disappear before upload finishes |

---

## Pass Criteria

All items in Sections A–H must pass. Sections I–K are secondary. Log any failures with the section + step number and the actual vs. expected behaviour.
