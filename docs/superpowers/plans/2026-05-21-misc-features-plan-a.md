# Misc Features Plan A — Tooltip, Import Errors, App Status, Rank, Pie Chart, Photo Upload, Icons

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement seven product features across the admin web app and parent mobile app — feedback student tooltip, CSV import error details, uninstalled-app student list, no-rank for failed/absent, payment pie chart, parent photo upload, and mobile menu icons.

**Architecture:** All web features extend existing Next.js server components and client components. Mobile features extend the existing Expo/React Native screens. No new dependencies needed except confirming `react-native-svg` (Expo-bundled) for the mobile pie chart and `expo-image-picker` (standard Expo) for photo upload.

**Tech Stack:** Next.js 15 App Router, Supabase (server + client), recharts (web charts), react-native-svg (mobile chart), expo-image-picker (photo), lucide-react (web icons), Ionicons (mobile icons), Tailwind CSS.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `apps/web/app/(school)/admin/feedback/page.tsx` | Modify | Join student_profiles to feedback query, pass student data |
| `apps/web/app/(school)/principal/feedback/page.tsx` | Modify | Same as admin feedback |
| `apps/web/app/(school)/teacher/feedback/feedback-list.tsx` | Modify | Add student tooltip with profile link |
| `apps/web/app/(school)/admin/students/bulk-actions.tsx` | Modify | Show per-row error details after import |
| `apps/web/app/(school)/admin/students/uninstalled/page.tsx` | Create | List students with phone but no parent auth account |
| `apps/web/app/(school)/admin/students/page.tsx` | Modify | Add "Not Using App" link button |
| `apps/web/app/(school)/teacher/results/[examId]/rankings/page.tsx` | Modify | Skip rank for failed/absent students |
| `apps/web/app/(school)/admin/students/[id]/student-fees-pie-chart.tsx` | Create | Paid vs Pending pie chart component |
| `apps/web/app/(school)/admin/students/[id]/student-fees-client.tsx` | Modify | Embed pie chart in fees tab |
| `apps/web/components/sidebar.tsx` | Modify | Add Gallery icon to ICON_MAP |
| `apps/mobile/app/(parent)/fees.tsx` | Modify | Add donut chart for paid vs pending |
| `apps/mobile/app/(parent)/more.tsx` | Modify | Add Ionicons to each menu item, photo tap-to-upload |

---

## Task 1: Feedback Student Tooltip

**Files:**
- Modify: `apps/web/app/(school)/admin/feedback/page.tsx`
- Modify: `apps/web/app/(school)/principal/feedback/page.tsx`
- Modify: `apps/web/app/(school)/teacher/feedback/feedback-list.tsx`

- [ ] **Step 1: Update FeedbackItem type in feedback-list.tsx**

Replace the `FeedbackItem` interface (lines 11–19) with:

```typescript
interface StudentSnippet {
  id: string;
  full_name: string | null;
  class_name: string | null;
  section_name: string | null;
  roll_number: string | null;
  photo_url: string | null;
}

interface FeedbackItem {
  id: string;
  subject: string;
  message: string;
  from_name: string;
  from_role: string;
  status: string;
  response: string;
  created_at: string;
  student?: StudentSnippet;
}
```

- [ ] **Step 2: Add tooltip markup in feedback-list.tsx**

Add `import Link from "next/link";` at the top.

Replace the sender line (line 98 `<p className="mt-2 text-xs text-gray-400">...`):

```tsx
<p className="mt-2 text-xs text-gray-400 flex items-center gap-1">
  From:&nbsp;
  {item.student ? (
    <span className="relative inline-block group">
      <span className="cursor-default underline decoration-dotted decoration-gray-400">
        {item.from_name}
      </span>
      <span className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 w-56 rounded-xl border border-gray-200 bg-white p-3 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <span className="flex items-center gap-2 mb-2">
          {item.student.photo_url ? (
            <img src={item.student.photo_url} alt="" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
              {(item.student.full_name ?? "?")[0].toUpperCase()}
            </span>
          )}
          <span className="font-semibold text-gray-900 text-xs">{item.student.full_name ?? "—"}</span>
        </span>
        <span className="block text-xs text-gray-500 mb-0.5">
          {[item.student.class_name, item.student.section_name ? `Sec ${item.student.section_name}` : null].filter(Boolean).join(" · ")}
        </span>
        {item.student.roll_number && (
          <span className="block text-xs text-gray-500 mb-2">Roll: {item.student.roll_number}</span>
        )}
        <Link
          href={`/admin/students/${item.student.id}`}
          className="pointer-events-auto text-xs font-medium text-indigo-600 hover:underline"
        >
          View Profile →
        </Link>
      </span>
    </span>
  ) : (
    item.from_name
  )}
  &nbsp;·&nbsp; {item.created_at}
</p>
```

- [ ] **Step 3: Update admin/feedback/page.tsx to join student data**

Replace the entire file content:

```typescript
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { FeedbackList } from "../../teacher/feedback/feedback-list";

export default async function AdminFeedbackPage() {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  const { data: feedback } = await supabase
    .from("feedback")
    .select("id, subject, message, status, created_at, response, from_user_id")
    .eq("school_id", schoolId)
    .in("to_role", ["school_admin", "principal"])
    .order("created_at", { ascending: false });

  const fromUserIds = [...new Set((feedback ?? []).map((f) => f.from_user_id))];

  const [profilesRes, studentsRes] = await Promise.all([
    fromUserIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", fromUserIds)
      : Promise.resolve({ data: [] }),
    fromUserIds.length
      ? supabase
          .from("student_profiles")
          .select("id, full_name, roll_number, photo_url, parent_profile_id, class:classes(name), section:sections(name)")
          .in("parent_profile_id", fromUserIds)
      : Promise.resolve({ data: [] }),
  ]);

  const profileMap = Object.fromEntries(
    (profilesRes.data ?? []).map((p) => [p.id, p.full_name])
  );
  const studentByParent = Object.fromEntries(
    (studentsRes.data ?? []).map((s: any) => [
      s.parent_profile_id,
      {
        id: s.id,
        full_name: s.full_name ?? null,
        class_name: s.class?.name ?? null,
        section_name: s.section?.name ?? null,
        roll_number: s.roll_number ?? null,
        photo_url: s.photo_url ?? null,
      },
    ])
  );

  const items = (feedback ?? []).map((f) => ({
    id: f.id,
    subject: f.subject ?? "—",
    message: f.message ?? "—",
    from_name: profileMap[f.from_user_id] ?? "—",
    from_role: "parent",
    status: f.status ?? "open",
    response: f.response ?? "",
    created_at: f.created_at ? new Date(f.created_at).toLocaleDateString() : "—",
    student: studentByParent[f.from_user_id],
  }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Feedback</h1>
      <FeedbackList items={items} />
    </div>
  );
}
```

- [ ] **Step 4: Apply the same change to principal/feedback/page.tsx**

The file is identical to admin/feedback/page.tsx except the function name. Apply the same query changes — same `profilesRes` + `studentsRes` parallel fetch and `studentByParent` map. Keep `PrincipalFeedbackPage` as the function name.

- [ ] **Step 5: Verify**

Open `/admin/feedback`. Hover over the "From:" sender name on any feedback row from a parent who has a student linked. The tooltip should appear with photo/avatar, name, class, roll number, and a working "View Profile →" link.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/\(school\)/admin/feedback/page.tsx \
        apps/web/app/\(school\)/principal/feedback/page.tsx \
        apps/web/app/\(school\)/teacher/feedback/feedback-list.tsx
git commit -m "feat(feedback): add student tooltip with profile link on sender name"
```

---

## Task 2: CSV Import — Per-Row Error Detail Table

**Files:**
- Modify: `apps/web/app/(school)/admin/students/bulk-actions.tsx`

The API at `/api/students/import` already returns `results: { row, status, error }[]`. The client currently only counts them. This task surfaces the details.

- [ ] **Step 1: Extend the result state type**

In `bulk-actions.tsx`, replace the `result` state and its type:

```typescript
interface ImportResult {
  created: number;
  updated: number;
  errors: number;
  errorRows: { row: number; error: string }[];
}
```

Change the state declaration (line 27):
```typescript
const [result, setResult] = useState<ImportResult | null>(null);
```

- [ ] **Step 2: Populate errorRows in handleUpload**

In `handleUpload`, replace the `setResult` call inside the `try` block:

```typescript
const results = data.results ?? [];
const errorRows = results
  .filter((r: any) => r.status === "error")
  .map((r: any) => ({ row: (r.row as number) + 2, error: r.error ?? "Unknown error" }));
// row + 2: +1 for 0-index, +1 for header row → matches spreadsheet row number

setResult({
  created: results.filter((r: any) => r.status === "created").length,
  updated: results.filter((r: any) => r.status === "updated").length,
  errors: errorRows.length,
  errorRows,
});
```

- [ ] **Step 3: Update the result display panel**

Replace the entire `{result && ...}` block at the bottom of the component:

```tsx
{result && (
  <div className="absolute right-0 top-full z-20 mt-1 w-80 rounded-lg border border-border bg-background p-3 shadow-lg">
    <p className="text-sm font-medium text-foreground">Import Complete</p>
    <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
      <li className="text-green-600">{result.created} created</li>
      <li className="text-blue-600">{result.updated} updated</li>
      {result.errors > 0 && (
        <li className="text-red-600">{result.errors} error{result.errors > 1 ? "s" : ""}</li>
      )}
    </ul>

    {result.errorRows.length > 0 && (
      <div className="mt-2">
        <p className="mb-1 text-xs font-medium text-red-600">Error Details</p>
        <div className="max-h-48 overflow-y-auto rounded border border-red-100 bg-red-50">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-red-100">
                <th className="px-2 py-1 text-left font-medium text-red-700">Row</th>
                <th className="px-2 py-1 text-left font-medium text-red-700">Error</th>
              </tr>
            </thead>
            <tbody>
              {result.errorRows.map((e) => (
                <tr key={e.row} className="border-b border-red-100 last:border-0">
                  <td className="px-2 py-1 tabular-nums text-red-800">{e.row}</td>
                  <td className="px-2 py-1 text-red-700">{e.error}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}

    <button
      onClick={() => setResult(null)}
      className="mt-2 text-xs text-muted-foreground hover:text-foreground"
    >
      Dismiss
    </button>
  </div>
)}
```

- [ ] **Step 4: Verify**

Upload a CSV with one valid row and one row with an unknown class name (e.g., `class_name = "ClassXYZ"`). The import panel should show "1 created, 1 error" and a table row with "Row 3 — Class 'classxyz' not found" (or similar message from the API).

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/\(school\)/admin/students/bulk-actions.tsx
git commit -m "feat(students): show per-row error details in CSV import result panel"
```

---

## Task 3: Uninstalled App — Admin Student List

**Files:**
- Create: `apps/web/app/(school)/admin/students/uninstalled/page.tsx`
- Modify: `apps/web/app/(school)/admin/students/page.tsx`

Students with `parent_phone IS NOT NULL AND parent_profile_id IS NULL` have not created an auth account (i.e. the app is not installed/set up by their parent).

- [ ] **Step 1: Create the uninstalled page**

Create `apps/web/app/(school)/admin/students/uninstalled/page.tsx`:

```typescript
export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft, Copy } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { UninstalledStudentTable } from "./uninstalled-table";

export default async function UninstalledStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string }>;
}) {
  const { classId } = await searchParams;
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  const [studentsRes, classesRes] = await Promise.all([
    supabase
      .from("student_profiles")
      .select("id, full_name, parent_phone, roll_number, class:classes(id, name), section:sections(name)")
      .eq("school_id", schoolId)
      .not("parent_phone", "is", null)
      .is("parent_profile_id", null)
      .order("full_name"),
    supabase.from("classes").select("id, name").eq("school_id", schoolId).order("order"),
  ]);

  const allStudents = (studentsRes.data ?? []).map((s: any) => ({
    id: s.id,
    full_name: s.full_name ?? "—",
    parent_phone: s.parent_phone ?? "",
    roll_number: s.roll_number ?? "",
    class_id: s.class?.id ?? "",
    class_name: s.class?.name ?? "—",
    section_name: s.section?.name ?? "—",
  }));

  const filtered = classId
    ? allStudents.filter((s) => s.class_id === classId)
    : allStudents;

  const classes = (classesRes.data ?? []) as { id: string; name: string }[];

  return (
    <div className="space-y-6">
      <Link
        href="/admin/students"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Students
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">App Not Installed</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} student{filtered.length !== 1 ? "s" : ""} whose parents have not set up the app
          </p>
        </div>
      </div>

      {/* Class filter */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/students/uninstalled"
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            !classId ? "bg-indigo-600 text-white" : "border border-border bg-white text-muted-foreground hover:bg-muted"
          }`}
        >
          All Classes
        </Link>
        {classes.map((c) => (
          <Link
            key={c.id}
            href={`/admin/students/uninstalled?classId=${c.id}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              classId === c.id ? "bg-indigo-600 text-white" : "border border-border bg-white text-muted-foreground hover:bg-muted"
            }`}
          >
            {c.name}
          </Link>
        ))}
      </div>

      <UninstalledStudentTable students={filtered} />
    </div>
  );
}
```

- [ ] **Step 2: Create the client table component**

Create `apps/web/app/(school)/admin/students/uninstalled/uninstalled-table.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface Student {
  id: string;
  full_name: string;
  parent_phone: string;
  roll_number: string;
  class_name: string;
  section_name: string;
}

export function UninstalledStudentTable({ students }: { students: Student[] }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function copyPhone(id: string, phone: string) {
    navigator.clipboard.writeText(phone);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  if (students.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center text-muted-foreground">
        All parents have set up the app.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-muted/50">
          <tr>
            {["Student", "Class", "Section", "Roll No", "Parent Phone", ""].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {students.map((s) => (
            <tr key={s.id} className="hover:bg-muted/30">
              <td className="px-4 py-3 font-medium text-gray-900">{s.full_name}</td>
              <td className="px-4 py-3 text-gray-600">{s.class_name}</td>
              <td className="px-4 py-3 text-gray-600">{s.section_name}</td>
              <td className="px-4 py-3 text-gray-600">{s.roll_number || "—"}</td>
              <td className="px-4 py-3 font-mono text-gray-800">{s.parent_phone}</td>
              <td className="px-4 py-3">
                <button
                  onClick={() => copyPhone(s.id, s.parent_phone)}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
                >
                  {copiedId === s.id ? (
                    <><Check className="h-3 w-3 text-green-600" /> Copied</>
                  ) : (
                    <><Copy className="h-3 w-3" /> Copy Number</>
                  )}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Add a link button to the students page**

Open `apps/web/app/(school)/admin/students/page.tsx`. Find the page header area (where the `<h1>Students</h1>` and bulk actions button live). Add a link next to the bulk actions:

```tsx
import Link from "next/link";
```

Then add, near the top of the return JSX alongside the existing buttons:

```tsx
<Link
  href="/admin/students/uninstalled"
  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-muted-foreground shadow-sm hover:bg-muted"
>
  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700">!</span>
  App Not Installed
</Link>
```

- [ ] **Step 4: Verify**

Go to `/admin/students`. Click "App Not Installed". The page should load showing students with a parent phone but no linked auth account. Clicking a class filter narrows the list. Clicking "Copy Number" copies the phone to clipboard and shows "Copied" briefly.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/\(school\)/admin/students/uninstalled/ \
        apps/web/app/\(school\)/admin/students/page.tsx
git commit -m "feat(students): add app-not-installed student list for admin outreach"
```

---

## Task 4: No Rank for Failed / Absent Students

**Files:**
- Modify: `apps/web/app/(school)/teacher/results/[examId]/rankings/page.tsx`

A student is excluded from ranking if:
- Any subject grade is "F" (they failed), OR
- Their subject count is less than the maximum subject count for any student in this exam (they were absent for at least one subject)

Excluded students appear at the bottom of the table with "—" instead of a rank number.

- [ ] **Step 1: Compute expected subject count and flag fail/absent students**

In `rankings/page.tsx`, replace the aggregation and ranking logic (after the `resultsData` fetch) with:

```typescript
// Aggregate per student
const studentMap: Record<string, {
  name: string;
  totalObtained: number;
  totalMax: number;
  hasFail: boolean;
  subjectCount: number;
  subjects: { subject: string; marks: number; max: number; grade: string }[];
}> = {};

for (const r of resultsData ?? []) {
  const rr = r as any;
  const sid = rr.student_id;
  if (!studentMap[sid]) {
    studentMap[sid] = { name: rr.student_profiles?.full_name ?? "—", totalObtained: 0, totalMax: 0, hasFail: false, subjectCount: 0, subjects: [] };
  }
  studentMap[sid].totalObtained += rr.marks_obtained ?? 0;
  studentMap[sid].totalMax += rr.max_marks ?? 100;
  studentMap[sid].subjectCount += 1;
  if (rr.grade === "F") studentMap[sid].hasFail = true;
  studentMap[sid].subjects.push({
    subject: rr.subjects?.name ?? "—",
    marks: rr.marks_obtained ?? 0,
    max: rr.max_marks ?? 100,
    grade: rr.grade ?? "—",
  });
}

const maxSubjectCount = Math.max(...Object.values(studentMap).map((s) => s.subjectCount), 0);

// Separate eligible (ranked) from excluded (fail/absent)
const eligible = Object.entries(studentMap)
  .filter(([, s]) => !s.hasFail && s.subjectCount >= maxSubjectCount)
  .sort(([, a], [, b]) => b.totalObtained - a.totalObtained);

const excluded = Object.entries(studentMap)
  .filter(([, s]) => s.hasFail || s.subjectCount < maxSubjectCount);

let rank = 1;
const ranked = eligible.map(([, s], i) => {
  if (i > 0 && eligible[i - 1][1].totalObtained > s.totalObtained) rank = i + 1;
  return { ...s, rank: `${MEDAL[rank] ?? `#${rank}`}` };
});

const unranked = excluded.map(([, s]) => ({
  ...s,
  rank: "—",
  rankLabel: s.hasFail ? "Fail" : "Absent",
}));
```

- [ ] **Step 2: Update the table JSX to render both groups**

Replace the `<tbody>` content:

```tsx
<tbody className="divide-y divide-gray-100">
  {ranked.map((r, i) => (
    <tr key={i} className={r.rank.startsWith("🥇") || r.rank.startsWith("🥈") || r.rank.startsWith("🥉") ? "bg-amber-50" : ""}>
      <td className="px-4 py-3 font-bold text-gray-800">{r.rank}</td>
      <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
      <td className="px-4 py-3 text-right font-semibold text-gray-800">
        {r.totalObtained}/{r.totalMax}
      </td>
      <td className="px-4 py-3 text-gray-600">
        {r.subjects.map((s, si) => (
          <span key={si} className="mr-3">{s.subject}: {s.marks}/{s.max} ({s.grade})</span>
        ))}
      </td>
    </tr>
  ))}
  {unranked.map((r, i) => (
    <tr key={`u-${i}`} className="bg-gray-50 opacity-70">
      <td className="px-4 py-3">
        <span className="text-gray-400 font-medium">—</span>
        <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
          r.rankLabel === "Fail" ? "bg-red-100 text-red-700" : "bg-gray-200 text-gray-600"
        }`}>{r.rankLabel}</span>
      </td>
      <td className="px-4 py-3 font-medium text-gray-500">{r.name}</td>
      <td className="px-4 py-3 text-right text-gray-400">{r.totalObtained}/{r.totalMax}</td>
      <td className="px-4 py-3 text-gray-400">
        {r.subjects.map((s, si) => (
          <span key={si} className={`mr-3 ${s.grade === "F" ? "text-red-400" : ""}`}>
            {s.subject}: {s.marks}/{s.max} ({s.grade})
          </span>
        ))}
      </td>
    </tr>
  ))}
  {ranked.length === 0 && unranked.length === 0 && (
    <tr><td colSpan={4} className="p-8 text-center text-gray-400">No results entered for this exam yet.</td></tr>
  )}
</tbody>
```

- [ ] **Step 3: Remove the now-unused old `ranked.length === 0` check** 

The old empty state check `{ranked.length === 0 && ...}` is now embedded in the tbody above. Remove the standalone empty state block that was outside the table if one exists.

- [ ] **Step 4: Verify**

Enter exam results where at least one student has a failing subject (grade F). Open the rankings page. That student should appear at the bottom with "—" rank and a red "Fail" badge. A student with all results entered and all passing should have a normal rank.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/\(school\)/teacher/results/
git commit -m "feat(results): exclude failed and absent students from exam rankings"
```

---

## Task 5: Payment Pie Chart — Web (Student Profile Fees Tab)

**Files:**
- Create: `apps/web/app/(school)/admin/students/[id]/student-fees-pie-chart.tsx`
- Modify: `apps/web/app/(school)/admin/students/[id]/student-fees-client.tsx`

recharts is already installed (used in `admin/dashboard/fee-collection-chart.tsx`).

- [ ] **Step 1: Create student-fees-pie-chart.tsx**

```typescript
"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface Props {
  totalPaid: number;
  outstanding: number;
}

const COLORS = ["#10b981", "#f43f5e"];

export function FeesPieChart({ totalPaid, outstanding }: Props) {
  if (totalPaid === 0 && outstanding === 0) return null;

  const data = [
    { name: "Paid", value: totalPaid },
    { name: "Pending", value: outstanding },
  ].filter((d) => d.value > 0);

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fee Summary</p>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={48}
            outerRadius={72}
            paddingAngle={data.length > 1 ? 3 : 0}
            dataKey="value"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => `₹${value.toLocaleString("en-IN")}`}
          />
          <Legend
            formatter={(value, entry: any) =>
              `${value}: ₹${(entry.payload.value as number).toLocaleString("en-IN")}`
            }
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Import and place the chart in student-fees-client.tsx**

Add import at the top of `student-fees-client.tsx`:

```typescript
import { FeesPieChart } from "./student-fees-pie-chart";
```

In the return JSX, add the chart between the summary cards and the table. After the closing `</div>` of the summary grid and before the table wrapper:

```tsx
<FeesPieChart totalPaid={totalPaid} outstanding={outstanding} />
```

(`totalPaid` and `outstanding` are already computed in that component.)

- [ ] **Step 3: Verify**

Go to any student profile → Fees tab. A donut chart should appear between the summary stats and the fee breakdown table, showing green (Paid) vs red (Pending) segments.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/\(school\)/admin/students/\[id\]/student-fees-pie-chart.tsx \
        apps/web/app/\(school\)/admin/students/\[id\]/student-fees-client.tsx
git commit -m "feat(fees): add paid vs pending pie chart to student profile fees tab"
```

---

## Task 6: Payment Pie Chart — Mobile (Parent Fees Screen)

**Files:**
- Modify: `apps/mobile/app/(parent)/fees.tsx`

`react-native-svg` is bundled with Expo SDK and available without extra install.

- [ ] **Step 1: Add DonutChart component at the top of fees.tsx**

After the imports and before the `ParentFees` function, add:

```typescript
import Svg, { Circle, G, Text as SvgText } from "react-native-svg";

function DonutChart({ paid, total }: { paid: number; total: number }) {
  const size = 120;
  const strokeWidth = 14;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const paidPct = total > 0 ? Math.max(0, Math.min(1, paid / total)) : 0;
  const paidDash = paidPct * circumference;

  return (
    <View style={{ alignItems: "center", marginVertical: 8 }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G rotation="-90" origin={`${size / 2},${size / 2}`}>
          <Circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={strokeWidth}
          />
          {paidDash > 0 && (
            <Circle
              cx={size / 2} cy={size / 2} r={r}
              fill="none" stroke="#fff" strokeWidth={strokeWidth}
              strokeDasharray={`${paidDash} ${circumference}`}
              strokeLinecap="round"
            />
          )}
        </G>
        <SvgText
          x={size / 2} y={size / 2 - 6}
          textAnchor="middle" fill="#fff"
          fontSize="14" fontWeight="700"
        >
          {total > 0 ? `${Math.round(paidPct * 100)}%` : "0%"}
        </SvgText>
        <SvgText
          x={size / 2} y={size / 2 + 12}
          textAnchor="middle" fill="rgba(255,255,255,0.7)"
          fontSize="10"
        >
          paid
        </SvgText>
      </Svg>
    </View>
  );
}
```

- [ ] **Step 2: Place the donut inside the balance card**

In the balance card View (the one with `backgroundColor: theme.primary`), add the DonutChart before the outstanding amount text. Calculate `totalPaid` from `payments`:

First, compute `totalPaid` near where `totalDue` is computed:

```typescript
const totalFeeAmount = payments.reduce((sum, p) => sum + p.amount_due, 0);
const totalPaid = payments.reduce((sum, p) => sum + p.amount_paid, 0);
```

Then inside the balance card (after `<Text>Total Outstanding</Text>`), add:

```tsx
<DonutChart paid={totalPaid} total={totalFeeAmount} />
```

- [ ] **Step 3: Verify**

Run the mobile app and open the Fees screen. The balance card should show the donut chart with a white arc indicating the percentage paid, with the percentage text in the center.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/\(parent\)/fees.tsx
git commit -m "feat(mobile/fees): add paid percentage donut chart to fees balance card"
```

---

## Task 7: Parent Photo Upload — Mobile

**Files:**
- Modify: `apps/mobile/app/(parent)/more.tsx`

`expo-image-picker` is part of Expo and available in the Expo managed workflow.

- [ ] **Step 1: Check expo-image-picker is installed**

```bash
cd apps/mobile && cat package.json | grep image-picker
```

If not present, install it:
```bash
cd apps/mobile && npx expo install expo-image-picker
```

- [ ] **Step 2: Add import and upload handler in more.tsx**

Add at the top with other imports:
```typescript
import * as ImagePicker from "expo-image-picker";
```

Add state for the upload loading indicator (near other useState declarations):
```typescript
const [uploadingPhoto, setUploadingPhoto] = useState(false);
```

Add the `handlePhotoUpload` function (inside `ParentMore`, before the return):

```typescript
async function handlePhotoUpload() {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert("Permission required", "Please allow photo library access in Settings.");
    return;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });
  if (result.canceled) return;

  setUploadingPhoto(true);
  try {
    const uri = result.assets[0].uri;
    const ext = uri.split(".").pop() ?? "jpg";
    const fileName = `${student?.admissionNumber ?? Date.now()}.${ext}`;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: sp } = await supabase
      .from("student_profiles")
      .select("id, school_id")
      .eq("parent_profile_id", user.id)
      .single();
    if (!sp) return;

    const arrayBuffer = await fetch(uri).then((r) => r.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from("student-photos")
      .upload(`${sp.school_id}/${sp.id}/${fileName}`, arrayBuffer, {
        contentType: `image/${ext}`,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from("student-photos")
      .getPublicUrl(`${sp.school_id}/${sp.id}/${fileName}`);

    await supabase
      .from("student_profiles")
      .update({ photo_url: urlData.publicUrl })
      .eq("id", sp.id);

    await loadProfile();
    Alert.alert("Done", "Photo updated successfully.");
  } catch (e: any) {
    Alert.alert("Upload failed", e?.message ?? "Please try again.");
  } finally {
    setUploadingPhoto(false);
  }
}
```

- [ ] **Step 3: Make the student photo tappable in the profile section**

In `more.tsx`, find where the student photo / avatar is rendered in the profile view. Wrap it in a `TouchableOpacity`:

```tsx
<TouchableOpacity onPress={handlePhotoUpload} disabled={uploadingPhoto} activeOpacity={0.8}>
  {student?.photoUrl ? (
    <Image
      source={{ uri: student.photoUrl }}
      style={{ width: 72, height: 72, borderRadius: 36 }}
    />
  ) : (
    <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 26, fontFamily: "Inter_700Bold", color: "#fff" }}>
        {student?.name?.[0]?.toUpperCase() ?? "?"}
      </Text>
    </View>
  )}
  <View style={{ position: "absolute", bottom: 0, right: 0, backgroundColor: theme.surface, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: theme.border }}>
    <Ionicons name={uploadingPhoto ? "hourglass-outline" : "camera-outline"} size={14} color={theme.textSecondary} />
  </View>
</TouchableOpacity>
```

- [ ] **Step 4: Ensure storage bucket exists**

The Supabase storage bucket `student-photos` must exist and be public. Run in Supabase dashboard or create a migration:

Create `supabase/migrations/20240001000025_student_photos_bucket.sql`:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('student-photos', 'student-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "student_photos_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'student-photos');

CREATE POLICY "student_photos_parent_upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'student-photos'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "student_photos_parent_update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'student-photos'
  AND auth.role() = 'authenticated'
);
```

- [ ] **Step 5: Verify**

In the parent app → More → profile section, tap the student photo. The image picker opens. Select a photo. It uploads and the photo updates in the profile view.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/app/\(parent\)/more.tsx \
        supabase/migrations/20240001000025_student_photos_bucket.sql
git commit -m "feat(mobile): parent can tap student photo to upload from gallery"
```

---

## Task 8: Icons — Sidebar Gallery + Mobile More Menu

**Files:**
- Modify: `apps/web/components/sidebar.tsx`
- Modify: `apps/mobile/app/(parent)/more.tsx`

**Web sidebar:** The `ICON_MAP` is already complete for all nav items except "Gallery". Add it.

**Mobile more menu:** Menu items currently show as plain text. Add appropriate Ionicons.

- [ ] **Step 1: Add Gallery icon to web sidebar**

In `apps/web/components/sidebar.tsx`, add `Image` to the lucide-react import:

```typescript
import {
  LayoutDashboard, School, GraduationCap, Users, BookOpen,
  Calendar, ClipboardList, DollarSign, Megaphone, Settings,
  Clock, FileText, MessageSquare, UserCheck,
  Building2, BarChart3, Shield, Upload, LogOut, Image,
} from "lucide-react";
```

Add to `ICON_MAP`:

```typescript
Gallery: Image,
```

- [ ] **Step 2: Add icons to mobile more menu items**

Read the full more.tsx to identify the menu items list (the `section === "menu"` render). Find the main menu items array/render and update each item to include an `ionicons` name. The ListItem component likely accepts an `icon` prop or a `left` render prop. Check what props ListItem accepts:

```bash
cat apps/mobile/components/ListItem.tsx
```

If ListItem accepts a `left` prop or `icon` prop, use it. If it only renders children, wrap the label with an icon inline. The typical pattern for this app:

```tsx
// For each menu item in the "menu" section:
{ label: "Announcements", icon: "megaphone-outline", onPress: () => setSection("announcements") }
{ label: "Discipline", icon: "warning-outline", onPress: () => setSection("discipline") }
{ label: "Feedback to Teacher", icon: "chatbubble-outline", onPress: () => setSection("feedback-teacher") }
{ label: "Feedback to Management", icon: "mail-outline", onPress: () => setSection("feedback-management") }
{ label: "My Profile", icon: "person-circle-outline", onPress: () => setSection("profile") }
```

Update the menu render to include the icon next to the label using `Ionicons`:

```tsx
{[
  { label: "Announcements", icon: "megaphone-outline" as const, section: "announcements" as const },
  { label: "Discipline", icon: "warning-outline" as const, section: "discipline" as const },
  { label: "Feedback to Teacher", icon: "chatbubble-outline" as const, section: "feedback-teacher" as const },
  { label: "Feedback to Management", icon: "mail-outline" as const, section: "feedback-management" as const },
  { label: "My Profile", icon: "person-circle-outline" as const, section: "profile" as const },
].map((item) => (
  <ListItem
    key={item.label}
    label={item.label}
    left={<Ionicons name={item.icon} size={20} color={theme.textSecondary} />}
    onPress={() => setSection(item.section)}
  />
))}
```

If `ListItem` doesn't accept `left` prop, update `ListItem.tsx` to accept an optional `left?: React.ReactNode` prop and render it before the label.

- [ ] **Step 3: Verify web**

Open the admin sidebar. Gallery should now show the image icon (picture frame icon) in the nav.

- [ ] **Step 4: Verify mobile**

Open the parent app → More tab. Each menu item should show an icon on the left side.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/sidebar.tsx \
        apps/mobile/app/\(parent\)/more.tsx \
        apps/mobile/components/ListItem.tsx
git commit -m "feat(ui): add Gallery icon to web sidebar, add Ionicons to mobile more menu"
```

---

## Self-Review

**Spec coverage check:**
- [x] F1 — Feedback tooltip with student photo/name/class/roll + profile link
- [x] F2 — CSV import error detail table showing row number + error message
- [x] F3 — Uninstalled app student list with class filter + copy phone
- [x] F4 — No rank for failed/absent (fail badge + absent badge at bottom of rankings)
- [x] F5 — Pie chart on admin student profile fees tab + mobile fees balance card
- [x] F7 — Parent taps student photo → picks from gallery → uploads to Supabase Storage
- [x] F9 — Gallery icon added to web sidebar; Ionicons added to mobile more menu
- [x] Storage bucket migration included for photo upload

**Gaps fixed:**
- The `student-photos` bucket may already exist (created by admin photo-upload.tsx flow). If so, the migration's `ON CONFLICT DO NOTHING` handles it safely.
- ListItem.tsx may already support a `left` prop — Task 8 step 2 includes reading it first.
