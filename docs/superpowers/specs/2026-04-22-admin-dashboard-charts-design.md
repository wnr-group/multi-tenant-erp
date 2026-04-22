# Admin Dashboard Charts — Design Spec

**Date:** 2026-04-22
**Status:** Approved
**Scope:** Admin dashboard visual enhancement for client demo, with mock data. Real backend wiring deferred.

---

## Goal

Replace the minimal 2-card admin dashboard with a rich, chart-heavy overview screen that showcases the platform's data depth to prospective clients. All data is mock/hardcoded for the demo; see the **Backend Wiring** section for what each chart needs when real data is connected.

---

## Layout

Three rows of content below the "School Overview" heading:

### Row 1 — Stat Cards (4 cards, equal grid)

| Card | Value (mock) | Icon | Color |
|------|-------------|------|-------|
| Students | 1,240 | GraduationCap | emerald |
| Teachers | 48 | Users | indigo |
| Classes | 12 | BookOpen | violet |
| Fee Collected (this month) | ₹3,84,000 | IndianRupee | amber |

### Row 2 — Charts (2/3 + 1/3 split)

**Left: Monthly Fee Collection — Bar Chart**
- X-axis: Last 6 months (e.g., Nov → Apr)
- Y-axis: Amount in ₹ (thousands)
- Two bars per month: Collected vs Due
- Mock values: realistic variation, ~60–90% collection rate each month

**Right: Attendance Rate — Donut Chart**
- Single ring showing Present % vs Absent %
- Mock value: 84% present
- Centre label: "84% Present"
- Legend: Present (green) / Absent (red-orange)

### Row 3 — Charts (1/2 + 1/2 split)

**Left: Students by Class — Bar Chart**
- X-axis: Class 1 through Class 12 (or fewer if realistic)
- Y-axis: Student count
- Single bar per class, indigo color
- Mock values: 80–120 students per class

**Right: Recent Announcements — List**
- Last 5 announcements with title, date, badge (type: General / Exam / Holiday)
- Static mock data (no chart library needed)

---

## Technical Approach

### Chart Library
**shadcn/ui Chart component** (wrapper around Recharts).

Install: `recharts` as a dependency in `apps/web`.

shadcn chart components needed:
- `chart` (base wrapper + `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, `ChartLegend`)
- `BarChart`, `Bar`, `XAxis`, `YAxis` from recharts
- `PieChart`, `Pie`, `Cell` from recharts

### File Structure

```
apps/web/app/(school)/admin/dashboard/
├── page.tsx                          ← server component, passes mock data to client charts
├── fee-collection-chart.tsx          ← "use client" bar chart
├── attendance-chart.tsx              ← "use client" donut chart
└── students-by-class-chart.tsx       ← "use client" bar chart
```

The `page.tsx` remains a server component. Chart files are client components (required by Recharts).

### Mock Data Shape

Each chart component accepts a typed `data` prop. The shapes are documented here so they can be swapped for real Supabase queries later without changing the component interface.

**FeeCollectionChart**
```ts
type FeeMonth = {
  month: string;       // "Nov", "Dec", etc.
  collected: number;   // amount in ₹
  due: number;         // total billed amount in ₹
}
```

**AttendanceChart**
```ts
type AttendanceData = {
  present: number;   // percentage 0–100
  absent: number;    // percentage 0–100
}
```

**StudentsByClassChart**
```ts
type ClassCount = {
  class: string;    // "Class 1", "Class 2", etc.
  students: number;
}
```

---

## Backend Wiring (deferred — for real data later)

When mock data is replaced with live Supabase queries, each data shape maps to:

### Stat Cards
| Card | Table | Query |
|------|-------|-------|
| Students | `student_profiles` | `count` where `school_id = X` |
| Teachers | `teacher_profiles` | `count` where `school_id = X` |
| Classes | `sections` | `count distinct class_id` where `school_id = X` |
| Fee Collected | `fee_payments` | `sum(amount_paid)` where `school_id = X` and `paid_at >= start of current month` |

### Fee Collection Chart
- Table: `fee_payments`
- Group by: `date_trunc('month', paid_at)`
- `collected` = `sum(amount_paid)` per month
- `due` = join with `fee_structures` to get total billed per month
- Filter: last 6 months, current `school_id`

### Attendance Chart
- Table: `attendance_records` (or equivalent)
- `present` = count where `status = 'present'` / total records × 100
- Scope: current academic term, current `school_id`
- Note: attendance table schema needs confirmation — current implementation uses `section_id`-based records

### Students by Class Chart
- Table: `student_profiles` joined with `sections` joined with `classes`
- Group by: `classes.name` or `classes.grade`
- Count students per class
- Filter: current academic year, current `school_id`

### Recent Announcements List
- Table: `announcements`
- Order by: `created_at DESC`
- Limit: 5
- Filter: `school_id = X`

---

## Stat Card Changes (existing → new)

The existing 2-card grid becomes 4 cards. The current `stats` array in `page.tsx` is extended. No schema changes needed — Classes count uses `sections` table which already exists.

---

## Notes & Constraints

- All charts are client components; `page.tsx` stays a server component and passes data as props.
- Currency is ₹ (Indian Rupee) — use `IndianRupee` icon from lucide-react.
- The `Classes` stat card counts distinct classes (not sections) to avoid inflating the number.
- Attendance schema needs to be confirmed before wiring — the timetable work used `section_id`; attendance may be per-student per-day or per-section per-day.
- No new DB migrations required for the mock phase.
