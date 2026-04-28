# Plan 3: Section-Scoped Teacher Portal Pages

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite all teacher portal pages to read from the global section context (`getActiveSection()`) and scope all queries to the selected section. Redesign the teacher dashboard, fix broken results page, add discipline create form, add fees page, fix feedback scoping.

**Architecture:** Every teacher page calls `getActiveSection()` to get the section UUID from the middleware header. If null, renders a "Select a section" prompt. All Supabase queries filter by `section_id` (or by `class_id` for class-level data like fee structures). Server components do the data fetching, client components handle forms and interactions.

**Tech Stack:** Next.js 16 App Router, Supabase JS, TypeScript, existing UI components.

**Spec:** `docs/superpowers/specs/2026-04-29-section-scoped-portal-design.md` — "Teacher Portal Pages" and "Section-Scoped Dashboard" sections.

**Depends on:** Plan 2 (section switcher + middleware must be working).

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| **Dashboard** | | |
| Rewrite | `apps/web/app/(school)/teacher/dashboard/page.tsx` | Section-scoped dashboard: attendance today, trend, pending homework, recent discipline |
| Keep | `apps/web/app/(school)/teacher/dashboard/section-attendance-chart.tsx` | Reuse existing chart component |
| Delete | `apps/web/app/(school)/teacher/dashboard/homework-chart.tsx` | Replaced by pending homework list |
| **Attendance** | | |
| Rewrite | `apps/web/app/(school)/teacher/attendance/page.tsx` | Show today's attendance status for active section, link to mark page |
| Modify | `apps/web/app/(school)/teacher/attendance/mark/page.tsx` | Read section from context instead of URL param |
| Delete | `apps/web/app/(school)/teacher/attendance/attendance-picker.tsx` | Replaced by global section switcher |
| **Homework** | | |
| Modify | `apps/web/app/(school)/teacher/homework/page.tsx` | Filter by section_id from context |
| Modify | `apps/web/app/(school)/teacher/homework/create-homework-form.tsx` | Pre-fill class/section from context |
| **Results** | | |
| Rewrite | `apps/web/app/(school)/teacher/results/page.tsx` | List exams for section's class, add section-level exam creation |
| Create | `apps/web/app/(school)/teacher/results/create-exam-form.tsx` | Section-level exam creation form |
| Rewrite | `apps/web/app/(school)/teacher/results/[examId]/page.tsx` | Marks entry scoped to section students |
| **Discipline** | | |
| Rewrite | `apps/web/app/(school)/teacher/discipline/page.tsx` | Scope to section, add create form |
| Create | `apps/web/app/(school)/teacher/discipline/create-discipline-form.tsx` | New discipline record form |
| **Fees** | | |
| Create | `apps/web/app/(school)/teacher/fees/page.tsx` | Fee status for section students + record payment |
| Create | `apps/web/app/(school)/teacher/fees/record-payment-form.tsx` | Payment recording form |
| Create | `apps/web/app/(school)/teacher/fees/loading.tsx` | Loading skeleton |
| **Feedback** | | |
| Modify | `apps/web/app/(school)/teacher/feedback/page.tsx` | Fix: scope to logged-in user only |
| **Shared** | | |
| Create | `apps/web/app/(school)/teacher/no-section-prompt.tsx` | Shared "Select a section" empty state component |

---

## Task 1: Shared No-Section Prompt

**Files:**
- Create: `apps/web/app/(school)/teacher/no-section-prompt.tsx`

Every teacher page needs to handle the case where no section is selected. This shared component avoids duplication.

- [ ] **Step 1: Create the component**

```tsx
// apps/web/app/(school)/teacher/no-section-prompt.tsx
export function NoSectionPrompt() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-12 text-center">
      <p className="text-lg font-medium text-foreground">No section selected</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Use the section switcher in the sidebar to pick a class and section.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd "/Users/dineshlearning/Documents/make money/erp"
git add "apps/web/app/(school)/teacher/no-section-prompt.tsx"
git commit -m "feat: shared no-section-prompt component for teacher pages"
```

---

## Task 2: Section-Scoped Dashboard

**Files:**
- Rewrite: `apps/web/app/(school)/teacher/dashboard/page.tsx`

The dashboard shows: section header, today's attendance (big number + mark button), 7-day trend, pending homework list, recent discipline. It uses `getActiveSection()` to scope all queries.

- [ ] **Step 1: Rewrite the dashboard page**

Replace the entire file. The new dashboard is significantly different from the old one — it's section-focused, not teacher-focused.

```tsx
// apps/web/app/(school)/teacher/dashboard/page.tsx
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { getActiveSection } from "@/lib/section-context";
import { NoSectionPrompt } from "../no-section-prompt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionAttendanceChart } from "./section-attendance-chart";
import type { SectionAttendance } from "./section-attendance-chart";
import Link from "next/link";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getLastNSchoolDays(n: number): Date[] {
  const days: Date[] = [];
  let d = new Date();
  d.setDate(d.getDate() - 1);
  while (days.length < n) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) days.push(new Date(d));
    d.setDate(d.getDate() - 1);
  }
  return days.reverse();
}

export default async function TeacherDashboard() {
  const sectionId = await getActiveSection();
  if (!sectionId) return <NoSectionPrompt />;

  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;
  const today = new Date().toISOString().slice(0, 10);

  // Section info
  const { data: sectionInfo } = await supabase
    .from("sections")
    .select("name, class:classes(name, order)")
    .eq("id", sectionId)
    .single();

  const cls = sectionInfo?.class as unknown as { name: string; order: number } | null;
  const sectionLabel = `${cls?.name ?? "Class"} – Section ${sectionInfo?.name ?? ""}`;

  // Parallel queries
  const [
    { count: studentCount },
    { data: todayAttendance },
    { data: classTeacher },
    { data: weekAttendance },
    { data: pendingHomework },
    { data: recentDiscipline },
  ] = await Promise.all([
    supabase.from("student_profiles").select("*", { count: "exact", head: true })
      .eq("section_id", sectionId),
    supabase.from("attendance_records").select("status")
      .eq("section_id", sectionId).eq("date", today),
    supabase.from("teacher_profiles")
      .select("profile:profiles(full_name)")
      .eq("class_teacher_of", sectionId)
      .maybeSingle(),
    supabase.from("attendance_records").select("date, status")
      .eq("section_id", sectionId)
      .gte("date", getLastNSchoolDays(7)[0].toISOString().slice(0, 10))
      .lte("date", today),
    supabase.from("homework")
      .select("title, due_date, subject:subjects(name)")
      .eq("section_id", sectionId)
      .gte("due_date", today)
      .order("due_date")
      .limit(5),
    supabase.from("discipline_records")
      .select("category, severity, created_at, student:student_profiles!inner(full_name)")
      .eq("school_id", schoolId)
      .eq("student_profiles.section_id", sectionId)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const classTeacherName = (classTeacher?.profile as unknown as { full_name: string } | null)?.full_name;
  const total = studentCount ?? 0;

  // Today's attendance
  const todayRecords = todayAttendance ?? [];
  const presentCount = todayRecords.filter((r) => r.status === "present").length;
  const absentCount = todayRecords.filter((r) => r.status === "absent").length;
  const lateCount = todayRecords.filter((r) => r.status === "late").length;
  const marked = todayRecords.length > 0;

  // 7-day trend for chart
  const schoolDays = getLastNSchoolDays(7);
  const trendData: SectionAttendance[] = schoolDays.map((d) => {
    const key = d.toISOString().slice(0, 10);
    const dayRecords = (weekAttendance ?? []).filter((r) => r.date === key);
    if (dayRecords.length === 0) return null;
    const present = dayRecords.filter((r) => r.status === "present").length;
    return {
      section: DAY_LABELS[d.getDay()],
      percent: Math.round((present / dayRecords.length) * 100),
    };
  }).filter(Boolean) as SectionAttendance[];

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{sectionLabel}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {classTeacherName ? `${classTeacherName} (Class Teacher)` : "No class teacher assigned"}
          {" · "}{total} students
        </p>
      </div>

      {/* Today's Attendance */}
      <Card>
        <CardContent className="flex items-center justify-between p-6">
          <div>
            {marked ? (
              <>
                <p className="text-3xl font-bold text-foreground">{presentCount}/{total} <span className="text-lg font-normal text-muted-foreground">present</span></p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {absentCount} absent{lateCount > 0 ? ` · ${lateCount} late` : ""}
                </p>
              </>
            ) : (
              <p className="text-lg font-medium text-muted-foreground">Attendance not marked today</p>
            )}
          </div>
          <Link
            href={`/teacher/attendance/mark?sectionId=${sectionId}&date=${today}`}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {marked ? "Edit Attendance" : "Mark Attendance"}
          </Link>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Attendance Trend */}
        <Card>
          <CardHeader><CardTitle>Attendance (Last 7 Days)</CardTitle></CardHeader>
          <CardContent>
            {trendData.length > 0 ? (
              <SectionAttendanceChart data={trendData} />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No attendance data for this period.</p>
            )}
          </CardContent>
        </Card>

        {/* Pending Homework */}
        <Card>
          <CardHeader><CardTitle>Upcoming Homework</CardTitle></CardHeader>
          <CardContent>
            {(pendingHomework ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No upcoming homework.</p>
            ) : (
              <ul className="divide-y divide-border">
                {(pendingHomework ?? []).map((h, i) => {
                  const subj = h.subject as unknown as { name: string } | null;
                  return (
                    <li key={i} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <div>
                        <p className="text-sm font-medium text-foreground">{h.title}</p>
                        <p className="text-xs text-muted-foreground">{subj?.name ?? "—"}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Due {new Date(h.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Discipline */}
      {(recentDiscipline ?? []).length > 0 && (
        <Card>
          <CardHeader><CardTitle>Recent Discipline Incidents</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {(recentDiscipline ?? []).map((d, i) => {
                const student = d.student as unknown as { full_name: string } | null;
                return (
                  <li key={i} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium text-foreground">{student?.full_name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{d.category} · {d.severity}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(d.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

**Note:** The discipline query uses an `!inner` join with a filter on `student_profiles.section_id`. This tells Supabase to filter discipline records where the joined student_profile is in the active section. If this syntax doesn't work with the Supabase JS client, the implementer should query discipline records for the school, then filter client-side by checking if `student_id` is in the section's student list. Verify and adjust.

- [ ] **Step 2: Type-check**

```bash
cd "/Users/dineshlearning/Documents/make money/erp/apps/web" && pnpm type-check
```

- [ ] **Step 3: Verify in browser**

Login as teacher1@demo.com (Ravi Kumar). Class 8A should auto-select. Verify:
1. Section header: "Class 8 – Section A · Ravi Kumar (Class Teacher) · 43 students"
2. Today's attendance: shows count or "not marked" with button
3. Attendance trend: shows 7-day chart
4. Pending homework: shows list (or empty state)
5. Discipline: shows recent incidents (or hidden if none)

- [ ] **Step 4: Commit**

```bash
cd "/Users/dineshlearning/Documents/make money/erp"
git add "apps/web/app/(school)/teacher/dashboard/page.tsx"
git commit -m "feat: section-scoped teacher dashboard with attendance, homework, discipline"
```

---

## Task 3: Attendance — Remove Picker, Use Section Context

**Files:**
- Rewrite: `apps/web/app/(school)/teacher/attendance/page.tsx`
- Modify: `apps/web/app/(school)/teacher/attendance/mark/page.tsx`
- Delete: `apps/web/app/(school)/teacher/attendance/attendance-picker.tsx`

- [ ] **Step 1: Delete the old attendance picker**

```bash
rm "apps/web/app/(school)/teacher/attendance/attendance-picker.tsx"
```

- [ ] **Step 2: Rewrite attendance page — show today's status, link to mark**

```tsx
// apps/web/app/(school)/teacher/attendance/page.tsx
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getActiveSection } from "@/lib/section-context";
import { NoSectionPrompt } from "../no-section-prompt";
import Link from "next/link";

export default async function AttendancePage() {
  const sectionId = await getActiveSection();
  if (!sectionId) return <NoSectionPrompt />;

  const supabase = await createServerSupabaseClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: sectionInfo }, { data: students }, { data: records }] = await Promise.all([
    supabase.from("sections").select("name, class:classes(name)")
      .eq("id", sectionId).single(),
    supabase.from("student_profiles").select("id, full_name")
      .eq("section_id", sectionId).order("full_name"),
    supabase.from("attendance_records").select("student_id, status")
      .eq("section_id", sectionId).eq("date", today),
  ]);

  const cls = sectionInfo?.class as unknown as { name: string } | null;
  const sectionLabel = `${cls?.name ?? "Class"} – Section ${sectionInfo?.name ?? ""}`;
  const recordMap = new Map((records ?? []).map((r) => [r.student_id, r.status]));
  const marked = recordMap.size > 0;

  const rows = (students ?? []).map((s) => ({
    id: s.id,
    name: s.full_name ?? "—",
    status: recordMap.get(s.id) ?? null,
  }));

  const statusColors: Record<string, string> = {
    present: "bg-emerald-100 text-emerald-700",
    absent: "bg-rose-100 text-rose-700",
    late: "bg-amber-100 text-amber-700",
    half_day: "bg-orange-100 text-orange-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Attendance</h1>
          <p className="mt-1 text-sm text-muted-foreground">{sectionLabel} · {today}</p>
        </div>
        <Link
          href={`/teacher/attendance/mark?sectionId=${sectionId}&date=${today}`}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {marked ? "Edit Attendance" : "Mark Attendance"}
        </Link>
      </div>

      {!marked ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">Attendance not yet marked for today.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Student</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 text-sm text-foreground">{r.name}</td>
                  <td className="px-4 py-3">
                    {r.status ? (
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[r.status] ?? "bg-gray-100 text-gray-700"}`}>
                        {r.status}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Update mark page — fallback to section context if no URL param**

In `apps/web/app/(school)/teacher/attendance/mark/page.tsx`, update the section resolution to fall back to the active section from context:

At the top of the function, after extracting searchParams, add:

```tsx
import { getActiveSection } from "@/lib/section-context";

// ... inside the function, after const { sectionId: paramSectionId, date: paramDate } = await searchParams;
const activeSectionId = await getActiveSection();
const sectionId = paramSectionId ?? activeSectionId;
const date = paramDate ?? new Date().toISOString().slice(0, 10);
```

And remove the early return for missing sectionId (since we now have a fallback). Keep the null check: if BOTH are null, show the missing message.

- [ ] **Step 4: Type-check**

```bash
cd "/Users/dineshlearning/Documents/make money/erp/apps/web" && pnpm type-check
```

- [ ] **Step 5: Verify in browser**

1. As teacher Ravi Kumar with Class 8A selected, go to Attendance
2. Verify: shows student list with today's attendance status (or "not marked" if none)
3. Click "Mark Attendance" → verify mark page loads with Class 8A students
4. Mark some students, save → verify redirects back and status updates

- [ ] **Step 6: Commit**

```bash
cd "/Users/dineshlearning/Documents/make money/erp"
git add -A
git commit -m "feat: section-scoped attendance page, remove old picker"
```

---

## Task 4: Homework — Scope to Section

**Files:**
- Modify: `apps/web/app/(school)/teacher/homework/page.tsx`
- Modify: `apps/web/app/(school)/teacher/homework/create-homework-form.tsx`

- [ ] **Step 1: Update homework page to filter by active section**

In `apps/web/app/(school)/teacher/homework/page.tsx`:

Add at the top:
```tsx
import { getActiveSection } from "@/lib/section-context";
import { NoSectionPrompt } from "../no-section-prompt";
```

At the start of the page function, add section check:
```tsx
const sectionId = await getActiveSection();
if (!sectionId) return <NoSectionPrompt />;
```

Update the homework list query to filter by section_id instead of teacher_id:
Change `.eq("teacher_id", user!.id)` to `.eq("section_id", sectionId)` on the homework list query.

Also pass `activeSectionId={sectionId}` to the `CreateHomeworkForm` component.

- [ ] **Step 2: Update create form to pre-fill class/section from context**

In `apps/web/app/(school)/teacher/homework/create-homework-form.tsx`:

Add a new prop `activeSectionId?: string`. When provided:
- Find the matching section in the sections list
- Auto-set `classId` and `sectionId` state on mount
- This pre-fills the Class and Section dropdowns, reducing clicks

Add a `useEffect` that runs when `activeSectionId` changes:
```tsx
useEffect(() => {
  if (activeSectionId) {
    const sec = sections.find((s) => s.value === activeSectionId);
    if (sec) {
      setSectionId(sec.value);
      setClassId(sec.classId);
    }
  }
}, [activeSectionId, sections]);
```

- [ ] **Step 3: Type-check and verify**

```bash
cd "/Users/dineshlearning/Documents/make money/erp/apps/web" && pnpm type-check
```

Verify in browser: homework page shows only homework for the selected section. Create form pre-fills class/section.

- [ ] **Step 4: Commit**

```bash
cd "/Users/dineshlearning/Documents/make money/erp"
git add "apps/web/app/(school)/teacher/homework/"
git commit -m "feat: scope homework page to active section, pre-fill create form"
```

---

## Task 5: Discipline — Scope to Section + Create Form

**Files:**
- Rewrite: `apps/web/app/(school)/teacher/discipline/page.tsx`
- Create: `apps/web/app/(school)/teacher/discipline/create-discipline-form.tsx`

- [ ] **Step 1: Check if teacher discipline page exists**

```bash
ls "apps/web/app/(school)/teacher/discipline/" 2>/dev/null || echo "directory does not exist"
```

If the directory doesn't exist, create it. If a page.tsx exists, read it first to understand the current structure.

- [ ] **Step 2: Create the discipline form component**

```tsx
// apps/web/app/(school)/teacher/discipline/create-discipline-form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Props {
  schoolId: string;
  sectionId: string;
  students: { value: string; label: string }[];
  userId: string;
}

const CATEGORY_OPTIONS = [
  { value: "behavioral", label: "Behavioral" },
  { value: "academic", label: "Academic" },
  { value: "attendance", label: "Attendance" },
];

const SEVERITY_OPTIONS = [
  { value: "verbal", label: "Verbal Warning" },
  { value: "written", label: "Written Warning" },
  { value: "suspension", label: "Suspension" },
];

export function CreateDisciplineForm({ schoolId, sectionId, students, userId }: Props) {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [category, setCategory] = useState("");
  const [severity, setSeverity] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!studentId || !category || !severity || !description.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("discipline_records").insert({
      school_id: schoolId,
      student_id: studentId,
      category,
      severity,
      description: description.trim(),
      recorded_by: userId,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Discipline record created.");
    setStudentId(""); setCategory(""); setSeverity(""); setDescription("");
    router.refresh();
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-6">
      <h2 className="text-lg font-medium text-foreground">New Discipline Record</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label>Student</Label>
          <NativeSelect options={students} value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="Select student" />
        </div>
        <div>
          <Label>Category</Label>
          <NativeSelect options={CATEGORY_OPTIONS} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Select category" />
        </div>
        <div>
          <Label>Severity</Label>
          <NativeSelect options={SEVERITY_OPTIONS} value={severity} onChange={(e) => setSeverity(e.target.value)} placeholder="Select severity" />
        </div>
        <div className="sm:col-span-2 lg:col-span-4">
          <Label>Description</Label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the incident..."
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none"
            rows={2}
          />
        </div>
      </div>
      <Button onClick={handleSubmit} disabled={saving || !studentId || !category || !severity || !description.trim()}>
        {saving ? "Saving…" : "Record Incident"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Rewrite the discipline page**

```tsx
// apps/web/app/(school)/teacher/discipline/page.tsx
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { getActiveSection } from "@/lib/section-context";
import { NoSectionPrompt } from "../no-section-prompt";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { CreateDisciplineForm } from "./create-discipline-form";

export default async function DisciplinePage() {
  const sectionId = await getActiveSection();
  if (!sectionId) return <NoSectionPrompt />;

  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;
  const { data: { user } } = await supabase.auth.getUser();

  // Get students in this section (for the create form dropdown + for filtering discipline records)
  const { data: students } = await supabase
    .from("student_profiles")
    .select("id, full_name")
    .eq("section_id", sectionId)
    .order("full_name");

  const studentIds = (students ?? []).map((s) => s.id);
  const studentOptions = (students ?? []).map((s) => ({ value: s.id, label: s.full_name ?? "—" }));

  // Get discipline records for these students
  const { data: records } = await supabase
    .from("discipline_records")
    .select("id, category, severity, description, created_at, student_id")
    .eq("school_id", schoolId)
    .in("student_id", studentIds.length > 0 ? studentIds : ["00000000-0000-0000-0000-000000000000"])
    .order("created_at", { ascending: false });

  const studentMap = new Map((students ?? []).map((s) => [s.id, s.full_name ?? "—"]));

  const rows = (records ?? []).map((r) => ({
    id: r.id,
    student: studentMap.get(r.student_id) ?? "—",
    category: r.category ?? "—",
    severity: r.severity ?? "—",
    description: r.description ?? "—",
    date: new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Discipline</h1>

      <CreateDisciplineForm
        schoolId={schoolId}
        sectionId={sectionId}
        students={studentOptions}
        userId={user!.id}
      />

      <DataTable
        data={rows}
        columns={[
          { header: "Student", accessor: "student" },
          { header: "Category", accessor: "category" },
          { header: "Severity", accessor: (row) => <Badge variant="outline">{row.severity}</Badge> },
          { header: "Description", accessor: "description" },
          { header: "Date", accessor: "date" },
        ]}
        emptyMessage="No discipline records for this section."
      />
    </div>
  );
}
```

- [ ] **Step 4: Type-check and verify**

```bash
cd "/Users/dineshlearning/Documents/make money/erp/apps/web" && pnpm type-check
```

- [ ] **Step 5: Commit**

```bash
cd "/Users/dineshlearning/Documents/make money/erp"
git add "apps/web/app/(school)/teacher/discipline/"
git commit -m "feat: section-scoped discipline page with create form"
```

---

## Task 6: Fees — New Section-Scoped Page

**Files:**
- Create: `apps/web/app/(school)/teacher/fees/page.tsx`
- Create: `apps/web/app/(school)/teacher/fees/record-payment-form.tsx`
- Create: `apps/web/app/(school)/teacher/fees/loading.tsx`

- [ ] **Step 1: Create the loading skeleton**

```tsx
// apps/web/app/(school)/teacher/fees/loading.tsx
export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 rounded bg-skeleton animate-pulse" />
      <div className="h-64 rounded-lg border border-border bg-card animate-pulse" />
    </div>
  );
}
```

- [ ] **Step 2: Create the record payment form**

```tsx
// apps/web/app/(school)/teacher/fees/record-payment-form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { NativeSelect } from "@/components/ui/native-select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Props {
  schoolId: string;
  studentId: string;
  studentName: string;
  feeStructureId: string;
  amountDue: number;
  amountPaid: number;
  onClose: () => void;
}

const METHOD_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cheque", label: "Cheque" },
];

export function RecordPaymentForm({ schoolId, studentId, studentName, feeStructureId, amountDue, amountPaid, onClose }: Props) {
  const router = useRouter();
  const remaining = amountDue - amountPaid;
  const [amount, setAmount] = useState(String(remaining));
  const [method, setMethod] = useState("");
  const [receipt, setReceipt] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0 || !method) return;
    setSaving(true);
    const supabase = createClient();
    const newTotal = amountPaid + numAmount;
    const status = newTotal >= amountDue ? "paid" : "partial";

    const { error } = await supabase.from("fee_payments").insert({
      school_id: schoolId,
      student_id: studentId,
      fee_structure_id: feeStructureId,
      amount_paid: numAmount,
      payment_date: new Date().toISOString().slice(0, 10),
      payment_method: method,
      status,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Payment of ₹${numAmount} recorded for ${studentName}.`);
    onClose();
    router.refresh();
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/50 p-4">
      <p className="text-sm font-medium text-foreground">Record Payment — {studentName}</p>
      <p className="text-xs text-muted-foreground">Due: ₹{amountDue} · Paid: ₹{amountPaid} · Remaining: ₹{remaining}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <Label>Amount (₹)</Label>
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min={1} max={remaining} />
        </div>
        <div>
          <Label>Method</Label>
          <NativeSelect options={METHOD_OPTIONS} value={method} onChange={(e) => setMethod(e.target.value)} placeholder="Select method" />
        </div>
        <div>
          <Label>Receipt # (optional)</Label>
          <Input value={receipt} onChange={(e) => setReceipt(e.target.value)} placeholder="RCP-001" />
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={handleSubmit} disabled={saving || !method || !Number(amount)}>
          {saving ? "Saving…" : "Record Payment"}
        </Button>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create the fees page**

```tsx
// apps/web/app/(school)/teacher/fees/page.tsx
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { getActiveSection } from "@/lib/section-context";
import { NoSectionPrompt } from "../no-section-prompt";
import { FeesTable } from "./fees-table";

export default async function TeacherFeesPage() {
  const sectionId = await getActiveSection();
  if (!sectionId) return <NoSectionPrompt />;

  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  // Get section's class_id
  const { data: section } = await supabase
    .from("sections")
    .select("class_id, name, class:classes(name)")
    .eq("id", sectionId)
    .single();

  const classId = section?.class_id as string;
  const cls = section?.class as unknown as { name: string } | null;
  const sectionLabel = `${cls?.name ?? "Class"} – Section ${section?.name ?? ""}`;

  // Get fee structure for this class
  const { data: feeStructures } = await supabase
    .from("fee_structures")
    .select("id, fee_type, amount")
    .eq("class_id", classId)
    .eq("school_id", schoolId);

  // Get students + their payments
  const { data: students } = await supabase
    .from("student_profiles")
    .select("id, full_name")
    .eq("section_id", sectionId)
    .order("full_name");

  const studentIds = (students ?? []).map((s) => s.id);

  const { data: payments } = await supabase
    .from("fee_payments")
    .select("student_id, fee_structure_id, amount_paid, status")
    .eq("school_id", schoolId)
    .in("student_id", studentIds.length > 0 ? studentIds : ["00000000-0000-0000-0000-000000000000"]);

  // Build rows: one per student per fee structure
  const rows = [];
  for (const student of students ?? []) {
    for (const fs of feeStructures ?? []) {
      const studentPayments = (payments ?? []).filter(
        (p) => p.student_id === student.id && p.fee_structure_id === fs.id
      );
      const totalPaid = studentPayments.reduce((sum, p) => sum + Number(p.amount_paid), 0);
      const status = totalPaid >= Number(fs.amount) ? "paid" : totalPaid > 0 ? "partial" : "pending";
      rows.push({
        studentId: student.id,
        studentName: student.full_name ?? "—",
        feeStructureId: fs.id,
        feeType: fs.fee_type,
        amountDue: Number(fs.amount),
        amountPaid: totalPaid,
        status,
      });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Fees</h1>
        <p className="mt-1 text-sm text-muted-foreground">{sectionLabel}</p>
      </div>
      <FeesTable rows={rows} schoolId={schoolId} />
    </div>
  );
}
```

- [ ] **Step 4: Create the fees table client component**

```tsx
// apps/web/app/(school)/teacher/fees/fees-table.tsx
"use client";

import { useState } from "react";
import { RecordPaymentForm } from "./record-payment-form";

interface FeeRow {
  studentId: string;
  studentName: string;
  feeStructureId: string;
  feeType: string;
  amountDue: number;
  amountPaid: number;
  status: string;
}

const STATUS_COLORS: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-700",
  partial: "bg-amber-100 text-amber-700",
  pending: "bg-rose-100 text-rose-700",
};

export function FeesTable({ rows, schoolId }: { rows: FeeRow[]; schoolId: string }) {
  const [payingFor, setPayingFor] = useState<FeeRow | null>(null);

  return (
    <div className="space-y-4">
      {payingFor && (
        <RecordPaymentForm
          schoolId={schoolId}
          studentId={payingFor.studentId}
          studentName={payingFor.studentName}
          feeStructureId={payingFor.feeStructureId}
          amountDue={payingFor.amountDue}
          amountPaid={payingFor.amountPaid}
          onClose={() => setPayingFor(null)}
        />
      )}

      <div className="rounded-xl border border-border bg-card">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Student</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Fee Type</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Due</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Paid</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">No fee records for this section.</td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={`${r.studentId}-${r.feeStructureId}-${i}`}>
                  <td className="px-4 py-3 text-sm text-foreground">{r.studentName}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{r.feeType}</td>
                  <td className="px-4 py-3 text-right text-sm text-foreground">₹{r.amountDue.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-sm text-foreground">₹{r.amountPaid.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[r.status] ?? ""}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.status !== "paid" && (
                      <button
                        onClick={() => setPayingFor(r)}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Record Payment
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Type-check and verify**

```bash
cd "/Users/dineshlearning/Documents/make money/erp/apps/web" && pnpm type-check
```

Verify in browser: as teacher with Class 8A selected, go to Fees tab. Should show 43 students × 1 fee type (Tuition ₹5000). Most should show "paid" (from seed data). Click "Record Payment" on a pending one.

- [ ] **Step 6: Commit**

```bash
cd "/Users/dineshlearning/Documents/make money/erp"
git add "apps/web/app/(school)/teacher/fees/"
git commit -m "feat: section-scoped fees page with payment recording"
```

---

## Task 7: Feedback — Fix User Scoping

**Files:**
- Modify: `apps/web/app/(school)/teacher/feedback/page.tsx`

- [ ] **Step 1: Read the current feedback page**

```bash
cat "apps/web/app/(school)/teacher/feedback/page.tsx"
```

- [ ] **Step 2: Fix the query to scope to the logged-in user**

The current page likely queries all feedback where `to_role = 'teacher'` without filtering by user. Fix it to filter by `to_user_id = user.id` (or whatever column stores the recipient). If no such column exists, filter by `to_role = 'teacher'` AND check if there's a way to scope it.

Read the feedback table schema first:
```bash
grep -A 10 "CREATE TABLE.*feedback" supabase/migrations/*.sql
```

Apply the appropriate fix based on the actual schema. The key change: feedback must only show records intended for the logged-in user.

- [ ] **Step 3: Type-check and commit**

```bash
cd "/Users/dineshlearning/Documents/make money/erp/apps/web" && pnpm type-check
```

```bash
cd "/Users/dineshlearning/Documents/make money/erp"
git add "apps/web/app/(school)/teacher/feedback/"
git commit -m "fix: scope feedback to logged-in user only"
```

---

## Task 8: Results — Scope to Section + Exam Creation (Stub)

**Note:** The results/exams page is the most complex rework. This task creates a working section-scoped version with exam listing and section-level exam creation. Full subject-gated marks entry is a follow-up.

**Files:**
- Rewrite: `apps/web/app/(school)/teacher/results/page.tsx`
- Create: `apps/web/app/(school)/teacher/results/create-exam-form.tsx`
- Rewrite: `apps/web/app/(school)/teacher/results/[examId]/page.tsx`

- [ ] **Step 1: Check existing exams table schema**

```bash
grep -A 20 "CREATE TABLE.*exams" supabase/migrations/*.sql
```

Read the schema to understand: columns, FK references, whether there's a `section_id` and `class_id` column, and the `exam_results` table structure. The implementer needs this before writing any code.

- [ ] **Step 2: Create the exam creation form**

Based on the schema discovered in Step 1, create a form for section-level exams:

```tsx
// apps/web/app/(school)/teacher/results/create-exam-form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { NativeSelect } from "@/components/ui/native-select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Props {
  schoolId: string;
  sectionId: string;
  classId: string;
  academicYearId: string;
  subjects: { value: string; label: string }[];
}

export function CreateExamForm({ schoolId, sectionId, classId, academicYearId, subjects }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [maxMarks, setMaxMarks] = useState("100");
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!name.trim() || !subjectId || !maxMarks || !date) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("exams").insert({
      school_id: schoolId,
      academic_year_id: academicYearId,
      class_id: classId,
      section_id: sectionId,
      subject_id: subjectId,
      name: name.trim(),
      max_marks: Number(maxMarks),
      date,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Exam created.");
    setName(""); setSubjectId(""); setMaxMarks("100"); setDate("");
    router.refresh();
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-6">
      <h2 className="text-lg font-medium text-foreground">Create Section Exam</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label>Exam Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Unit Test 3" />
        </div>
        <div>
          <Label>Subject</Label>
          <NativeSelect options={subjects} value={subjectId} onChange={(e) => setSubjectId(e.target.value)} placeholder="Select subject" />
        </div>
        <div>
          <Label>Max Marks</Label>
          <Input type="number" value={maxMarks} onChange={(e) => setMaxMarks(e.target.value)} min={1} />
        </div>
        <div>
          <Label>Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      <Button onClick={handleSubmit} disabled={saving || !name.trim() || !subjectId || !date}>
        {saving ? "Creating…" : "Create Exam"}
      </Button>
    </div>
  );
}
```

**Important:** The exams table may not have `section_id` or `subject_id` columns. The implementer MUST check the schema first (Step 1) and adjust the insert accordingly. If the schema doesn't support section-level exams, a migration may be needed — flag this as BLOCKED and report back.

- [ ] **Step 3: Rewrite the results page to list exams for the section**

```tsx
// apps/web/app/(school)/teacher/results/page.tsx
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { getActiveSection } from "@/lib/section-context";
import { NoSectionPrompt } from "../no-section-prompt";
import { CreateExamForm } from "./create-exam-form";
import Link from "next/link";

export default async function ResultsPage() {
  const sectionId = await getActiveSection();
  if (!sectionId) return <NoSectionPrompt />;

  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  // Get section info
  const { data: section } = await supabase
    .from("sections")
    .select("class_id, name, class:classes(name)")
    .eq("id", sectionId).single();

  const classId = section?.class_id as string;

  // Get academic year
  const { data: academicYear } = await supabase
    .from("academic_years")
    .select("id")
    .eq("school_id", schoolId)
    .eq("is_current", true)
    .single();

  // Get subjects for the class
  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name")
    .eq("class_id", classId)
    .eq("school_id", schoolId);

  const subjectOptions = (subjects ?? []).map((s) => ({ value: s.id, label: s.name }));

  // Get exams for this section's class (both section-level and class-level)
  const { data: exams } = await supabase
    .from("exams")
    .select("id, name, date, max_marks, section_id, subject:subjects(name)")
    .eq("school_id", schoolId)
    .eq("class_id", classId)
    .order("date", { ascending: false });

  // Filter: section-level (section_id = this section) or class-level (section_id is null)
  const relevantExams = (exams ?? []).filter(
    (e) => !e.section_id || e.section_id === sectionId
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Results</h1>

      <CreateExamForm
        schoolId={schoolId}
        sectionId={sectionId}
        classId={classId}
        academicYearId={academicYear?.id ?? ""}
        subjects={subjectOptions}
      />

      <div className="rounded-xl border border-border bg-card">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Exam</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Subject</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Max Marks</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Type</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {relevantExams.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">No exams found.</td>
              </tr>
            ) : (
              relevantExams.map((exam) => {
                const subject = exam.subject as unknown as { name: string } | null;
                return (
                  <tr key={exam.id}>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{exam.name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{subject?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {exam.date ? new Date(exam.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{exam.max_marks}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${exam.section_id ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-700"}`}>
                        {exam.section_id ? "Section" : "Class"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/teacher/results/${exam.id}?sectionId=${sectionId}`} className="text-xs font-medium text-primary hover:underline">
                        Enter Marks
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Rewrite marks entry page scoped to section**

The existing `[examId]/page.tsx` loads all school students. Rewrite it to load only the active section's students. The implementer should:

1. Read the active section from `getActiveSection()` (or from the `sectionId` URL param as fallback)
2. Query `student_profiles` where `section_id = sectionId`
3. Query existing `exam_results` for those students
4. Render the marks entry form scoped to those students
5. Keep the existing marks entry form component if it works, just feed it the scoped student list

- [ ] **Step 5: Type-check and verify**

```bash
cd "/Users/dineshlearning/Documents/make money/erp/apps/web" && pnpm type-check
```

Verify: as teacher, go to Results. Should see exam list (may be empty if no exams seeded). Create a section-level exam. Click "Enter Marks" → should load only section students.

- [ ] **Step 6: Commit**

```bash
cd "/Users/dineshlearning/Documents/make money/erp"
git add "apps/web/app/(school)/teacher/results/"
git commit -m "feat: section-scoped results page with exam creation and marks entry"
```

---

## Self-Review

**Spec coverage:**
- ✅ Dashboard redesign: section header, attendance today, trend, pending homework, recent discipline
- ✅ Attendance: remove old picker, show status table, link to mark page
- ✅ Homework: scope to section, pre-fill create form
- ✅ Results: list exams for section's class, section-level exam creation, marks entry scoped to section
- ✅ Discipline: scope to section students, create form with student/category/severity
- ✅ Fees: new page, fee status per student, record payment
- ✅ Feedback: fix user scoping
- ✅ Shared no-section prompt

**Placeholder scan:** Task 7 (Feedback) and Task 8 Step 4 (marks entry rewrite) are intentionally less prescriptive because they depend on discovering the actual schema/code at implementation time. The implementer is given clear instructions on what to check and what to change. This is acceptable — overprescribing code against an unknown schema would be worse.

**Type consistency:** `getActiveSection()` returns `string | null` consistently. `NoSectionPrompt` is imported from the same relative path in all pages. `SectionAttendance` type is reused from existing chart component.

**Schema risk in Task 8:** The exams table may not have `section_id` or `subject_id` columns. The plan explicitly calls this out and tells the implementer to check the schema first and flag as BLOCKED if a migration is needed. This is the correct approach — we don't guess at schema changes without verifying.
