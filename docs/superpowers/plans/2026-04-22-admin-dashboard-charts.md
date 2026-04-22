# Admin Dashboard Charts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the minimal 2-card admin dashboard with a rich chart-heavy overview using mock data, ready for real Supabase wiring later.

**Architecture:** The `page.tsx` server component is updated to pass mock data as props to three new `"use client"` chart components (recharts requires browser APIs). A fourth section renders a static announcements list. No Supabase queries change during this phase.

**Tech Stack:** Next.js 16 (App Router), Recharts, Tailwind CSS, lucide-react, existing shadcn Card components.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `apps/web/app/(school)/admin/dashboard/page.tsx` | Server component — mock data + layout |
| Create | `apps/web/app/(school)/admin/dashboard/fee-collection-chart.tsx` | Client component — monthly fee bar chart |
| Create | `apps/web/app/(school)/admin/dashboard/attendance-chart.tsx` | Client component — attendance donut chart |
| Create | `apps/web/app/(school)/admin/dashboard/students-by-class-chart.tsx` | Client component — students per class bar chart |

---

## Task 1: Install Recharts

**Files:**
- Modify: `apps/web/package.json`

- [ ] **Step 1: Add recharts dependency**

```bash
cd apps/web && pnpm add recharts
```

Expected output: `+ recharts <version>` with no errors.

- [ ] **Step 2: Verify type-check still passes**

```bash
cd apps/web && pnpm type-check
```

Expected: exits 0 with no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml
git commit -m "chore: add recharts for dashboard charts"
```

---

## Task 2: Create FeeCollectionChart

**Files:**
- Create: `apps/web/app/(school)/admin/dashboard/fee-collection-chart.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export type FeeMonth = {
  month: string;
  collected: number;
  due: number;
};

interface FeeCollectionChartProps {
  data: FeeMonth[];
}

export function FeeCollectionChart({ data }: FeeCollectionChartProps) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis
          tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
          tick={{ fontSize: 12 }}
        />
        <Tooltip
          formatter={(value: number) =>
            `₹${value.toLocaleString("en-IN")}`
          }
        />
        <Legend />
        <Bar dataKey="collected" name="Collected" fill="#6366f1" radius={[4, 4, 0, 0]} />
        <Bar dataKey="due" name="Due" fill="#e0e7ff" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd apps/web && pnpm type-check
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(school\)/admin/dashboard/fee-collection-chart.tsx
git commit -m "feat: add FeeCollectionChart component (mock data)"
```

---

## Task 3: Create AttendanceChart

**Files:**
- Create: `apps/web/app/(school)/admin/dashboard/attendance-chart.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

export type AttendanceData = {
  present: number;
  absent: number;
};

interface AttendanceChartProps {
  data: AttendanceData;
}

const COLORS = ["#10b981", "#f43f5e"];

export function AttendanceChart({ data }: AttendanceChartProps) {
  const chartData = [
    { name: "Present", value: data.present },
    { name: "Absent", value: data.absent },
  ];

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <ResponsiveContainer width={180} height={180}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
            >
              {chartData.map((_, index) => (
                <Cell key={index} fill={COLORS[index]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => `${value}%`} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-foreground">{data.present}%</span>
          <span className="text-xs text-muted-foreground">Present</span>
        </div>
      </div>
      <div className="flex gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span className="text-xs text-muted-foreground">Present</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
          <span className="text-xs text-muted-foreground">Absent</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd apps/web && pnpm type-check
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(school\)/admin/dashboard/attendance-chart.tsx
git commit -m "feat: add AttendanceChart donut component (mock data)"
```

---

## Task 4: Create StudentsByClassChart

**Files:**
- Create: `apps/web/app/(school)/admin/dashboard/students-by-class-chart.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export type ClassCount = {
  class: string;
  students: number;
};

interface StudentsByClassChartProps {
  data: ClassCount[];
}

export function StudentsByClassChart({ data }: StudentsByClassChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="class" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="students" name="Students" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd apps/web && pnpm type-check
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(school\)/admin/dashboard/students-by-class-chart.tsx
git commit -m "feat: add StudentsByClassChart component (mock data)"
```

---

## Task 5: Update Dashboard Page

**Files:**
- Modify: `apps/web/app/(school)/admin/dashboard/page.tsx`

- [ ] **Step 1: Replace page.tsx with the full updated version**

```tsx
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { SwitchRolePanel } from "@/components/switch-role-panel";
import { Users, GraduationCap, BookOpen, IndianRupee } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FeeCollectionChart } from "./fee-collection-chart";
import { AttendanceChart } from "./attendance-chart";
import { StudentsByClassChart } from "./students-by-class-chart";
import type { FeeMonth } from "./fee-collection-chart";
import type { AttendanceData } from "./attendance-chart";
import type { ClassCount } from "./students-by-class-chart";

// ---------------------------------------------------------------------------
// Mock data — replace each const with a real Supabase query when wiring backend
// See: docs/superpowers/specs/2026-04-22-admin-dashboard-charts-design.md
// ---------------------------------------------------------------------------

const MOCK_FEE_DATA: FeeMonth[] = [
  { month: "Nov", collected: 320000, due: 380000 },
  { month: "Dec", collected: 290000, due: 350000 },
  { month: "Jan", collected: 350000, due: 400000 },
  { month: "Feb", collected: 310000, due: 360000 },
  { month: "Mar", collected: 370000, due: 420000 },
  { month: "Apr", collected: 384000, due: 430000 },
];

const MOCK_ATTENDANCE: AttendanceData = { present: 84, absent: 16 };

const MOCK_CLASS_DATA: ClassCount[] = [
  { class: "Cls 1", students: 95 },
  { class: "Cls 2", students: 102 },
  { class: "Cls 3", students: 88 },
  { class: "Cls 4", students: 110 },
  { class: "Cls 5", students: 98 },
  { class: "Cls 6", students: 105 },
  { class: "Cls 7", students: 92 },
  { class: "Cls 8", students: 87 },
  { class: "Cls 9", students: 115 },
  { class: "Cls 10", students: 108 },
  { class: "Cls 11", students: 72 },
  { class: "Cls 12", students: 68 },
];

const MOCK_ANNOUNCEMENTS = [
  { title: "Annual Sports Day", date: "Apr 18, 2026", type: "Event" },
  { title: "Mid-Term Exam Schedule Released", date: "Apr 10, 2026", type: "Exam" },
  { title: "Summer Vacation Notice", date: "Apr 5, 2026", type: "Holiday" },
  { title: "Parent-Teacher Meeting", date: "Mar 28, 2026", type: "General" },
  { title: "Science Exhibition", date: "Mar 20, 2026", type: "Event" },
];

const BADGE_COLORS: Record<string, string> = {
  Event: "bg-indigo-100 text-indigo-700",
  Exam: "bg-amber-100 text-amber-700",
  Holiday: "bg-emerald-100 text-emerald-700",
  General: "bg-gray-100 text-gray-700",
};

// ---------------------------------------------------------------------------

export default async function AdminDashboard() {
  const supabase = await createServerSupabaseClient();
  const schoolId = await getSchoolId();

  const [{ count: teacherCount }, { count: studentCount }] = await Promise.all([
    supabase.from("teacher_profiles").select("*", { count: "exact", head: true }).eq("school_id", schoolId!),
    supabase.from("student_profiles").select("*", { count: "exact", head: true }).eq("school_id", schoolId!),
  ]);

  // Use real counts for Teachers/Students; mock for Classes and Fees for demo
  const stats: { label: string; value: string | number; icon: LucideIcon; iconBg: string; iconColor: string }[] = [
    { label: "Students", value: studentCount ?? 1240, icon: GraduationCap, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
    { label: "Teachers", value: teacherCount ?? 48, icon: Users, iconBg: "bg-indigo-50", iconColor: "text-indigo-600" },
    { label: "Classes", value: 12, icon: BookOpen, iconBg: "bg-violet-50", iconColor: "text-violet-600" },
    { label: "Fee Collected", value: "₹3,84,000", icon: IndianRupee, iconBg: "bg-amber-50", iconColor: "text-amber-600" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">School Overview</h1>

      {/* Row 1 — Stat Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="flex items-center gap-4 rounded-xl border border-border bg-card p-5">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${s.iconBg} ${s.iconColor}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-foreground truncate">{s.value}</p>
                <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Row 2 — Fee Collection + Attendance */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Monthly Fee Collection</CardTitle>
          </CardHeader>
          <CardContent>
            <FeeCollectionChart data={MOCK_FEE_DATA} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attendance</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <AttendanceChart data={MOCK_ATTENDANCE} />
          </CardContent>
        </Card>
      </div>

      {/* Row 3 — Students by Class + Announcements */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Students by Class</CardTitle>
          </CardHeader>
          <CardContent>
            <StudentsByClassChart data={MOCK_CLASS_DATA} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Announcements</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {MOCK_ANNOUNCEMENTS.map((a) => (
                <li key={a.title} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.date}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${BADGE_COLORS[a.type] ?? BADGE_COLORS.General}`}>
                    {a.type}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <SwitchRolePanel roles={["principal", "teacher"]} />
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd apps/web && pnpm type-check
```

Expected: exits 0.

- [ ] **Step 3: Verify dev server compiles without error**

Run `pnpm dev` from `apps/web` (already running). Open http://localhost:3000 and navigate to the admin dashboard. Verify:
- 4 stat cards visible in a row
- Bar chart with 6 months of fee data
- Donut chart showing 84% attendance
- Bar chart with 12 classes
- Announcements list with 5 items and colored badges

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/\(school\)/admin/dashboard/page.tsx
git commit -m "feat: admin dashboard with charts and mock data for demo"
```

---

## Self-Review Notes

- **Spec coverage:** All 4 stat cards ✓, fee bar chart ✓, attendance donut ✓, students by class ✓, announcements list ✓, backend wiring documented via comments ✓
- **Types:** `FeeMonth`, `AttendanceData`, `ClassCount` defined in their respective files and re-exported via `import type` in page.tsx — consistent throughout
- **Mock data:** All mock consts are clearly labeled with comments pointing to the spec doc for backend wiring
- **No placeholders:** All code is complete and runnable
