# Principal & Teacher Dashboard Charts — Design Spec

**Date:** 2026-04-22
**Status:** Approved
**Scope:** Add visual charts with mock data to principal and teacher dashboards for client demo. Follows the same pattern established in the school admin dashboard (recharts, client chart components, mock data labeled for later backend wiring).

---

## Reference

Follows the pattern in:
- `apps/web/app/(school)/admin/dashboard/` — server component + co-located client chart files
- `docs/superpowers/specs/2026-04-22-admin-dashboard-charts-design.md`

---

## Principal Dashboard

### Layout

**Row 1 — Stat Cards (4 cards, equal grid)**

| Card | Mock Value | Icon | Color |
|------|-----------|------|-------|
| Present Today | 847 | UserCheck | emerald |
| Absent Today | 193 | UserX | rose |
| Total Students | 1,040 | GraduationCap | indigo |
| Discipline (this month) | 12 | ShieldAlert | amber |

> Note: Present Today, Absent Today, and Total Students already have real Supabase queries — keep them. Add Discipline as mock only.

**Row 2 — (2/3 + 1/3 split)**

- **Left: Weekly Attendance Trend — Line Chart**
  - X-axis: Last 7 days (Mon–Sun)
  - Y-axis: % present (0–100)
  - Single line, emerald color
  - Shows attendance trend across the week

- **Right: Class-wise Attendance — Bar Chart**
  - X-axis: Class 1 through Class 12
  - Y-axis: % attendance
  - Single bar per class, indigo color
  - Horizontal reference line at 75% (minimum threshold)

**Row 3 — (1/2 + 1/2 split)**

- **Left: Discipline Incidents by Month — Bar Chart**
  - X-axis: Last 6 months
  - Y-axis: Incident count
  - Single bar, amber color

- **Right: Recent Announcements — List**
  - Last 5 announcements (same pattern as admin dashboard)
  - Static mock data

---

## Teacher Dashboard

### Layout

**Header (unchanged)**
- "Good morning, [name]!" greeting
- "Today is [day]. Here are your periods for the day."

**Row 1 — Stat Cards (3 cards)**

| Card | Mock Value | Icon | Color |
|------|-----------|------|-------|
| Periods Today | 4 | Clock | indigo |
| My Sections | 3 | BookOpen | violet |
| My Students | 127 | GraduationCap | emerald |

**Today's Schedule (unchanged)**
- Existing period card list — keep as-is

**Row 2 — (2/3 + 1/3 split)**

- **Left: Section-wise Attendance Rate — Bar Chart**
  - X-axis: Section names (e.g. "8A", "9B", "10C")
  - Y-axis: % attendance
  - Single bar, indigo color
  - Horizontal reference line at 75%

- **Right: Homework Submitted vs Pending — Donut Chart**
  - Two segments: Submitted (green) / Pending (rose)
  - Centre label: submitted % 
  - Legend below

---

## Technical Approach

### Architecture (same as admin)
- `page.tsx` stays a **server component**
- Chart files are **"use client"** components co-located in the dashboard folder
- Mock data defined as typed constants at top of `page.tsx`, labeled with backend wiring comments

### New Files

**Principal:**
```
apps/web/app/(school)/principal/dashboard/
├── page.tsx                              ← modify: add 4th stat, layout rows, mock data
├── weekly-attendance-chart.tsx           ← create: line chart
├── class-attendance-chart.tsx            ← create: bar chart
└── discipline-chart.tsx                  ← create: bar chart
```

**Teacher:**
```
apps/web/app/(school)/teacher/dashboard/
├── page.tsx                              ← modify: add stat cards, layout rows, mock data
├── section-attendance-chart.tsx          ← create: bar chart
└── homework-chart.tsx                    ← create: donut chart
```

### Shared Component Opportunity
`WeeklyAttendanceChart` and `SectionAttendanceChart` are both bar/line charts with a 75% reference line. They are kept separate (different data shapes, different colors) since they serve different roles and will be wired to different queries.

### Mock Data Shapes

**Principal — WeeklyAttendanceChart**
```ts
type DayAttendance = { day: string; percent: number }
// e.g. [{ day: "Mon", percent: 84 }, ...]
```

**Principal — ClassAttendanceChart**
```ts
type ClassAttendance = { class: string; percent: number }
// e.g. [{ class: "Cls 1", percent: 88 }, ...]
```

**Principal — DisciplineChart**
```ts
type DisciplineMonth = { month: string; incidents: number }
// e.g. [{ month: "Nov", incidents: 8 }, ...]
```

**Teacher — SectionAttendanceChart**
```ts
type SectionAttendance = { section: string; percent: number }
// e.g. [{ section: "8A", percent: 91 }, ...]
```

**Teacher — HomeworkChart**
```ts
type HomeworkData = { submitted: number; pending: number }
// e.g. { submitted: 78, pending: 22 }
```

---

## Backend Wiring (deferred)

### Principal

| Chart | Table | Query |
|-------|-------|-------|
| Weekly Attendance Trend | `attendance_records` | Group by `date`, count present/total per day for last 7 days, school_id filter |
| Class-wise Attendance | `attendance_records` JOIN `student_profiles` JOIN `sections` JOIN `classes` | Group by class, attendance % for current term |
| Discipline by Month | `discipline_records` | Group by `date_trunc('month', occurred_at)`, count per month, last 6 months |
| Discipline stat card | `discipline_records` | Count where `date >= start of current month`, school_id filter |

### Teacher

| Chart | Table | Query |
|-------|-------|-------|
| Section Attendance | `attendance_records` JOIN `sections` | Filter by sections where teacher has timetable slots, group by section_id |
| Homework donut | `homework` table (if exists) or mock only | Count submitted vs pending for teacher's sections |
| Periods Today stat | `timetable` | Count where `teacher_id = user.id AND day_of_week = today` |
| My Sections stat | `timetable` | Count distinct `section_id` where `teacher_id = user.id` |
| My Students stat | `student_profiles` JOIN `sections` | Count students in teacher's sections |

---

## Notes

- The `homework` table may not exist yet — HomeworkChart stays mock-only until it's built
- The 75% reference line on attendance charts is a `<ReferenceLine>` from recharts (`y={75}`)
- Principal's existing 3 stat cards (Present Today, Absent Today, Total Students) keep their real Supabase queries; only the 4th card (Discipline) is mock
- Teacher's Today's Schedule keeps its real timetable query unchanged
