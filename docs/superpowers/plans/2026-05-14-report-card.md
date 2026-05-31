# Report Card — Students

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-generate student report cards from existing exam results data. Show subject-wise marks, percentage, letter grade, attendance percentage, and teacher remarks. Viewable on-screen with a "Download PDF" button per student.

**Architecture:** A new "Report Cards" page under admin that lists students. Clicking a student shows their report card view, aggregated from `exam_results`. A utility function computes grades from percentage. PDF generation uses the browser's print-to-PDF (via `window.print()` with a print-friendly layout) — no server-side PDF library needed for v1.

**Tech Stack:** Next.js server components + client component for PDF, Supabase queries on `exam_results`, `exams`, `subjects`, `attendance_records`

---

### Task 1: Create Grade Utility

**Files:**
- Create: `apps/web/lib/grades.ts`

- [ ] **Step 1: Create the grade utility**

Create `apps/web/lib/grades.ts`:

```tsx
export interface GradeInfo {
  grade: string;
  label: string;
}

const GRADE_SCALE = [
  { min: 91, grade: "A+", label: "Outstanding" },
  { min: 81, grade: "A", label: "Excellent" },
  { min: 71, grade: "B+", label: "Very Good" },
  { min: 61, grade: "B", label: "Good" },
  { min: 51, grade: "C+", label: "Above Average" },
  { min: 41, grade: "C", label: "Average" },
  { min: 33, grade: "D", label: "Below Average" },
  { min: 0, grade: "F", label: "Fail" },
];

export function getGrade(percentage: number): GradeInfo {
  for (const entry of GRADE_SCALE) {
    if (percentage >= entry.min) {
      return { grade: entry.grade, label: entry.label };
    }
  }
  return { grade: "F", label: "Fail" };
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/lib/grades.ts
git commit -m "feat(report-card): add grade utility with default scale"
```

---

### Task 2: Create Report Card List Page (Admin)

**Files:**
- Create: `apps/web/app/(school)/admin/report-cards/page.tsx`

- [ ] **Step 1: Create the report cards listing page**

Create `apps/web/app/(school)/admin/report-cards/page.tsx`:

```tsx
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { PageHeader } from "@/components/page-header";
import { ReportCardTable } from "./report-card-table";

export default async function ReportCardsPage() {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  const [{ data: students }, { data: classes }, { data: exams }] = await Promise.all([
    supabase
      .from("student_profiles")
      .select("id, full_name, roll_number, class:classes(name), section:sections(name)")
      .eq("school_id", schoolId)
      .limit(5000),
    supabase
      .from("classes")
      .select("id, name")
      .eq("school_id", schoolId)
      .order("order"),
    supabase
      .from("exams")
      .select("id, name")
      .eq("school_id", schoolId)
      .order("start_date", { ascending: false }),
  ]);

  const rows = (students ?? []).map((s) => {
    const c = s.class as unknown as { name: string } | null;
    const sec = s.section as unknown as { name: string } | null;
    return {
      id: s.id,
      name: s.full_name ?? "",
      roll: s.roll_number ?? "",
      class_name: c?.name ?? "",
      section: sec?.name ?? "",
    };
  });

  const classOptions = (classes ?? []).map((c) => ({ label: c.name, value: c.name }));
  const examOptions = (exams ?? []).map((e) => ({ label: e.name, value: e.id }));

  return (
    <div>
      <PageHeader
        title="Report Cards"
        description="View and download student report cards."
        stats={[{ label: "Total Students", value: rows.length }]}
      />
      <ReportCardTable rows={rows} classOptions={classOptions} examOptions={examOptions} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/(school)/admin/report-cards/page.tsx
git commit -m "feat(report-card): add admin report cards listing page"
```

---

### Task 3: Create Report Card Table Component

**Files:**
- Create: `apps/web/app/(school)/admin/report-cards/report-card-table.tsx`

- [ ] **Step 1: Create the filterable student table with exam selector and view link**

Create `apps/web/app/(school)/admin/report-cards/report-card-table.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { FilterableDataTable } from "@/components/filterable-data-table";
import { EmptyState } from "@/components/empty-state";
import { NativeSelect } from "@/components/ui/native-select";

interface StudentRow {
  id: string;
  name: string;
  roll: string;
  class_name: string;
  section: string;
}

interface Option {
  label: string;
  value: string;
}

export function ReportCardTable({
  rows,
  classOptions,
  examOptions,
}: {
  rows: StudentRow[];
  classOptions: Option[];
  examOptions: Option[];
}) {
  const [examId, setExamId] = useState(examOptions[0]?.value ?? "");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-muted-foreground">Exam:</label>
        <NativeSelect
          options={examOptions}
          value={examId}
          onChange={(e) => setExamId(e.target.value)}
          placeholder="Select exam"
          className="w-56"
        />
      </div>
      <FilterableDataTable
        data={rows}
        columns={[
          { header: "Name", accessor: "name" },
          { header: "Roll No.", accessor: "roll" },
          { header: "Class", accessor: "class_name" },
          { header: "Section", accessor: "section" },
        ]}
        searchKeys={["name", "roll"]}
        searchPlaceholder="Search by name or roll number..."
        filter={
          classOptions.length > 0
            ? {
                label: "All Classes",
                options: classOptions,
                filterFn: (row: StudentRow, value: string) => row.class_name === value,
              }
            : undefined
        }
        renderActions={(row) => (
          <Link
            href={`/admin/report-cards/${row.id}?examId=${examId}`}
            className="inline-flex items-center gap-1.5 rounded-md bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
          >
            <FileText className="h-3.5 w-3.5" />
            View
          </Link>
        )}
        emptyState={
          <EmptyState
            icon={FileText}
            title="No students found"
            description="Add students to generate report cards."
          />
        }
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/(school)/admin/report-cards/report-card-table.tsx
git commit -m "feat(report-card): add report card table with exam selector"
```

---

### Task 4: Create Individual Report Card View Page

**Files:**
- Create: `apps/web/app/(school)/admin/report-cards/[studentId]/page.tsx`

- [ ] **Step 1: Create the report card detail page**

Create `apps/web/app/(school)/admin/report-cards/[studentId]/page.tsx`:

```tsx
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { getGrade } from "@/lib/grades";
import { ReportCardView } from "./report-card-view";

interface Props {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ examId?: string }>;
}

export default async function ReportCardPage({ params, searchParams }: Props) {
  const { studentId } = await params;
  const { examId } = await searchParams;
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  const [{ data: student }, { data: exam }, { data: results }, { data: school }] = await Promise.all([
    supabase
      .from("student_profiles")
      .select("id, full_name, roll_number, admission_number, photo_url, class:classes(name), section:sections(name)")
      .eq("id", studentId)
      .single(),
    examId
      ? supabase.from("exams").select("id, name, start_date, end_date, academic_year:academic_years(name)").eq("id", examId).single()
      : Promise.resolve({ data: null }),
    examId
      ? supabase
          .from("exam_results")
          .select("subject_id, marks_obtained, max_marks, subject:subjects(name)")
          .eq("exam_id", examId)
          .eq("student_id", studentId)
      : Promise.resolve({ data: [] }),
    supabase.from("schools").select("name, primary_color").eq("id", schoolId).single(),
  ]);

  if (!student) {
    return <p className="p-8 text-muted-foreground">Student not found.</p>;
  }

  // Compute attendance
  const { count: totalDays } = await supabase
    .from("attendance_records")
    .select("*", { count: "exact", head: true })
    .eq("school_id", schoolId)
    .eq("student_id", studentId);

  const { count: presentDays } = await supabase
    .from("attendance_records")
    .select("*", { count: "exact", head: true })
    .eq("school_id", schoolId)
    .eq("student_id", studentId)
    .eq("status", "present");

  const attendancePercent = totalDays ? Math.round(((presentDays ?? 0) / totalDays) * 100) : null;

  // Build subject results
  const subjectResults = (results ?? []).map((r) => {
    const subj = r.subject as unknown as { name: string } | null;
    const obtained = Number(r.marks_obtained ?? 0);
    const max = Number(r.max_marks ?? 100);
    const pct = max > 0 ? (obtained / max) * 100 : 0;
    const gradeInfo = getGrade(pct);
    return {
      subject: subj?.name ?? "—",
      marks_obtained: obtained,
      max_marks: max,
      percentage: Math.round(pct * 10) / 10,
      grade: gradeInfo.grade,
    };
  });

  // Overall
  const totalObtained = subjectResults.reduce((s, r) => s + r.marks_obtained, 0);
  const totalMax = subjectResults.reduce((s, r) => s + r.max_marks, 0);
  const overallPct = totalMax > 0 ? Math.round((totalObtained / totalMax) * 1000) / 10 : 0;
  const overallGrade = getGrade(overallPct);

  const cls = student.class as unknown as { name: string } | null;
  const sec = student.section as unknown as { name: string } | null;
  const ay = exam?.academic_year as unknown as { name: string } | null;

  const reportData = {
    schoolName: school?.name ?? "School",
    schoolColor: school?.primary_color ?? "#4f46e5",
    studentName: student.full_name ?? "—",
    rollNumber: student.roll_number ?? "—",
    admissionNumber: student.admission_number ?? "—",
    className: cls?.name ?? "—",
    section: sec?.name ?? "—",
    examName: exam?.name ?? "—",
    academicYear: ay?.name ?? "—",
    subjects: subjectResults,
    totalObtained,
    totalMax,
    overallPercentage: overallPct,
    overallGrade: overallGrade.grade,
    overallLabel: overallGrade.label,
    attendancePercent,
  };

  return <ReportCardView data={reportData} />;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/(school)/admin/report-cards/[studentId]/page.tsx
git commit -m "feat(report-card): add server-side data aggregation for report card"
```

---

### Task 5: Create Report Card View (Client Component with Print)

**Files:**
- Create: `apps/web/app/(school)/admin/report-cards/[studentId]/report-card-view.tsx`

- [ ] **Step 1: Create the printable report card component**

Create `apps/web/app/(school)/admin/report-cards/[studentId]/report-card-view.tsx`:

```tsx
"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import Link from "next/link";

interface SubjectResult {
  subject: string;
  marks_obtained: number;
  max_marks: number;
  percentage: number;
  grade: string;
}

interface ReportData {
  schoolName: string;
  schoolColor: string;
  studentName: string;
  rollNumber: string;
  admissionNumber: string;
  className: string;
  section: string;
  examName: string;
  academicYear: string;
  subjects: SubjectResult[];
  totalObtained: number;
  totalMax: number;
  overallPercentage: number;
  overallGrade: string;
  overallLabel: string;
  attendancePercent: number | null;
}

export function ReportCardView({ data }: { data: ReportData }) {
  const printRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Report Card - ${data.studentName}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px; color: #1a1a1a; }
            .header { text-align: center; margin-bottom: 32px; border-bottom: 2px solid ${data.schoolColor}; padding-bottom: 16px; }
            .header h1 { font-size: 22px; color: ${data.schoolColor}; margin-bottom: 4px; }
            .header p { font-size: 13px; color: #666; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 24px; font-size: 13px; }
            .info-grid span { color: #666; }
            .info-grid strong { color: #1a1a1a; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
            th { background: #f5f5f5; padding: 10px 12px; text-align: left; font-weight: 600; border: 1px solid #e5e5e5; }
            td { padding: 10px 12px; border: 1px solid #e5e5e5; }
            .total-row { font-weight: 600; background: #fafafa; }
            .summary { display: flex; gap: 24px; margin-bottom: 24px; }
            .summary-card { border: 1px solid #e5e5e5; border-radius: 8px; padding: 16px; text-align: center; flex: 1; }
            .summary-card .value { font-size: 24px; font-weight: 700; color: ${data.schoolColor}; }
            .summary-card .label { font-size: 11px; color: #666; text-transform: uppercase; margin-top: 4px; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          ${content.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <Link href="/admin/report-cards" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Report Cards
        </Link>
        <Button onClick={handlePrint} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Download PDF
        </Button>
      </div>

      <div ref={printRef} className="mx-auto max-w-2xl rounded-xl border border-border bg-white p-8 shadow-sm">
        <div className="header" style={{ textAlign: "center", marginBottom: 32, borderBottom: `2px solid ${data.schoolColor}`, paddingBottom: 16 }}>
          <h1 style={{ fontSize: 22, color: data.schoolColor, marginBottom: 4 }}>{data.schoolName}</h1>
          <p style={{ fontSize: 13, color: "#666" }}>Report Card — {data.examName} ({data.academicYear})</p>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-6 text-sm">
          <p><span className="text-muted-foreground">Student: </span><strong>{data.studentName}</strong></p>
          <p><span className="text-muted-foreground">Roll No: </span><strong>{data.rollNumber}</strong></p>
          <p><span className="text-muted-foreground">Class: </span><strong>{data.className} – {data.section}</strong></p>
          <p><span className="text-muted-foreground">Admission No: </span><strong>{data.admissionNumber}</strong></p>
        </div>

        {data.subjects.length > 0 ? (
          <>
            <table className="w-full border-collapse mb-6 text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="border border-border px-3 py-2.5 text-left font-semibold">Subject</th>
                  <th className="border border-border px-3 py-2.5 text-center font-semibold">Marks</th>
                  <th className="border border-border px-3 py-2.5 text-center font-semibold">Max</th>
                  <th className="border border-border px-3 py-2.5 text-center font-semibold">%</th>
                  <th className="border border-border px-3 py-2.5 text-center font-semibold">Grade</th>
                </tr>
              </thead>
              <tbody>
                {data.subjects.map((s) => (
                  <tr key={s.subject}>
                    <td className="border border-border px-3 py-2.5">{s.subject}</td>
                    <td className="border border-border px-3 py-2.5 text-center">{s.marks_obtained}</td>
                    <td className="border border-border px-3 py-2.5 text-center">{s.max_marks}</td>
                    <td className="border border-border px-3 py-2.5 text-center">{s.percentage}%</td>
                    <td className="border border-border px-3 py-2.5 text-center font-medium">{s.grade}</td>
                  </tr>
                ))}
                <tr className="bg-muted/30 font-semibold">
                  <td className="border border-border px-3 py-2.5">Total</td>
                  <td className="border border-border px-3 py-2.5 text-center">{data.totalObtained}</td>
                  <td className="border border-border px-3 py-2.5 text-center">{data.totalMax}</td>
                  <td className="border border-border px-3 py-2.5 text-center">{data.overallPercentage}%</td>
                  <td className="border border-border px-3 py-2.5 text-center">{data.overallGrade}</td>
                </tr>
              </tbody>
            </table>

            <div className="flex gap-4 mb-6">
              <div className="flex-1 rounded-lg border border-border p-4 text-center">
                <p className="text-2xl font-bold" style={{ color: data.schoolColor }}>{data.overallPercentage}%</p>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mt-1">Percentage</p>
              </div>
              <div className="flex-1 rounded-lg border border-border p-4 text-center">
                <p className="text-2xl font-bold" style={{ color: data.schoolColor }}>{data.overallGrade}</p>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mt-1">{data.overallLabel}</p>
              </div>
              {data.attendancePercent !== null && (
                <div className="flex-1 rounded-lg border border-border p-4 text-center">
                  <p className="text-2xl font-bold" style={{ color: data.schoolColor }}>{data.attendancePercent}%</p>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mt-1">Attendance</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">No exam results found for this student.</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/(school)/admin/report-cards/[studentId]/report-card-view.tsx
git commit -m "feat(report-card): add printable report card view with PDF download"
```

---

### Task 6: Add Report Cards to Admin Navigation

**Files:**
- Modify: `apps/web/app/(school)/layout.tsx`

- [ ] **Step 1: Add Report Cards nav item to admin sidebar**

In `apps/web/app/(school)/layout.tsx`, add to the `school_admin` nav items array, after "Reports":

```tsx
{ label: "Reports",        href: "/admin/reports" },
{ label: "Report Cards",   href: "/admin/report-cards" },
```

- [ ] **Step 2: Add icon mapping**

In `apps/web/components/sidebar.tsx`, add to the ICON_MAP:

```tsx
import { ..., FileText, ... } from "lucide-react";

// In ICON_MAP:
"Report Cards": FileText,
```

Note: `FileText` is already imported in the sidebar. Just add the mapping entry.

- [ ] **Step 3: Verify in browser**

Navigate to admin sidebar — "Report Cards" should appear. Click it to see the student list. Click "View" on a student to see their report card. Click "Download PDF" to print.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/(school)/layout.tsx apps/web/components/sidebar.tsx
git commit -m "feat(report-card): add Report Cards to admin navigation"
```
