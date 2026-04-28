# Dashboard Backend + Seed Data Design

**Date:** 2026-04-29
**Scope:** Replace all mock constants in admin/principal/teacher dashboard pages with real Supabase queries, backed by a comprehensive seed dataset for Demo School.

---

## Goal

All three role dashboards (school admin, principal, teacher) show live data from the database. No mock consts remain in any dashboard page. `supabase db reset` gives a fully functional demo environment.

---

## Section 1 — Seed Data

### Auth Users (6 total, password: `Admin@1234`)

| Email | Role | UUID |
|-------|------|------|
| `admin@wnr.com` | super_admin | `aaaaaaaa-0000-0000-0000-000000000010` |
| `schooladmin@demo.com` | school_admin | `aaaaaaaa-0000-0000-0000-000000000011` |
| `principal@demo.com` | principal | `aaaaaaaa-0000-0000-0000-000000000012` |
| `teacher1@demo.com` | teacher | `aaaaaaaa-0000-0000-0000-000000000013` |
| `teacher2@demo.com` | teacher | `aaaaaaaa-0000-0000-0000-000000000014` |
| `teacher3@demo.com` | teacher | `aaaaaaaa-0000-0000-0000-000000000015` |
| `teacher4@demo.com` | teacher | `aaaaaaaa-0000-0000-0000-000000000016` |
| `teacher5@demo.com` | teacher | `aaaaaaaa-0000-0000-0000-000000000017` |

All inserted into `auth.users` directly (local Supabase supports this). The `handle_new_user` trigger auto-creates `profiles` rows.

### School Structure

- **12 classes** (Class 1–12), each with **2 sections** (A, B) = 24 sections total
- **~85 students per class** (~1,020 total), split ~43/42 across sections A/B
- Students are data-only records in `student_profiles` (no auth accounts), generated via `generate_series`
- Admission numbers: `ADM-0001` to `ADM-1020`

### Teacher Section Assignments (class_teacher_of)

| Teacher | Class Teacher Of |
|---------|-----------------|
| teacher1 | Class 8 Section A |
| teacher2 | Class 1 Section A |
| teacher3 | Class 3 Section B |
| teacher4 | Class 5 Section A |
| teacher5 | Class 7 Section B |

Each teacher is class teacher of exactly one section (for attendance purposes). Timetable entries are separate and optional.

### Fee Structures (tiered by class, per academic year 2026-27)

| Classes | Monthly Fee |
|---------|------------|
| 1–4 | ₹3,000 |
| 5–8 | ₹5,000 |
| 9–12 | ₹7,500 |

Fee type: `"Tuition"`. One fee_structure row per class.

### Fee Payments

- 6 months: Nov 2025, Dec 2025, Jan 2026, Feb 2026, Mar 2026, Apr 2026
- ~90% of students paid per month (status: `paid`), ~10% pending (status: `pending`, amount_paid: 0)
- `payment_date` set to 5th of each month for paid records
- This gives a realistic collected vs due bar chart with a small gap each month

### Attendance Records

- **Last 7 school days (Mon–Fri only)** relative to seed run date
- ~85% present rate with slight per-class variation (±5%)
- One record per student per day (`UNIQUE(student_id, date)` enforced)
- `marked_by` = schooladmin UUID (`aaaaaaaa-0000-0000-0000-000000000011`)
- `status`: `present` or `absent` only (no late/half_day for seed simplicity)

### Announcements (5 records)

| Title | Type | Date |
|-------|------|------|
| Annual Sports Day | Event | 2026-04-18 |
| Mid-Term Exam Schedule Released | Exam | 2026-04-10 |
| Summer Vacation Notice | Holiday | 2026-04-05 |
| Parent-Teacher Meeting | General | 2026-03-28 |
| Science Exhibition | Event | 2026-03-20 |

`created_by` = schooladmin UUID. `target_type` = `school`.

### Discipline Records

~2 incidents per month for Nov 2025–Apr 2026 = 12 records total. Mixed categories (`behavioral`, `academic`) and severities (`verbal`, `written`). `recorded_by` = schooladmin UUID.

---

## Section 2 — Query Design

### Attendance Model Clarification

`attendance_records` has `UNIQUE(student_id, date)` — **one record per student per day**, not per period. The class teacher marks morning roll call for their section. Timetable is for scheduling periods only and has no role in attendance authority.

- `teacher_profiles.class_teacher_of` = the section a teacher is responsible for marking attendance
- Teacher dashboard attendance queries use `class_teacher_of`, not timetable joins

### Admin Dashboard (`admin/dashboard/page.tsx`)

| Data Point | Query |
|-----------|-------|
| Student count | Already real — keep |
| Teacher count | Already real — keep |
| Class count | `SELECT count(*) FROM classes WHERE school_id = ?` |
| Fee collected (stat) | `SELECT sum(amount_paid) FROM fee_payments JOIN fee_structures ON ... WHERE school_id = ? AND academic_year_id = current_year` |
| Fee chart (6 months) | Per month: collected = sum(amount_paid) WHERE payment_date in month; due = sum(fee_structures.amount × students_in_class) per month — computed in JS from two queries: payments grouped by month + fee structure totals |
| Attendance donut | Today: count present / (present + absent) for school → percent |
| Students by class | JOIN student_profiles + classes, GROUP BY class name, count — ordered by class order |
| Announcements | Top 5 by `created_at DESC` for school |

### Principal Dashboard (`principal/dashboard/page.tsx`)

| Data Point | Query |
|-----------|-------|
| Present today | Already real — keep |
| Absent today | Already real — keep |
| Total students | Already real — keep |
| Discipline this month | `count(*) FROM discipline_records WHERE school_id = ? AND created_at >= start of current month` |
| Weekly attendance trend | For last 7 school days (Mon–Fri): per-day present/(present+absent) % — skip days with 0 records |
| Attendance by class | Per class: present/(present+absent) % over last 30 days, ordered by class order |
| Discipline by month | GROUP BY month(created_at), count(*) — last 6 months |
| Announcements | Top 5 by `created_at DESC` for school |

### Teacher Dashboard (`teacher/dashboard/page.tsx`)

| Data Point | Query |
|-----------|-------|
| Periods today | Already real — keep |
| My sections | Read `teacher_profiles.class_teacher_of` — if non-null, value is 1; else 0 |
| My students | `count(*) FROM student_profiles WHERE section_id = teacher_profile.class_teacher_of` |
| Section attendance | For teacher's `class_teacher_of` section: present/(present+absent) % over last 7 school days |
| Homework | count homework WHERE created_by = teacher: submitted vs total assigned → % submitted |

---

## Section 3 — Edge Cases & Error Handling

### Empty data
- All queries use `?? 0` or `?? []` fallbacks — dashboards never crash on a fresh/empty school
- Fee chart: months with no payments show ₹0 collected (bar present, not missing)
- Attendance donut: if no records today, show 0% — does not divide by zero
- Weekly attendance trend: skip days with 0 total records (no misleading 0% dips for non-school days)

### Seed idempotency
- All auth users and the school use fixed UUIDs — `supabase db reset` is safe to re-run
- Students use deterministic admission numbers (`ADM-0001` to `ADM-1020`)
- Seed is append-only after reset — no conditional inserts needed

### Academic year scoping
- All queries filter by `school_id` — no cross-school data leakage
- Fee queries additionally scope to `academic_year_id` where `is_current = true`

### Teacher with no class_teacher_of
- If `class_teacher_of` is NULL, `mySections = 0`, `myStudents = 0`, `sectionAttendance = []` — stat cards show 0, chart shows empty state gracefully

---

## Out of Scope

- Homework table queries for teacher dashboard (homework submission tracking is a future feature — stat card shows 0 until implemented)
- Razorpay / real payment flow (ERP-46)
- Per-section timetable seeding (teacher timetable slots are seeded separately or via UI)
