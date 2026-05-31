# Discipline Table — Add Roll Number

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add roll number as a column in all three discipline table views (admin, principal, teacher) positioned after Student Name.

**Architecture:** The `roll_number` field already exists on `student_profiles`. Each discipline page fetches student data via a join — we extend the select to include `roll_number` and add a column to the DataTable.

**Tech Stack:** Next.js server components, Supabase query, DataTable component

---

### Task 1: Admin Discipline — Add Roll Number Column

**Files:**
- Modify: `apps/web/app/(school)/admin/discipline/page.tsx`

- [ ] **Step 1: Update supabase select to include roll_number**

In `apps/web/app/(school)/admin/discipline/page.tsx`, change the select string from:

```tsx
.select("id, category, severity, description, created_at, student:student_profiles(full_name, section:sections(name, class:classes(name)))")
```

to:

```tsx
.select("id, category, severity, description, created_at, student:student_profiles(full_name, roll_number, section:sections(name, class:classes(name)))")
```

- [ ] **Step 2: Update type assertion and row mapping**

Change the `sp` type and row mapping from:

```tsx
const sp = r.student as unknown as {
  full_name: string;
  section: { name: string; class: { name: string } | null } | null;
} | null;
```

to:

```tsx
const sp = r.student as unknown as {
  full_name: string;
  roll_number: string | null;
  section: { name: string; class: { name: string } | null } | null;
} | null;
```

Add `roll_number` to the return object:

```tsx
return {
  id: r.id,
  student_name: sp?.full_name ?? "—",
  roll_number: sp?.roll_number ?? "—",
  class_section: className && sectionName ? `${className} – ${sectionName}` : "—",
  category: r.category ?? "—",
  severity: r.severity as string | null,
  description: r.description ?? "—",
  date: r.created_at ? new Date(r.created_at).toLocaleDateString() : "—",
};
```

- [ ] **Step 3: Add Roll No column to DataTable**

Insert a new column after "Student":

```tsx
columns={[
  { header: "Student", accessor: "student_name" },
  { header: "Roll No.", accessor: "roll_number" },
  { header: "Class / Section", accessor: "class_section" },
  { header: "Category", accessor: "category" },
  {
    header: "Severity",
    accessor: (row) => (
      <Badge variant={severityVariant(row.severity)}>
        {row.severity ?? "verbal"}
      </Badge>
    ),
  },
  { header: "Description", accessor: "description" },
  { header: "Date", accessor: "date" },
]}
```

- [ ] **Step 4: Verify in browser**

Navigate to the admin discipline page and confirm the Roll No. column appears with correct data.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/(school)/admin/discipline/page.tsx
git commit -m "feat(discipline): add roll number column to admin discipline table"
```

---

### Task 2: Principal Discipline — Add Roll Number Column

**Files:**
- Modify: `apps/web/app/(school)/principal/discipline/page.tsx`

- [ ] **Step 1: Update supabase select to include roll_number**

Change:

```tsx
.select("id, student_id, category, severity, description, created_at, student:student_profiles(full_name)")
```

to:

```tsx
.select("id, student_id, category, severity, description, created_at, student:student_profiles(full_name, roll_number)")
```

- [ ] **Step 2: Update type assertion and row mapping**

Change:

```tsx
const sp = r.student as unknown as { full_name: string } | null;
return {
  id: r.id,
  student_id: (r as any).student_id ?? "",
  student_name: sp?.full_name ?? "—",
```

to:

```tsx
const sp = r.student as unknown as { full_name: string; roll_number: string | null } | null;
return {
  id: r.id,
  student_id: (r as any).student_id ?? "",
  student_name: sp?.full_name ?? "—",
  roll_number: sp?.roll_number ?? "—",
```

- [ ] **Step 3: Add Roll No column to DataTable after Student**

```tsx
columns={[
  {
    header: "Student",
    accessor: (row) => (
      <Link
        href={`/principal/students/${row.student_id}`}
        className="font-medium text-indigo-600 hover:underline"
      >
        {row.student_name}
      </Link>
    ),
  },
  { header: "Roll No.", accessor: "roll_number" },
  { header: "Category", accessor: "category" },
  {
    header: "Severity",
    accessor: (row) => (
      <Badge variant={severityVariant(row.severity)}>
        {row.severity ?? "low"}
      </Badge>
    ),
  },
  { header: "Description", accessor: "description" },
  { header: "Date", accessor: "date" },
]}
```

- [ ] **Step 4: Verify in browser**

Navigate to the principal discipline page and confirm the Roll No. column appears.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/(school)/principal/discipline/page.tsx
git commit -m "feat(discipline): add roll number column to principal discipline table"
```

---

### Task 3: Teacher Discipline — Add Roll Number Column

**Files:**
- Modify: `apps/web/app/(school)/teacher/discipline/page.tsx`

- [ ] **Step 1: Update student query to include roll_number**

Change:

```tsx
const { data: students } = await supabase
  .from("student_profiles")
  .select("id, full_name")
  .eq("section_id", sectionId)
  .order("full_name");
```

to:

```tsx
const { data: students } = await supabase
  .from("student_profiles")
  .select("id, full_name, roll_number")
  .eq("section_id", sectionId)
  .order("full_name");
```

- [ ] **Step 2: Update studentMap to store roll_number**

Change the map and loop to store both name and roll:

```tsx
const studentMap = new Map<string, { name: string; roll: string }>();
const studentOptions: { value: string; label: string }[] = [];

for (const sp of students ?? []) {
  const name = sp.full_name ?? "—";
  studentMap.set(sp.id, { name, roll: sp.roll_number ?? "—" });
  studentOptions.push({ value: sp.id, label: name });
}
```

- [ ] **Step 3: Update row mapping**

Change:

```tsx
const rows = (records ?? []).map((r) => ({
  id: r.id,
  student_name: studentMap.get(r.student_id) ?? "—",
```

to:

```tsx
const rows = (records ?? []).map((r) => {
  const student = studentMap.get(r.student_id);
  return {
    id: r.id,
    student_name: student?.name ?? "—",
    roll_number: student?.roll ?? "—",
    category: r.category ?? "—",
    severity: r.severity as string | null,
    description: r.description ?? "—",
    date: r.created_at ? new Date(r.created_at).toLocaleDateString() : "—",
  };
});
```

- [ ] **Step 4: Add Roll No column to DataTable after Student**

```tsx
columns={[
  { header: "Student", accessor: "student_name" },
  { header: "Roll No.", accessor: "roll_number" },
  { header: "Category", accessor: "category" },
  {
    header: "Severity",
    accessor: (row) => (
      <Badge variant={severityVariant(row.severity)}>
        {row.severity ?? "verbal"}
      </Badge>
    ),
  },
  { header: "Description", accessor: "description" },
  { header: "Date", accessor: "date" },
]}
```

- [ ] **Step 5: Verify in browser**

Navigate to the teacher discipline page and confirm the Roll No. column appears.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/(school)/teacher/discipline/page.tsx
git commit -m "feat(discipline): add roll number column to teacher discipline table"
```
