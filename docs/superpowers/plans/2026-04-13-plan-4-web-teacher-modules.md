# Plan 4: Web Portal — Teacher + All Core Modules

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Teacher web portal with all module screens: Attendance, Homework, Results/Exam Marks, Discipline, and Feedback.

**Architecture:** Teacher portal lives at `/teacher/*`. Attendance uses a two-step UI (select class+section+date → mark students). Results uses a table entry UI per exam+subject. All mutations are client components calling Supabase directly. Data loading is server components.

**Tech Stack:** Next.js 14 App Router, shadcn/ui, Tailwind CSS, `@supabase/ssr`, Zod

**Prerequisites:** Plan 1 + Plan 2 + Plan 3 complete.

---

## File Map

```
apps/web/app/(school)/teacher/
├── layout.tsx                         # teacher sidebar + guard
├── dashboard/
│   └── page.tsx                       # today's timetable + pending tasks
├── attendance/
│   ├── page.tsx                       # step 1: select class, section, date
│   └── mark/
│       └── page.tsx                   # step 2: mark students
├── homework/
│   ├── page.tsx                       # list homework + create form
│   └── create-homework-form.tsx
├── results/
│   ├── page.tsx                       # select exam + subject
│   └── [examId]/
│       └── page.tsx                   # enter marks per student
├── discipline/
│   ├── page.tsx                       # list + create discipline record
│   └── create-discipline-form.tsx
└── feedback/
    └── page.tsx                       # list parent feedback + respond
```

---

## Task 1: Teacher Layout + Dashboard

**Files:**
- Create: `apps/web/app/(school)/teacher/layout.tsx`
- Create: `apps/web/app/(school)/teacher/dashboard/page.tsx`

- [ ] **Step 1: Create `apps/web/app/(school)/teacher/layout.tsx`**

```tsx
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@erp/shared/supabase/server";
import { Sidebar } from "@/components/sidebar";
import { ContextSwitchBanner } from "@/components/context-switch-banner";

const NAV = [
  { label: "Dashboard", href: "/teacher/dashboard" },
  { label: "Attendance", href: "/teacher/attendance" },
  { label: "Homework", href: "/teacher/homework" },
  { label: "Results", href: "/teacher/results" },
  { label: "Discipline", href: "/teacher/discipline" },
  { label: "Feedback", href: "/teacher/feedback" },
];

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  // Teacher portal: accessible by teacher, principal, school_admin, or super_admin (context switch)
  const allowed = ["teacher", "principal", "school_admin", "super_admin"];
  if (!roleRow || !allowed.includes(roleRow.role)) redirect("/login");

  return (
    <div className="flex h-screen flex-col">
      <ContextSwitchBanner />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar title="Teacher" items={NAV} />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-8">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `apps/web/app/(school)/teacher/dashboard/page.tsx`**

```tsx
import { createServerSupabaseClient } from "@erp/shared/supabase/server";

const DAYS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default async function TeacherDashboard() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id, full_name")
    .eq("id", user!.id)
    .single();

  const today = new Date().getDay() || 7; // 1=Mon...7=Sun

  const { data: schedule } = await supabase
    .from("timetable")
    .select("period, subject:subjects(name), section:sections(name)")
    .eq("school_id", profile!.school_id!)
    .eq("teacher_id", user!.id)
    .eq("day_of_week", today)
    .order("period");

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">
        Good morning, {profile?.full_name ?? "Teacher"}
      </h1>
      <p className="mb-6 text-sm text-gray-500">{DAYS[today]}'s schedule</p>

      {!schedule || schedule.length === 0 ? (
        <p className="text-sm text-gray-400">No classes scheduled today.</p>
      ) : (
        <div className="space-y-2">
          {schedule.map((s) => (
            <div
              key={s.period}
              className="flex items-center gap-4 rounded-lg bg-white p-4 shadow-sm"
            >
              <span className="w-8 text-center text-sm font-medium text-gray-400">
                P{s.period}
              </span>
              <span className="font-medium text-gray-800">
                {(s.subject as { name: string } | null)?.name ?? "—"}
              </span>
              <span className="text-sm text-gray-500">
                Section {(s.section as { name: string } | null)?.name ?? "—"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(school\)/teacher
git commit -m "feat: teacher layout and dashboard"
```

---

## Task 2: Attendance — Select + Mark

**Files:**
- Create: `apps/web/app/(school)/teacher/attendance/page.tsx`
- Create: `apps/web/app/(school)/teacher/attendance/mark/page.tsx`

- [ ] **Step 1: Create `apps/web/app/(school)/teacher/attendance/page.tsx`**

```tsx
import { createServerSupabaseClient } from "@erp/shared/supabase/server";
import { AttendancePicker } from "./attendance-picker";

export default async function AttendancePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("school_id").eq("id", user!.id).single();

  const { data: sections } = await supabase
    .from("timetable")
    .select("section_id, section:sections(id, name, class:classes(name))")
    .eq("school_id", profile!.school_id!)
    .eq("teacher_id", user!.id);

  // Deduplicate sections
  const uniqueSections = Array.from(
    new Map(
      (sections ?? []).map((s) => [
        s.section_id,
        {
          id: s.section_id,
          name: (s.section as { id: string; name: string; class: { name: string } } | null)?.name ?? "",
          className: (s.section as { id: string; name: string; class: { name: string } } | null)?.class?.name ?? "",
        },
      ])
    ).values()
  );

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Attendance</h1>
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <AttendancePicker sections={uniqueSections} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `apps/web/app/(school)/teacher/attendance/attendance-picker.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface Section { id: string; name: string; className: string }

export function AttendancePicker({ sections }: { sections: Section[] }) {
  const router = useRouter();
  const [sectionId, setSectionId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  function proceed() {
    router.push(`/teacher/attendance/mark?sectionId=${sectionId}&date=${date}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div>
        <Label>Section</Label>
        <Select onValueChange={setSectionId} value={sectionId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select section" />
          </SelectTrigger>
          <SelectContent>
            {sections.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.className} — {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Date</Label>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <Button onClick={proceed} disabled={!sectionId}>
        Mark Attendance
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Create `apps/web/app/(school)/teacher/attendance/mark/page.tsx`**

```tsx
import { createServerSupabaseClient } from "@erp/shared/supabase/server";
import { AttendanceMarkForm } from "./attendance-mark-form";

export default async function MarkAttendancePage({
  searchParams,
}: {
  searchParams: { sectionId?: string; date?: string };
}) {
  const { sectionId, date } = searchParams;

  if (!sectionId || !date) {
    return <p className="text-sm text-red-500">Missing section or date.</p>;
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("school_id").eq("id", user!.id).single();

  const { data: students } = await supabase
    .from("student_profiles")
    .select("id, profile_id, profile:profiles(full_name)")
    .eq("section_id", sectionId)
    .eq("school_id", profile!.school_id!);

  const { data: existing } = await supabase
    .from("attendance_records")
    .select("student_id, status")
    .eq("section_id", sectionId)
    .eq("date", date)
    .eq("school_id", profile!.school_id!);

  const existingMap = new Map(
    (existing ?? []).map((r) => [r.student_id, r.status])
  );

  const studentRows = (students ?? []).map((s) => ({
    profileId: s.profile_id,
    name: (s.profile as { full_name: string } | null)?.full_name ?? "",
    status: existingMap.get(s.profile_id) ?? "present",
  }));

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Mark Attendance</h1>
      <p className="mb-6 text-sm text-gray-500">Date: {date}</p>
      <AttendanceMarkForm
        students={studentRows}
        sectionId={sectionId}
        date={date}
        schoolId={profile!.school_id!}
        markedBy={user!.id}
      />
    </div>
  );
}
```

- [ ] **Step 4: Create `apps/web/app/(school)/teacher/attendance/mark/attendance-mark-form.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@erp/shared/supabase/client";
import { Button } from "@/components/ui/button";

type AttendanceStatus = "present" | "absent" | "late" | "half_day";

interface Student {
  profileId: string;
  name: string;
  status: string;
}

const STATUS_OPTIONS: AttendanceStatus[] = ["present", "absent", "late", "half_day"];
const STATUS_COLORS: Record<AttendanceStatus, string> = {
  present: "bg-green-100 text-green-700 border-green-300",
  absent: "bg-red-100 text-red-700 border-red-300",
  late: "bg-yellow-100 text-yellow-700 border-yellow-300",
  half_day: "bg-orange-100 text-orange-700 border-orange-300",
};

export function AttendanceMarkForm({
  students,
  sectionId,
  date,
  schoolId,
  markedBy,
}: {
  students: Student[];
  sectionId: string;
  date: string;
  schoolId: string;
  markedBy: string;
}) {
  const router = useRouter();
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>(
    Object.fromEntries(students.map((s) => [s.profileId, s.status as AttendanceStatus]))
  );
  const [loading, setLoading] = useState(false);

  function markAll(status: AttendanceStatus) {
    setStatuses(Object.fromEntries(students.map((s) => [s.profileId, status])));
  }

  async function handleSave() {
    setLoading(true);
    const supabase = createClient();

    const records = students.map((s) => ({
      school_id: schoolId,
      student_id: s.profileId,
      section_id: sectionId,
      date,
      status: statuses[s.profileId],
      marked_by: markedBy,
    }));

    await supabase
      .from("attendance_records")
      .upsert(records, { onConflict: "student_id,date" });

    setLoading(false);
    router.push("/teacher/attendance");
  }

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <Button variant="outline" size="sm" onClick={() => markAll("present")}>
          All Present
        </Button>
        <Button variant="outline" size="sm" onClick={() => markAll("absent")}>
          All Absent
        </Button>
      </div>

      <div className="space-y-2">
        {students.map((s) => (
          <div
            key={s.profileId}
            className="flex items-center justify-between rounded-lg bg-white px-4 py-3 shadow-sm"
          >
            <span className="text-sm font-medium text-gray-800">{s.name}</span>
            <div className="flex gap-1">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() =>
                    setStatuses((prev) => ({ ...prev, [s.profileId]: opt }))
                  }
                  className={`rounded border px-2 py-1 text-xs font-medium transition-colors ${
                    statuses[s.profileId] === opt
                      ? STATUS_COLORS[opt]
                      : "border-gray-200 text-gray-400 hover:bg-gray-50"
                  }`}
                >
                  {opt === "half_day" ? "Half" : opt.charAt(0).toUpperCase() + opt.slice(1)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <Button onClick={handleSave} disabled={loading || students.length === 0}>
          {loading ? "Saving…" : "Save Attendance"}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/\(school\)/teacher/attendance
git commit -m "feat: teacher attendance — section picker and student mark form"
```

---

## Task 3: Homework

**Files:**
- Create: `apps/web/app/(school)/teacher/homework/page.tsx`
- Create: `apps/web/app/(school)/teacher/homework/create-homework-form.tsx`

- [ ] **Step 1: Create `apps/web/app/(school)/teacher/homework/page.tsx`**

```tsx
import { createServerSupabaseClient } from "@erp/shared/supabase/server";
import { DataTable } from "@/components/data-table";
import { CreateHomeworkForm } from "./create-homework-form";

export default async function HomeworkPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("school_id").eq("id", user!.id).single();
  const schoolId = profile!.school_id!;

  const [{ data: homework }, { data: classes }] = await Promise.all([
    supabase
      .from("homework")
      .select("id, title, due_date, subject:subjects(name), section:sections(name)")
      .eq("teacher_id", user!.id)
      .eq("school_id", schoolId)
      .order("due_date", { ascending: false }),
    supabase.from("classes").select("id, name").eq("school_id", schoolId).order("order"),
  ]);

  const rows = (homework ?? []).map((h) => ({
    id: h.id,
    title: h.title,
    subject: (h.subject as { name: string } | null)?.name ?? "",
    section: (h.section as { name: string } | null)?.name ?? "",
    due_date: h.due_date,
  }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Homework</h1>
      <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
        <CreateHomeworkForm schoolId={schoolId} teacherId={user!.id} classes={classes ?? []} />
      </div>
      <DataTable
        data={rows}
        columns={[
          { header: "Title", accessor: "title" },
          { header: "Subject", accessor: "subject" },
          { header: "Section", accessor: "section" },
          { header: "Due Date", accessor: "due_date" },
        ]}
        emptyMessage="No homework assigned yet."
      />
    </div>
  );
}
```

- [ ] **Step 2: Create `apps/web/app/(school)/teacher/homework/create-homework-form.tsx`**

```tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@erp/shared/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Option { id: string; name: string }

export function CreateHomeworkForm({
  schoolId,
  teacherId,
  classes,
}: {
  schoolId: string;
  teacherId: string;
  classes: Option[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [sections, setSections] = useState<Option[]>([]);
  const [subjects, setSubjects] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!classId) return;
    const supabase = createClient();
    Promise.all([
      supabase.from("sections").select("id, name").eq("class_id", classId),
      supabase.from("subjects").select("id, name").eq("class_id", classId).eq("school_id", schoolId),
    ]).then(([{ data: s }, { data: sub }]) => {
      setSections(s ?? []);
      setSubjects(sub ?? []);
      setSectionId("");
      setSubjectId("");
    });
  }, [classId, schoolId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    await supabase.from("homework").insert({
      school_id: schoolId,
      teacher_id: teacherId,
      class_id: classId,
      section_id: sectionId,
      subject_id: subjectId,
      title,
      description,
      due_date: dueDate,
    });
    setTitle(""); setDescription(""); setDueDate(""); setClassId(""); setSectionId(""); setSubjectId("");
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
      <div className="col-span-2">
        <Label>Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className="col-span-2">
        <Label>Description</Label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div>
        <Label>Class</Label>
        <Select onValueChange={setClassId} value={classId}>
          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label>Section</Label>
        <Select onValueChange={setSectionId} value={sectionId} disabled={!classId}>
          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>{sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label>Subject</Label>
        <Select onValueChange={setSubjectId} value={subjectId} disabled={!classId}>
          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label>Due Date</Label>
        <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
      </div>
      <div className="col-span-2">
        <Button type="submit" disabled={loading || !sectionId || !subjectId}>
          {loading ? "Assigning…" : "Assign Homework"}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(school\)/teacher/homework
git commit -m "feat: teacher homework — list and create form"
```

---

## Task 4: Exam Results Entry

**Files:**
- Create: `apps/web/app/(school)/teacher/results/page.tsx`
- Create: `apps/web/app/(school)/teacher/results/[examId]/page.tsx`

- [ ] **Step 1: Create `apps/web/app/(school)/teacher/results/page.tsx`**

```tsx
import { createServerSupabaseClient } from "@erp/shared/supabase/server";
import Link from "next/link";
import { DataTable } from "@/components/data-table";

export default async function ResultsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("school_id").eq("id", user!.id).single();

  const { data: exams } = await supabase
    .from("exams")
    .select("id, name, start_date, end_date")
    .eq("school_id", profile!.school_id!)
    .order("start_date", { ascending: false });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Results</h1>
      <DataTable
        data={exams ?? []}
        columns={[
          { header: "Exam", accessor: "name" },
          { header: "Start", accessor: (row) => row.start_date ?? "—" },
          { header: "End", accessor: (row) => row.end_date ?? "—" },
          {
            header: "",
            accessor: (row) => (
              <Link
                href={`/teacher/results/${row.id}`}
                className="text-sm text-blue-600 hover:underline"
              >
                Enter Marks
              </Link>
            ),
          },
        ]}
        emptyMessage="No exams defined. Ask school admin to create exams."
      />
    </div>
  );
}
```

- [ ] **Step 2: Create `apps/web/app/(school)/teacher/results/[examId]/page.tsx`**

```tsx
import { createServerSupabaseClient } from "@erp/shared/supabase/server";
import { MarksEntryForm } from "./marks-entry-form";
import { notFound } from "next/navigation";

export default async function EnterMarksPage({
  params,
}: {
  params: { examId: string };
}) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("school_id").eq("id", user!.id).single();
  const schoolId = profile!.school_id!;

  const { data: exam } = await supabase
    .from("exams")
    .select("id, name")
    .eq("id", params.examId)
    .single();

  if (!exam) notFound();

  const [{ data: subjects }, { data: students }] = await Promise.all([
    supabase.from("subjects").select("id, name").eq("school_id", schoolId),
    supabase
      .from("student_profiles")
      .select("profile_id, profile:profiles(full_name)")
      .eq("school_id", schoolId),
  ]);

  const { data: existingResults } = await supabase
    .from("exam_results")
    .select("student_id, subject_id, marks_obtained, max_marks")
    .eq("exam_id", params.examId)
    .eq("school_id", schoolId);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">{exam.name} — Enter Marks</h1>
      <MarksEntryForm
        examId={params.examId}
        schoolId={schoolId}
        teacherId={user!.id}
        subjects={subjects ?? []}
        students={(students ?? []).map((s) => ({
          profileId: s.profile_id,
          name: (s.profile as { full_name: string } | null)?.full_name ?? "",
        }))}
        existingResults={existingResults ?? []}
      />
    </div>
  );
}
```

- [ ] **Step 3: Create `apps/web/app/(school)/teacher/results/[examId]/marks-entry-form.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@erp/shared/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Subject { id: string; name: string }
interface Student { profileId: string; name: string }
interface ExistingResult { student_id: string; subject_id: string; marks_obtained: number | null; max_marks: number }

export function MarksEntryForm({
  examId,
  schoolId,
  teacherId,
  subjects,
  students,
  existingResults,
}: {
  examId: string;
  schoolId: string;
  teacherId: string;
  subjects: Subject[];
  students: Student[];
  existingResults: ExistingResult[];
}) {
  const router = useRouter();
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [maxMarks, setMaxMarks] = useState(100);
  const [marks, setMarks] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    existingResults.forEach((r) => {
      map[`${r.student_id}-${r.subject_id}`] = r.marks_obtained?.toString() ?? "";
    });
    return map;
  });
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    const supabase = createClient();

    const records = students
      .filter((s) => marks[`${s.profileId}-${subjectId}`] !== undefined)
      .map((s) => ({
        school_id: schoolId,
        exam_id: examId,
        student_id: s.profileId,
        subject_id: subjectId,
        marks_obtained: parseFloat(marks[`${s.profileId}-${subjectId}`] ?? "0"),
        max_marks: maxMarks,
        teacher_id: teacherId,
      }));

    await supabase
      .from("exam_results")
      .upsert(records, { onConflict: "exam_id,student_id,subject_id" });

    setLoading(false);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div>
          <Label>Subject</Label>
          <Select onValueChange={setSubjectId} value={subjectId}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Select subject" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Max Marks</Label>
          <Input
            type="number"
            value={maxMarks}
            onChange={(e) => setMaxMarks(Number(e.target.value))}
            className="w-24"
          />
        </div>
      </div>

      <div className="space-y-2">
        {students.map((s) => (
          <div
            key={s.profileId}
            className="flex items-center justify-between rounded-lg bg-white px-4 py-3 shadow-sm"
          >
            <span className="text-sm font-medium text-gray-800">{s.name}</span>
            <Input
              type="number"
              min={0}
              max={maxMarks}
              value={marks[`${s.profileId}-${subjectId}`] ?? ""}
              onChange={(e) =>
                setMarks((prev) => ({
                  ...prev,
                  [`${s.profileId}-${subjectId}`]: e.target.value,
                }))
              }
              className="w-24"
              placeholder="—"
            />
          </div>
        ))}
      </div>

      <div className="mt-6">
        <Button onClick={handleSave} disabled={loading || !subjectId || students.length === 0}>
          {loading ? "Saving…" : "Save Marks"}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/\(school\)/teacher/results
git commit -m "feat: teacher results — exam list and marks entry form"
```

---

## Task 5: Discipline + Feedback

**Files:**
- Create: `apps/web/app/(school)/teacher/discipline/page.tsx`
- Create: `apps/web/app/(school)/teacher/discipline/create-discipline-form.tsx`
- Create: `apps/web/app/(school)/teacher/feedback/page.tsx`

- [ ] **Step 1: Create `apps/web/app/(school)/teacher/discipline/page.tsx`**

```tsx
import { createServerSupabaseClient } from "@erp/shared/supabase/server";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { CreateDisciplineForm } from "./create-discipline-form";

export default async function TeacherDisciplinePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("school_id").eq("id", user!.id).single();
  const schoolId = profile!.school_id!;

  const [{ data: records }, { data: students }] = await Promise.all([
    supabase
      .from("discipline_records")
      .select("id, category, severity, description, created_at, student:profiles(full_name)")
      .eq("recorded_by", user!.id)
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false }),
    supabase
      .from("student_profiles")
      .select("profile_id, profile:profiles(full_name)")
      .eq("school_id", schoolId),
  ]);

  const rows = (records ?? []).map((r) => ({
    id: r.id,
    student: (r.student as { full_name: string } | null)?.full_name ?? "",
    category: r.category,
    severity: r.severity,
    description: r.description,
    date: new Date(r.created_at).toLocaleDateString(),
  }));

  const studentOptions = (students ?? []).map((s) => ({
    id: s.profile_id,
    name: (s.profile as { full_name: string } | null)?.full_name ?? "",
  }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Discipline</h1>
      <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
        <CreateDisciplineForm schoolId={schoolId} recordedBy={user!.id} students={studentOptions} />
      </div>
      <DataTable
        data={rows}
        columns={[
          { header: "Student", accessor: "student" },
          { header: "Category", accessor: "category" },
          {
            header: "Severity",
            accessor: (row) => (
              <Badge variant={row.severity === "suspension" ? "destructive" : "secondary"}>
                {row.severity}
              </Badge>
            ),
          },
          { header: "Description", accessor: "description" },
          { header: "Date", accessor: "date" },
        ]}
        emptyMessage="No records yet."
      />
    </div>
  );
}
```

- [ ] **Step 2: Create `apps/web/app/(school)/teacher/discipline/create-discipline-form.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@erp/shared/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Student { id: string; name: string }

export function CreateDisciplineForm({
  schoolId,
  recordedBy,
  students,
}: {
  schoolId: string;
  recordedBy: string;
  students: Student[];
}) {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [category, setCategory] = useState("");
  const [severity, setSeverity] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    await supabase.from("discipline_records").insert({
      school_id: schoolId,
      student_id: studentId,
      category,
      severity,
      description,
      recorded_by: recordedBy,
    });
    setStudentId(""); setCategory(""); setSeverity(""); setDescription("");
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
      <div>
        <Label>Student</Label>
        <Select onValueChange={setStudentId} value={studentId}>
          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            {students.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Category</Label>
        <Select onValueChange={setCategory} value={category}>
          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="behavioral">Behavioral</SelectItem>
            <SelectItem value="academic">Academic</SelectItem>
            <SelectItem value="attendance">Attendance</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Severity</Label>
        <Select onValueChange={setSeverity} value={severity}>
          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="verbal">Verbal</SelectItem>
            <SelectItem value="written">Written</SelectItem>
            <SelectItem value="suspension">Suspension</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-2">
        <Label>Description</Label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} required />
      </div>
      <div className="col-span-2">
        <Button type="submit" disabled={loading || !studentId || !category || !severity}>
          {loading ? "Saving…" : "Record Incident"}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Create `apps/web/app/(school)/teacher/feedback/page.tsx`**

```tsx
import { createServerSupabaseClient } from "@erp/shared/supabase/server";
import { FeedbackList } from "./feedback-list";

export default async function TeacherFeedbackPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("school_id").eq("id", user!.id).single();

  const { data: feedback } = await supabase
    .from("feedback")
    .select("id, subject, message, response, status, created_at, from:profiles(full_name)")
    .eq("school_id", profile!.school_id!)
    .eq("to_role", "teacher")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Parent Feedback</h1>
      <FeedbackList items={feedback ?? []} />
    </div>
  );
}
```

- [ ] **Step 4: Create `apps/web/app/(school)/teacher/feedback/feedback-list.tsx`**

```tsx
"use client";

import { useState } from "react";
import { createClient } from "@erp/shared/supabase/client";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface FeedbackItem {
  id: string;
  subject: string;
  message: string;
  response: string | null;
  status: string;
  created_at: string;
  from: { full_name: string } | null;
}

export function FeedbackList({ items }: { items: FeedbackItem[] }) {
  const router = useRouter();
  const [responding, setResponding] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitResponse(id: string) {
    setLoading(true);
    const supabase = createClient();
    await supabase
      .from("feedback")
      .update({ response: responseText, status: "responded" })
      .eq("id", id);
    setResponding(null);
    setResponseText("");
    setLoading(false);
    router.refresh();
  }

  if (items.length === 0) {
    return <p className="text-sm text-gray-400">No feedback yet.</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="rounded-lg bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-start justify-between">
            <div>
              <p className="font-medium text-gray-800">{item.subject}</p>
              <p className="text-xs text-gray-400">
                From: {item.from?.full_name ?? "Unknown"} · {new Date(item.created_at).toLocaleDateString()}
              </p>
            </div>
            <Badge variant={item.status === "open" ? "destructive" : "secondary"}>
              {item.status}
            </Badge>
          </div>
          <p className="mb-2 text-sm text-gray-600">{item.message}</p>
          {item.response && (
            <p className="mb-2 rounded bg-green-50 px-3 py-2 text-sm text-green-700">
              Your response: {item.response}
            </p>
          )}
          {item.status === "open" && responding !== item.id && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setResponding(item.id)}
            >
              Respond
            </Button>
          )}
          {responding === item.id && (
            <div className="mt-2 flex gap-2">
              <textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                rows={2}
                className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="Type your response…"
              />
              <Button
                size="sm"
                onClick={() => submitResponse(item.id)}
                disabled={loading || !responseText}
              >
                Send
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Type-check**

```bash
pnpm --filter @erp/web type-check
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/\(school\)/teacher
git commit -m "feat: teacher discipline and feedback portal"
```

---

## Verification Checklist

Before declaring Plan 4 complete, confirm all of the following:

- [ ] `pnpm type-check` passes with 0 errors
- [ ] Teacher dashboard shows today's timetable (or "no classes" message)
- [ ] Attendance: can select section + date, see student list, mark statuses, save (upserts correctly)
- [ ] Homework: can create homework with class/section/subject; appears in list
- [ ] Results: can select exam, see students, enter marks, save (upserts on re-entry)
- [ ] Discipline: can record an incident; shows in list
- [ ] Feedback: parent feedback visible; can respond and status updates to "responded"
- [ ] Unauthorized users cannot access `/teacher/*` routes
