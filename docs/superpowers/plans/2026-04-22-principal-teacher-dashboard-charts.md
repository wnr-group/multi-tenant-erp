# Principal & Teacher Dashboard Charts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add chart-heavy dashboard pages to the principal and teacher roles using mock data, following the same pattern as the school admin dashboard.

**Architecture:** Server component `page.tsx` per role holds layout and mock data constants; each chart is a co-located `"use client"` component accepting a typed prop. Recharts is already installed. No new dependencies needed.

**Tech Stack:** Next.js 16 (App Router), Recharts (already installed), Tailwind CSS, lucide-react, existing shadcn Card components.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `apps/web/app/(school)/principal/dashboard/weekly-attendance-chart.tsx` | Line chart — 7-day attendance % trend |
| Create | `apps/web/app/(school)/principal/dashboard/class-attendance-chart.tsx` | Bar chart — attendance % per class with 75% reference line |
| Create | `apps/web/app/(school)/principal/dashboard/discipline-chart.tsx` | Bar chart — discipline incidents per month |
| Modify | `apps/web/app/(school)/principal/dashboard/page.tsx` | Add 4th stat card, 3-row layout, mock data |
| Create | `apps/web/app/(school)/teacher/dashboard/section-attendance-chart.tsx` | Bar chart — attendance % per section with 75% reference line |
| Create | `apps/web/app/(school)/teacher/dashboard/homework-chart.tsx` | Donut chart — submitted vs pending |
| Modify | `apps/web/app/(school)/teacher/dashboard/page.tsx` | Add stat cards, keep schedule, add chart row |

---

## Task 1: Create WeeklyAttendanceChart (Principal)

**Files:**
- Create: `apps/web/app/(school)/principal/dashboard/weekly-attendance-chart.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

export type DayAttendance = {
  day: string;
  percent: number;
};

interface WeeklyAttendanceChartProps {
  data: DayAttendance[];
}

export function WeeklyAttendanceChart({ data }: WeeklyAttendanceChartProps) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="day" tick={{ fontSize: 12 }} />
        <YAxis
          domain={[60, 100]}
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 12 }}
        />
        <Tooltip formatter={(value) => typeof value === "number" ? `${value}%` : value} />
        <ReferenceLine
          y={75}
          stroke="#f59e0b"
          strokeDasharray="4 4"
          label={{ value: "75%", position: "insideTopRight", fontSize: 11, fill: "#f59e0b" }}
        />
        <Line
          type="monotone"
          dataKey="percent"
          name="Attendance"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ r: 4, fill: "#10b981" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/dineshlearning/Documents/make\ money/erp/apps/web && pnpm type-check
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
cd /Users/dineshlearning/Documents/make\ money/erp
git add "apps/web/app/(school)/principal/dashboard/weekly-attendance-chart.tsx"
git commit -m "feat: add WeeklyAttendanceChart for principal dashboard"
```

---

## Task 2: Create ClassAttendanceChart (Principal)

**Files:**
- Create: `apps/web/app/(school)/principal/dashboard/class-attendance-chart.tsx`

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
  ReferenceLine,
} from "recharts";

export type ClassAttendance = {
  class: string;
  percent: number;
};

interface ClassAttendanceChartProps {
  data: ClassAttendance[];
}

export function ClassAttendanceChart({ data }: ClassAttendanceChartProps) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="class" tick={{ fontSize: 11 }} />
        <YAxis
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 12 }}
        />
        <Tooltip formatter={(value) => typeof value === "number" ? `${value}%` : value} />
        <ReferenceLine
          y={75}
          stroke="#f59e0b"
          strokeDasharray="4 4"
          label={{ value: "75%", position: "insideTopRight", fontSize: 11, fill: "#f59e0b" }}
        />
        <Bar dataKey="percent" name="Attendance" fill="#6366f1" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/dineshlearning/Documents/make\ money/erp/apps/web && pnpm type-check
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
cd /Users/dineshlearning/Documents/make\ money/erp
git add "apps/web/app/(school)/principal/dashboard/class-attendance-chart.tsx"
git commit -m "feat: add ClassAttendanceChart for principal dashboard"
```

---

## Task 3: Create DisciplineChart (Principal)

**Files:**
- Create: `apps/web/app/(school)/principal/dashboard/discipline-chart.tsx`

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

export type DisciplineMonth = {
  month: string;
  incidents: number;
};

interface DisciplineChartProps {
  data: DisciplineMonth[];
}

export function DisciplineChart({ data }: DisciplineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="incidents" name="Incidents" fill="#f59e0b" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/dineshlearning/Documents/make\ money/erp/apps/web && pnpm type-check
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
cd /Users/dineshlearning/Documents/make\ money/erp
git add "apps/web/app/(school)/principal/dashboard/discipline-chart.tsx"
git commit -m "feat: add DisciplineChart for principal dashboard"
```

---

## Task 4: Update Principal Dashboard Page

**Files:**
- Modify: `apps/web/app/(school)/principal/dashboard/page.tsx`

- [ ] **Step 1: Replace the entire file**

```tsx
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { SwitchRolePanel } from "@/components/switch-role-panel";
import { UserCheck, UserX, GraduationCap, ShieldAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WeeklyAttendanceChart } from "./weekly-attendance-chart";
import { ClassAttendanceChart } from "./class-attendance-chart";
import { DisciplineChart } from "./discipline-chart";
import type { DayAttendance } from "./weekly-attendance-chart";
import type { ClassAttendance } from "./class-attendance-chart";
import type { DisciplineMonth } from "./discipline-chart";

// ---------------------------------------------------------------------------
// Mock data — replace each const with a real Supabase query when wiring backend
// See: docs/superpowers/specs/2026-04-22-principal-teacher-dashboard-charts-design.md
// ---------------------------------------------------------------------------

const MOCK_WEEKLY_ATTENDANCE: DayAttendance[] = [
  { day: "Mon", percent: 87 },
  { day: "Tue", percent: 84 },
  { day: "Wed", percent: 89 },
  { day: "Thu", percent: 82 },
  { day: "Fri", percent: 78 },
  { day: "Sat", percent: 91 },
  { day: "Sun", percent: 85 },
];

const MOCK_CLASS_ATTENDANCE: ClassAttendance[] = [
  { class: "Cls 1", percent: 92 },
  { class: "Cls 2", percent: 88 },
  { class: "Cls 3", percent: 79 },
  { class: "Cls 4", percent: 85 },
  { class: "Cls 5", percent: 91 },
  { class: "Cls 6", percent: 76 },
  { class: "Cls 7", percent: 83 },
  { class: "Cls 8", percent: 88 },
  { class: "Cls 9", percent: 94 },
  { class: "Cls 10", percent: 80 },
  { class: "Cls 11", percent: 73 },
  { class: "Cls 12", percent: 69 },
];

const MOCK_DISCIPLINE_DATA: DisciplineMonth[] = [
  { month: "Nov", incidents: 8 },
  { month: "Dec", incidents: 5 },
  { month: "Jan", incidents: 11 },
  { month: "Feb", incidents: 7 },
  { month: "Mar", incidents: 9 },
  { month: "Apr", incidents: 12 },
];

type Announcement = { title: string; date: string; type: "Event" | "Exam" | "Holiday" | "General" };

const MOCK_ANNOUNCEMENTS: Announcement[] = [
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

export default async function PrincipalDashboard() {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;
  const today = new Date().toISOString().slice(0, 10);

  const [
    { count: presentCount },
    { count: absentCount },
    { count: studentCount },
  ] = await Promise.all([
    supabase
      .from("attendance_records")
      .select("*", { count: "exact", head: true })
      .eq("school_id", schoolId)
      .eq("date", today)
      .eq("status", "present"),
    supabase
      .from("attendance_records")
      .select("*", { count: "exact", head: true })
      .eq("school_id", schoolId)
      .eq("date", today)
      .eq("status", "absent"),
    supabase
      .from("student_profiles")
      .select("*", { count: "exact", head: true })
      .eq("school_id", schoolId),
  ]);

  const stats: { label: string; value: string | number; icon: LucideIcon; iconBg: string; iconColor: string }[] = [
    { label: "Present Today", value: presentCount ?? 0, icon: UserCheck, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
    { label: "Absent Today", value: absentCount ?? 0, icon: UserX, iconBg: "bg-rose-50", iconColor: "text-rose-600" },
    { label: "Total Students", value: studentCount ?? 0, icon: GraduationCap, iconBg: "bg-indigo-50", iconColor: "text-indigo-600" },
    { label: "Discipline (Apr)", value: 12, icon: ShieldAlert, iconBg: "bg-amber-50", iconColor: "text-amber-600" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Principal Dashboard</h1>

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

      {/* Row 2 — Weekly Attendance Trend + Class Attendance */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Weekly Attendance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <WeeklyAttendanceChart data={MOCK_WEEKLY_ATTENDANCE} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Attendance by Class</CardTitle>
          </CardHeader>
          <CardContent>
            <ClassAttendanceChart data={MOCK_CLASS_ATTENDANCE} />
          </CardContent>
        </Card>
      </div>

      {/* Row 3 — Discipline Incidents + Announcements */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Discipline Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <DisciplineChart data={MOCK_DISCIPLINE_DATA} />
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

      <SwitchRolePanel roles={["teacher"]} />
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/dineshlearning/Documents/make\ money/erp/apps/web && pnpm type-check
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
cd /Users/dineshlearning/Documents/make\ money/erp
git add "apps/web/app/(school)/principal/dashboard/page.tsx"
git commit -m "feat: principal dashboard with charts and mock data for demo"
```

---

## Task 5: Create SectionAttendanceChart (Teacher)

**Files:**
- Create: `apps/web/app/(school)/teacher/dashboard/section-attendance-chart.tsx`

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
  ReferenceLine,
} from "recharts";

export type SectionAttendance = {
  section: string;
  percent: number;
};

interface SectionAttendanceChartProps {
  data: SectionAttendance[];
}

export function SectionAttendanceChart({ data }: SectionAttendanceChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="section" tick={{ fontSize: 12 }} />
        <YAxis
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 12 }}
        />
        <Tooltip formatter={(value) => typeof value === "number" ? `${value}%` : value} />
        <ReferenceLine
          y={75}
          stroke="#f59e0b"
          strokeDasharray="4 4"
          label={{ value: "75%", position: "insideTopRight", fontSize: 11, fill: "#f59e0b" }}
        />
        <Bar dataKey="percent" name="Attendance" fill="#6366f1" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/dineshlearning/Documents/make\ money/erp/apps/web && pnpm type-check
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
cd /Users/dineshlearning/Documents/make\ money/erp
git add "apps/web/app/(school)/teacher/dashboard/section-attendance-chart.tsx"
git commit -m "feat: add SectionAttendanceChart for teacher dashboard"
```

---

## Task 6: Create HomeworkChart (Teacher)

**Files:**
- Create: `apps/web/app/(school)/teacher/dashboard/homework-chart.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

export type HomeworkData = {
  submitted: number;
  pending: number;
};

interface HomeworkChartProps {
  data: HomeworkData;
}

const COLOR_MAP: Record<string, string> = {
  Submitted: "#10b981",
  Pending: "#f43f5e",
};

export function HomeworkChart({ data }: HomeworkChartProps) {
  const chartData = [
    { name: "Submitted", value: data.submitted },
    { name: "Pending", value: data.pending },
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
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={COLOR_MAP[entry.name]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => typeof value === "number" ? `${value}%` : value} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-foreground">{data.submitted}%</span>
          <span className="text-xs text-muted-foreground">Submitted</span>
        </div>
      </div>
      <div className="flex gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span className="text-xs text-muted-foreground">Submitted</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
          <span className="text-xs text-muted-foreground">Pending</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/dineshlearning/Documents/make\ money/erp/apps/web && pnpm type-check
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
cd /Users/dineshlearning/Documents/make\ money/erp
git add "apps/web/app/(school)/teacher/dashboard/homework-chart.tsx"
git commit -m "feat: add HomeworkChart donut for teacher dashboard"
```

---

## Task 7: Update Teacher Dashboard Page

**Files:**
- Modify: `apps/web/app/(school)/teacher/dashboard/page.tsx`

- [ ] **Step 1: Replace the entire file**

```tsx
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Clock, BookOpen, GraduationCap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionAttendanceChart } from "./section-attendance-chart";
import { HomeworkChart } from "./homework-chart";
import type { SectionAttendance } from "./section-attendance-chart";
import type { HomeworkData } from "./homework-chart";

const DAYS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// ---------------------------------------------------------------------------
// Mock data — replace each const with a real Supabase query when wiring backend
// See: docs/superpowers/specs/2026-04-22-principal-teacher-dashboard-charts-design.md
// ---------------------------------------------------------------------------

const MOCK_SECTION_ATTENDANCE: SectionAttendance[] = [
  { section: "8A", percent: 91 },
  { section: "9B", percent: 84 },
  { section: "10C", percent: 78 },
];

const MOCK_HOMEWORK: HomeworkData = { submitted: 78, pending: 22 };

// ---------------------------------------------------------------------------

export default async function TeacherDashboard() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .single();

  const todayIndex = new Date().getDay() || 7;
  const todayLabel = DAYS[todayIndex];

  const { data: slots } = await supabase
    .from("timetable")
    .select("id, period_number, subject:subjects(name), section:sections(name, class:classes(name))")
    .eq("teacher_id", user!.id)
    .eq("day_of_week", todayIndex)
    .order("period_number");

  const periodsToday = slots?.length ?? 0;

  const stats: { label: string; value: string | number; icon: LucideIcon; iconBg: string; iconColor: string }[] = [
    { label: "Periods Today", value: periodsToday, icon: Clock, iconBg: "bg-indigo-50", iconColor: "text-indigo-600" },
    { label: "My Sections", value: 3, icon: BookOpen, iconBg: "bg-violet-50", iconColor: "text-violet-600" },
    { label: "My Students", value: 127, icon: GraduationCap, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Good morning, {profile?.full_name || "Teacher"}!
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Today is {todayLabel}. Here are your periods for the day.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="flex items-center gap-4 rounded-xl border border-border bg-card p-5">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${s.iconBg} ${s.iconColor}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Today's Schedule */}
      {!slots || slots.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">No periods scheduled for today.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {slots.map((slot) => {
            const subject = slot.subject as unknown as { name: string } | null;
            const section = slot.section as unknown as { name: string; class: { name: string } | null } | null;
            return (
              <div key={slot.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 font-bold text-sm">
                  P{slot.period_number}
                </div>
                <div>
                  <p className="font-medium text-foreground">{subject?.name ?? "—"}</p>
                  <p className="text-sm text-muted-foreground">
                    {section?.class?.name ?? ""}{section?.name ? ` · Section ${section.name}` : ""}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Row 2 — Section Attendance + Homework */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Section Attendance Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <SectionAttendanceChart data={MOCK_SECTION_ATTENDANCE} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Homework</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <HomeworkChart data={MOCK_HOMEWORK} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/dineshlearning/Documents/make\ money/erp/apps/web && pnpm type-check
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
cd /Users/dineshlearning/Documents/make\ money/erp
git add "apps/web/app/(school)/teacher/dashboard/page.tsx"
git commit -m "feat: teacher dashboard with charts and mock data for demo"
```

---

## Self-Review Notes

- **Spec coverage:** 4 principal stat cards ✓, WeeklyAttendanceChart ✓, ClassAttendanceChart ✓, DisciplineChart ✓, Announcements list ✓, 3 teacher stat cards ✓, schedule kept ✓, SectionAttendanceChart ✓, HomeworkChart ✓
- **Types:** `DayAttendance`, `ClassAttendance`, `DisciplineMonth` (principal); `SectionAttendance`, `HomeworkData` (teacher) — all defined in source files and imported with `import type` in pages
- **75% reference line:** present in both attendance bar charts (ClassAttendanceChart and SectionAttendanceChart) and weekly line chart ✓
- **Real queries preserved:** Principal keeps attendance_records + student_profiles queries; Teacher keeps timetable + profiles queries ✓
- **No placeholders:** all code complete
