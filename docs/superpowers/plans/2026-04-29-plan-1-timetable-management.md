# Plan 1: Timetable Management + Seed Data

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an admin timetable management page (assign teachers to sections/subjects/periods) and seed realistic timetable data for 5 demo teachers, so the section switcher (Plan 2) has data to work with.

**Architecture:** New admin page at `/admin/timetable` with a cascading assignment form (teacher → class → section → subject → day → period) and a filterable table of current assignments. Follows the existing admin CRUD pattern (server component page + client form + client table). Seed data adds ~80 timetable rows for 5 teachers across multiple sections.

**Tech Stack:** Next.js 16 App Router, Supabase JS client, TypeScript, existing UI components (NativeSelect, FilterableDataTable, Button, Label, Input).

**Spec:** `docs/superpowers/specs/2026-04-29-section-scoped-portal-design.md` — "Timetable Management" section.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `apps/web/app/(school)/admin/timetable/page.tsx` | Server component: queries teachers, classes, sections, subjects, timetable entries. Passes to client components. |
| Create | `apps/web/app/(school)/admin/timetable/timetable-form.tsx` | Client component: cascading assignment form. Inserts into `timetable` table. |
| Create | `apps/web/app/(school)/admin/timetable/timetable-table.tsx` | Client component: filterable table of current assignments with delete action. |
| Create | `apps/web/app/(school)/admin/timetable/loading.tsx` | Loading skeleton. |
| Modify | `apps/web/app/(school)/layout.tsx` | Add "Timetable" nav item to `school_admin` array. |
| Modify | `supabase/seed.sql` | Append timetable seed data (~80 rows). |

---

## Task 1: Add "Timetable" to Admin Sidebar Nav

**Files:**
- Modify: `apps/web/app/(school)/layout.tsx`

- [ ] **Step 1: Add the nav item**

In the `NAV_ITEMS` object, add `Timetable` to the `school_admin` array between "Subjects" and "Academics":

```typescript
school_admin: [
    { label: "Dashboard",      href: "/admin/dashboard" },
    { label: "Teachers",       href: "/admin/teachers" },
    { label: "Students",       href: "/admin/students" },
    { label: "Classes",        href: "/admin/classes" },
    { label: "Subjects",       href: "/admin/subjects" },
    { label: "Timetable",      href: "/admin/timetable" },
    { label: "Academics",      href: "/admin/academics" },
    { label: "Fees",           href: "/admin/fees" },
    { label: "Syllabus",       href: "/admin/syllabus" },
    { label: "Announcements",  href: "/admin/announcements" },
    { label: "Settings",       href: "/admin/settings" },
  ],
```

- [ ] **Step 2: Type-check**

```bash
cd "/Users/dineshlearning/Documents/make money/erp/apps/web" && pnpm type-check
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
cd "/Users/dineshlearning/Documents/make money/erp"
git add "apps/web/app/(school)/layout.tsx"
git commit -m "nav: add Timetable to admin sidebar"
```

---

## Task 2: Timetable Page — Server Component

**Files:**
- Create: `apps/web/app/(school)/admin/timetable/page.tsx`
- Create: `apps/web/app/(school)/admin/timetable/loading.tsx`

- [ ] **Step 1: Create the loading skeleton**

```tsx
// apps/web/app/(school)/admin/timetable/loading.tsx
export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 rounded bg-skeleton animate-pulse" />
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-16 rounded bg-skeleton animate-pulse" />
              <div className="h-9 w-full rounded bg-skeleton animate-pulse" />
            </div>
          ))}
        </div>
      </div>
      <div className="h-64 rounded-lg border border-border bg-card animate-pulse" />
    </div>
  );
}
```

- [ ] **Step 2: Create the server page**

This page queries all data needed for the form dropdowns and the assignments table, then renders the client components (created in Tasks 3 and 4).

```tsx
// apps/web/app/(school)/admin/timetable/page.tsx
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { TimetableForm } from "./timetable-form";
import { TimetableTable } from "./timetable-table";

const DAY_NAMES: Record<number, string> = {
  1: "Monday", 2: "Tuesday", 3: "Wednesday",
  4: "Thursday", 5: "Friday", 6: "Saturday",
};

export default async function TimetablePage() {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  const [
    { data: teachers },
    { data: classes },
    { data: sections },
    { data: subjects },
    { data: entries },
  ] = await Promise.all([
    supabase
      .from("teacher_profiles")
      .select("profile_id, profile:profiles(full_name)")
      .eq("school_id", schoolId),
    supabase
      .from("classes")
      .select("id, name, order")
      .eq("school_id", schoolId)
      .order("order"),
    supabase
      .from("sections")
      .select("id, name, class_id")
      .eq("school_id", schoolId),
    supabase
      .from("subjects")
      .select("id, name, class_id")
      .eq("school_id", schoolId),
    supabase
      .from("timetable")
      .select("id, day_of_week, period, teacher:profiles!timetable_teacher_id_fkey(full_name), section:sections(name, class:classes(name, order)), subject:subjects(name)")
      .eq("school_id", schoolId)
      .order("day_of_week")
      .order("period"),
  ]);

  const teacherOptions = (teachers ?? []).map((t) => {
    const p = t.profile as unknown as { full_name: string } | null;
    return { value: t.profile_id, label: p?.full_name ?? "Unknown" };
  });

  const classOptions = (classes ?? []).map((c) => ({
    value: c.id, label: c.name, order: c.order as number,
  }));

  const sectionOptions = (sections ?? []).map((s) => ({
    value: s.id, label: s.name, classId: s.class_id as string,
  }));

  const subjectOptions = (subjects ?? []).map((s) => ({
    value: s.id, label: s.name, classId: s.class_id as string,
  }));

  const tableRows = (entries ?? []).map((e) => {
    const teacher = e.teacher as unknown as { full_name: string } | null;
    const section = e.section as unknown as { name: string; class: { name: string; order: number } | null } | null;
    const subject = e.subject as unknown as { name: string } | null;
    return {
      id: e.id,
      teacher: teacher?.full_name ?? "—",
      class: section?.class?.name ?? "—",
      classOrder: section?.class?.order ?? 0,
      section: section?.name ?? "—",
      subject: subject?.name ?? "—",
      day: DAY_NAMES[e.day_of_week] ?? `Day ${e.day_of_week}`,
      dayOfWeek: e.day_of_week,
      period: e.period,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Timetable</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Assign teachers to class sections, subjects, and periods.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-medium text-foreground">Assign Teacher</h2>
        <TimetableForm
          schoolId={schoolId}
          teachers={teacherOptions}
          classes={classOptions}
          sections={sectionOptions}
          subjects={subjectOptions}
        />
      </div>

      <div>
        <h2 className="mb-4 text-lg font-medium text-foreground">Current Assignments</h2>
        <TimetableTable rows={tableRows} schoolId={schoolId} />
      </div>
    </div>
  );
}
```

**Note:** The `profiles!timetable_teacher_id_fkey` join syntax tells Supabase which FK to use for the join (since `teacher_id` references `auth.users(id)`, and `profiles.id` also references `auth.users(id)`, Supabase can resolve the join through the user ID). If this doesn't work, an alternative is to join `teacher_profiles` instead. The implementer should verify this join works and adjust if needed.

- [ ] **Step 3: Type-check**

```bash
cd "/Users/dineshlearning/Documents/make money/erp/apps/web" && pnpm type-check
```

This will fail because `TimetableForm` and `TimetableTable` don't exist yet. Expect errors referencing these imports. That's fine — they'll be created in Tasks 3 and 4.

- [ ] **Step 4: Commit**

```bash
cd "/Users/dineshlearning/Documents/make money/erp"
git add "apps/web/app/(school)/admin/timetable/"
git commit -m "feat: timetable page server component with data queries"
```

---

## Task 3: Timetable Assignment Form — Client Component

**Files:**
- Create: `apps/web/app/(school)/admin/timetable/timetable-form.tsx`

- [ ] **Step 1: Create the cascading form**

This form has 6 dropdowns: Teacher, Class, Section (cascades from Class), Subject (cascades from Class), Day, Period. Plus an "Apply to all weekdays" checkbox.

```tsx
// apps/web/app/(school)/admin/timetable/timetable-form.tsx
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
  teachers: { value: string; label: string }[];
  classes: { value: string; label: string; order: number }[];
  sections: { value: string; label: string; classId: string }[];
  subjects: { value: string; label: string; classId: string }[];
}

const DAY_OPTIONS = [
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

const PERIOD_OPTIONS = Array.from({ length: 8 }, (_, i) => ({
  value: String(i + 1),
  label: `Period ${i + 1}`,
}));

export function TimetableForm({ schoolId, teachers, classes, sections, subjects }: Props) {
  const router = useRouter();
  const [teacherId, setTeacherId] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("");
  const [period, setPeriod] = useState("");
  const [allWeekdays, setAllWeekdays] = useState(false);
  const [saving, setSaving] = useState(false);

  const filteredSections = sections.filter((s) => s.classId === classId);
  const filteredSubjects = subjects.filter((s) => s.classId === classId);

  function handleClassChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setClassId(e.target.value);
    setSectionId("");
    setSubjectId("");
  }

  async function handleSubmit() {
    if (!teacherId || !sectionId || !subjectId || !period || (!dayOfWeek && !allWeekdays)) return;
    setSaving(true);

    const supabase = createClient();
    const days = allWeekdays ? [1, 2, 3, 4, 5] : [Number(dayOfWeek)];

    const rows = days.map((d) => ({
      school_id: schoolId,
      teacher_id: teacherId,
      section_id: sectionId,
      subject_id: subjectId,
      day_of_week: d,
      period: Number(period),
    }));

    const { error } = await supabase.from("timetable").insert(rows);
    setSaving(false);

    if (error) {
      if (error.code === "23505") {
        toast.error("Conflict: one or more slots are already assigned.");
      } else {
        toast.error(error.message);
      }
      return;
    }

    toast.success(`Assigned ${rows.length} slot${rows.length > 1 ? "s" : ""}.`);
    setTeacherId("");
    setClassId("");
    setSectionId("");
    setSubjectId("");
    setDayOfWeek("");
    setPeriod("");
    setAllWeekdays(false);
    router.refresh();
  }

  const canSubmit = teacherId && sectionId && subjectId && period && (dayOfWeek || allWeekdays);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <Label>Teacher</Label>
          <NativeSelect
            options={teachers}
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
            placeholder="Select teacher"
          />
        </div>
        <div>
          <Label>Class</Label>
          <NativeSelect
            options={classes}
            value={classId}
            onChange={handleClassChange}
            placeholder="Select class"
          />
        </div>
        <div>
          <Label>Section</Label>
          <NativeSelect
            options={filteredSections}
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            placeholder="Select section"
            disabled={!classId}
          />
        </div>
        <div>
          <Label>Subject</Label>
          <NativeSelect
            options={filteredSubjects}
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            placeholder="Select subject"
            disabled={!classId}
          />
        </div>
        <div>
          <Label>Day of Week</Label>
          <NativeSelect
            options={DAY_OPTIONS}
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(e.target.value)}
            placeholder="Select day"
            disabled={allWeekdays}
          />
        </div>
        <div>
          <Label>Period</Label>
          <NativeSelect
            options={PERIOD_OPTIONS}
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            placeholder="Select period"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={allWeekdays}
            onChange={(e) => {
              setAllWeekdays(e.target.checked);
              if (e.target.checked) setDayOfWeek("");
            }}
            className="rounded border-border"
          />
          Apply to all weekdays (Mon–Fri)
        </label>
        <Button onClick={handleSubmit} disabled={!canSubmit || saving}>
          {saving ? "Assigning…" : "Assign"}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd "/Users/dineshlearning/Documents/make money/erp/apps/web" && pnpm type-check
```

Expected: may still fail due to missing `TimetableTable`. That's fine.

- [ ] **Step 3: Commit**

```bash
cd "/Users/dineshlearning/Documents/make money/erp"
git add "apps/web/app/(school)/admin/timetable/timetable-form.tsx"
git commit -m "feat: timetable assignment form with cascading dropdowns"
```

---

## Task 4: Timetable Table — Client Component

**Files:**
- Create: `apps/web/app/(school)/admin/timetable/timetable-table.tsx`

- [ ] **Step 1: Create the filterable table with delete action**

```tsx
// apps/web/app/(school)/admin/timetable/timetable-table.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { FilterableDataTable } from "@/components/filterable-data-table";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Row {
  id: string;
  teacher: string;
  class: string;
  classOrder: number;
  section: string;
  subject: string;
  day: string;
  dayOfWeek: number;
  period: number;
}

interface Props {
  rows: Row[];
  schoolId: string;
}

export function TimetableTable({ rows, schoolId }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Remove this timetable entry?")) return;
    setDeleting(id);
    const supabase = createClient();
    const { error } = await supabase.from("timetable").delete().eq("id", id);
    setDeleting(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Entry removed.");
    router.refresh();
  }

  const teacherOptions = [...new Set(rows.map((r) => r.teacher))].sort().map((t) => ({
    value: t,
    label: t,
  }));

  return (
    <FilterableDataTable
      data={rows}
      columns={[
        { header: "Teacher", accessor: "teacher" },
        { header: "Class", accessor: "class" },
        { header: "Section", accessor: "section" },
        { header: "Subject", accessor: "subject" },
        { header: "Day", accessor: "day" },
        { header: "Period", accessor: (row) => `P${row.period}` },
      ]}
      searchKeys={["teacher", "class", "subject"]}
      filter={{
        label: "Teacher",
        options: teacherOptions,
        filterFn: (row, value) => row.teacher === value,
      }}
      renderActions={(row) => (
        <button
          onClick={() => handleDelete(row.id)}
          disabled={deleting === row.id}
          className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title="Remove"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
      emptyMessage="No timetable entries yet. Use the form above to assign teachers."
    />
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd "/Users/dineshlearning/Documents/make money/erp/apps/web" && pnpm type-check
```

Expected: exits 0. All imports now resolve.

- [ ] **Step 3: Verify in browser**

```bash
# Dev server should be running. Navigate to:
# http://school1.lvh.me:3000/admin/timetable
```

Verify:
1. Page loads without error
2. "Timetable" appears in the admin sidebar
3. Form shows 6 dropdowns: Teacher (5 teachers), Class (12 classes), Section (disabled until class picked), Subject (disabled until class picked), Day, Period
4. Select Class 8 → Section dropdown shows A, B. Subject dropdown shows Mathematics, English, Science, Social Studies, Hindi.
5. Table shows "No timetable entries yet." (no seed data yet)

- [ ] **Step 4: Test creating an entry**

1. Select: Ravi Kumar, Class 8, Section A, Mathematics, Monday, Period 1
2. Click "Assign"
3. Verify: toast shows "Assigned 1 slot.", table refreshes to show the new row
4. Verify: row shows "Ravi Kumar | Class 8 | A | Mathematics | Monday | P1" with a delete icon

- [ ] **Step 5: Test bulk assign**

1. Select: Ravi Kumar, Class 8, Section A, Mathematics, Period 2
2. Check "Apply to all weekdays"
3. Click "Assign"
4. Verify: toast shows "Assigned 5 slots.", table now has 5 new rows (Mon–Fri, P2)

- [ ] **Step 6: Test conflict detection**

1. Try to assign: Ravi Kumar, Class 8, Section A, Science, Monday, Period 1 (same section+day+period as step 4)
2. Click "Assign"
3. Verify: error toast "Conflict: one or more slots are already assigned."

- [ ] **Step 7: Test delete**

1. Click the trash icon on any row
2. Confirm the dialog
3. Verify: toast shows "Entry removed.", row disappears

- [ ] **Step 8: Commit**

```bash
cd "/Users/dineshlearning/Documents/make money/erp"
git add "apps/web/app/(school)/admin/timetable/timetable-table.tsx"
git commit -m "feat: timetable assignments table with filter and delete"
```

---

## Task 5: Seed Timetable Data

**Files:**
- Modify: `supabase/seed.sql`

- [ ] **Step 1: Append timetable seed block**

Add after the SUBJECTS block at the end of `seed.sql`. This creates realistic timetable entries for the 5 demo teachers. Each teacher teaches their subject across multiple sections, 3–4 periods per day.

We need to look up subject IDs dynamically since they were inserted with `gen_random_uuid()` (not fixed UUIDs). Same approach as fee structures.

```sql
-- ---------------------------------------------------------------
-- TIMETABLE (~80 entries: 5 teachers × ~16 slots each)
-- Each teacher teaches their subject across 2-3 sections, 3 periods/day Mon-Fri
-- ---------------------------------------------------------------
DO $$
DECLARE
  teacher_ids UUID[] := ARRAY[
    'aaaaaaaa-0000-0000-0000-000000000013',  -- Ravi Kumar: Math
    'aaaaaaaa-0000-0000-0000-000000000014',  -- Priya Nair: English
    'aaaaaaaa-0000-0000-0000-000000000015',  -- Suresh Babu: Science
    'aaaaaaaa-0000-0000-0000-000000000016',  -- Kavitha Reddy: Social Studies
    'aaaaaaaa-0000-0000-0000-000000000017'   -- Anand Pillai: Hindi
  ];
  subject_names TEXT[] := ARRAY['Mathematics', 'English', 'Science', 'Social Studies', 'Hindi'];
  -- Each teacher teaches 3 sections: their homeroom class A, class B, and one adjacent class A
  -- Ravi (Class 8A homeroom): 8A, 8B, 7A
  -- Priya (Class 1A homeroom): 1A, 1B, 2A
  -- Suresh (Class 3B homeroom): 3A, 3B, 4A
  -- Kavitha (Class 5A homeroom): 5A, 5B, 6A
  -- Anand (Class 7B homeroom): 7A, 7B, 9A
  section_sets TEXT[][] := ARRAY[
    ARRAY['cccccccc-0000-0000-0000-000000000801', 'cccccccc-0000-0000-0000-000000000802', 'cccccccc-0000-0000-0000-000000000701'],
    ARRAY['cccccccc-0000-0000-0000-000000000101', 'cccccccc-0000-0000-0000-000000000102', 'cccccccc-0000-0000-0000-000000000201'],
    ARRAY['cccccccc-0000-0000-0000-000000000301', 'cccccccc-0000-0000-0000-000000000302', 'cccccccc-0000-0000-0000-000000000401'],
    ARRAY['cccccccc-0000-0000-0000-000000000501', 'cccccccc-0000-0000-0000-000000000502', 'cccccccc-0000-0000-0000-000000000601'],
    ARRAY['cccccccc-0000-0000-0000-000000000701', 'cccccccc-0000-0000-0000-000000000702', 'cccccccc-0000-0000-0000-000000000901']
  ];
  -- Period assignments: section1 gets P1+P2, section2 gets P3+P4, section3 gets P5
  period_sets INT[][] := ARRAY[
    ARRAY[1, 2],
    ARRAY[3, 4],
    ARRAY[5]
  ];
  t_idx INT;
  s_idx INT;
  p_idx INT;
  d INT;
  sec_id UUID;
  sub_id UUID;
  cls_id UUID;
BEGIN
  FOR t_idx IN 1..5 LOOP
    FOR s_idx IN 1..3 LOOP
      sec_id := section_sets[t_idx][s_idx]::UUID;
      -- Look up the class_id for this section
      SELECT class_id INTO cls_id FROM public.sections WHERE id = sec_id;
      -- Look up the subject_id for this teacher's subject in this class
      SELECT id INTO sub_id FROM public.subjects
        WHERE school_id = 'aaaaaaaa-0000-0000-0000-000000000001'
          AND class_id = cls_id
          AND name = subject_names[t_idx]
        LIMIT 1;
      -- Insert for Mon-Fri (days 1-5)
      FOR d IN 1..5 LOOP
        FOR p_idx IN 1..array_length(period_sets[s_idx], 1) LOOP
          INSERT INTO public.timetable (school_id, teacher_id, section_id, subject_id, day_of_week, period)
          VALUES (
            'aaaaaaaa-0000-0000-0000-000000000001',
            teacher_ids[t_idx],
            sec_id,
            sub_id,
            d,
            period_sets[s_idx][p_idx]
          )
          ON CONFLICT (section_id, day_of_week, period) DO NOTHING;
        END LOOP;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;
```

This produces: 5 teachers × 3 sections × 5 days × (2+2+1 periods) = 125 rows (minus any conflicts from shared sections like 7A which Ravi and Anand both teach — `ON CONFLICT DO NOTHING` handles this gracefully).

- [ ] **Step 2: Reset and verify**

```bash
cd "/Users/dineshlearning/Documents/make money/erp" && supabase db reset
```

Verify:
```bash
psql postgres://postgres:postgres@127.0.0.1:54322/postgres -c "SELECT count(*) FROM public.timetable;"
# Expected: ~120 (some conflicts from shared sections reduce from 125)

psql postgres://postgres:postgres@127.0.0.1:54322/postgres -c "
SELECT p.full_name, count(*) as slots
FROM public.timetable t
JOIN public.profiles p ON p.id = t.teacher_id
GROUP BY p.full_name
ORDER BY p.full_name;"
# Expected: 5 teachers, each with ~20-25 slots
```

- [ ] **Step 3: Verify in browser**

Navigate to `http://school1.lvh.me:3000/admin/timetable`. The table should now show ~120 rows of timetable data with teacher names, classes, sections, subjects, days, and periods.

Filter by "Ravi Kumar" — should show entries for Class 8A (P1, P2), Class 8B (P3, P4), and Class 7A (P5), Mon–Fri.

- [ ] **Step 4: Commit**

```bash
cd "/Users/dineshlearning/Documents/make money/erp"
git add supabase/seed.sql
git commit -m "seed: add timetable data (~120 slots) for 5 teachers across multiple sections"
```

---

## Self-Review

**Spec coverage:**
- ✅ Timetable management admin page (form + table)
- ✅ Cascading dropdowns (teacher → class → section/subject)
- ✅ Bulk "Apply to all weekdays" shortcut
- ✅ Filterable table with delete action
- ✅ Conflict detection (unique constraint on section+day+period)
- ✅ Seed timetable data for 5 teachers
- ✅ "Timetable" nav item in admin sidebar

**Placeholder scan:** No TBDs, TODOs, or vague steps found.

**Type consistency:** `Props` interface in form matches what the server page passes. `Row` interface in table matches what the server page constructs. DAY_NAMES/DAY_OPTIONS use consistent 1-based day numbering matching the DB schema.

**Note for Plan 2 dependency:** The section switcher will query `timetable` to determine which sections a teacher is assigned to. This plan ensures that data exists. The timetable page itself is independently useful even before the section switcher is built.
