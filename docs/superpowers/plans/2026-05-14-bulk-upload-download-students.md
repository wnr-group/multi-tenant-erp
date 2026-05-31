# Bulk Upload & Download Students

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow school admins to download the current student roster as CSV and bulk upload students (with upsert — matching by admission_number to update existing, or creating new).

**Architecture:** A new "Bulk Actions" dropdown on the admin students page with "Download CSV" and "Upload CSV" options. Download generates a CSV client-side from the already-fetched data. Upload uses a new school-level API route (not platform-admin) that performs upsert logic on `student_profiles`.

**Tech Stack:** Next.js App Router, Supabase service role for upsert, CSV generation (client), file upload with parsing

---

### Task 1: Create the School-Level Bulk Import API Route

**Files:**
- Create: `apps/web/app/api/students/import/route.ts`

- [ ] **Step 1: Create the API route**

Create `apps/web/app/api/students/import/route.ts`:

```tsx
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";

interface ImportRow {
  full_name: string;
  email?: string;
  roll_number?: string;
  admission_number?: string;
  class_name?: string;
  section_name?: string;
  parent_phone?: string;
}

interface RowResult {
  row: number;
  status: "created" | "updated" | "error";
  error?: string;
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!roleRow || roleRow.role !== "school_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const schoolId = await getSchoolId();
  if (!schoolId) return NextResponse.json({ error: "No school context" }, { status: 400 });

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { rows } = (await request.json()) as { rows: ImportRow[] };

  const { data: classes } = await adminClient
    .from("classes")
    .select("id, name")
    .eq("school_id", schoolId);

  const { data: sections } = await adminClient
    .from("sections")
    .select("id, name, class_id")
    .eq("school_id", schoolId);

  const classMap = new Map<string, string>();
  for (const cls of classes ?? []) {
    classMap.set(cls.name.toLowerCase().trim(), cls.id);
  }

  const sectionMap = new Map<string, string>();
  for (const sec of sections ?? []) {
    sectionMap.set(`${sec.class_id}:${sec.name.toLowerCase().trim()}`, sec.id);
  }

  const results: RowResult[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      if (!row.full_name?.trim()) {
        throw new Error("Missing full_name");
      }

      const className = row.class_name?.toLowerCase().trim() ?? "";
      const sectionName = row.section_name?.toLowerCase().trim() ?? "";
      const classId = className ? classMap.get(className) : undefined;
      const sectionId = classId && sectionName
        ? sectionMap.get(`${classId}:${sectionName}`)
        : undefined;

      const record = {
        school_id: schoolId,
        full_name: row.full_name.trim(),
        email: row.email?.trim() || null,
        roll_number: row.roll_number?.trim() || null,
        admission_number: row.admission_number?.trim() || null,
        class_id: classId ?? null,
        section_id: sectionId ?? null,
        parent_phone: row.parent_phone?.trim() || null,
      };

      if (row.admission_number?.trim()) {
        const { data: existing } = await adminClient
          .from("student_profiles")
          .select("id")
          .eq("school_id", schoolId)
          .eq("admission_number", row.admission_number.trim())
          .maybeSingle();

        if (existing) {
          const { error } = await adminClient
            .from("student_profiles")
            .update(record)
            .eq("id", existing.id);
          if (error) throw new Error(error.message);
          results.push({ row: i, status: "updated" });
        } else {
          const { error } = await adminClient
            .from("student_profiles")
            .insert(record);
          if (error) throw new Error(error.message);
          results.push({ row: i, status: "created" });
        }
      } else {
        const { error } = await adminClient
          .from("student_profiles")
          .insert(record);
        if (error) throw new Error(error.message);
        results.push({ row: i, status: "created" });
      }
    } catch (err) {
      results.push({
        row: i,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({ results });
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/api/students/import/route.ts
git commit -m "feat(students): add school-level bulk import API with upsert"
```

---

### Task 2: Create Bulk Actions Client Component

**Files:**
- Create: `apps/web/app/(school)/admin/students/bulk-actions.tsx`

- [ ] **Step 1: Create the BulkActions component**

Create `apps/web/app/(school)/admin/students/bulk-actions.tsx`:

```tsx
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Download, Upload, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseCsv } from "@/lib/csv-parser";

interface StudentRow {
  id: string;
  name: string;
  roll: string;
  admission_number: string;
  class_name: string;
  section: string;
  email: string;
  parent_phone: string;
}

interface BulkActionsProps {
  students: StudentRow[];
}

export function BulkActions({ students }: BulkActionsProps) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ created: number; updated: number; errors: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function handleDownload() {
    const headers = ["full_name", "email", "roll_number", "admission_number", "class_name", "section_name", "parent_phone"];
    const csvRows = students.map((s) =>
      [s.name, s.email, s.roll, s.admission_number, s.class_name, s.section, s.parent_phone]
        .map((v) => `"${(v ?? "").replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "students.csv";
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  }

  function handleDownloadTemplate() {
    const headers = "full_name,email,roll_number,admission_number,class_name,section_name,parent_phone\n";
    const blob = new Blob([headers], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "students_template.csv";
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setResult(null);
    setOpen(false);

    const text = await file.text();
    const { rows } = parseCsv(text);

    const importRows = rows.map((r) => ({
      full_name: r.full_name ?? "",
      email: r.email ?? "",
      roll_number: r.roll_number ?? "",
      admission_number: r.admission_number ?? "",
      class_name: r.class_name ?? "",
      section_name: r.section_name ?? "",
      parent_phone: r.parent_phone ?? "",
    }));

    try {
      const res = await fetch("/api/students/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: importRows }),
      });
      const data = await res.json();
      const results = data.results ?? [];
      setResult({
        created: results.filter((r: any) => r.status === "created").length,
        updated: results.filter((r: any) => r.status === "updated").length,
        errors: results.filter((r: any) => r.status === "error").length,
      });
      router.refresh();
    } catch {
      setResult({ created: 0, updated: 0, errors: 1 });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setOpen(!open)}
        disabled={uploading}
      >
        {uploading ? "Importing..." : "Bulk Actions"}
        <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-52 rounded-lg border border-border bg-background p-1 shadow-lg">
            <button
              onClick={handleDownload}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
            >
              <Download className="h-4 w-4" />
              Download Students
            </button>
            <button
              onClick={handleDownloadTemplate}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
            >
              <Download className="h-4 w-4" />
              Download Template
            </button>
            <label className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted">
              <Upload className="h-4 w-4" />
              Upload CSV
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleUpload}
              />
            </label>
          </div>
        </>
      )}

      {result && (
        <div className="absolute right-0 top-full z-20 mt-1 w-64 rounded-lg border border-border bg-background p-3 shadow-lg">
          <p className="text-sm font-medium text-foreground">Import Complete</p>
          <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
            <li className="text-green-600">{result.created} created</li>
            <li className="text-blue-600">{result.updated} updated</li>
            {result.errors > 0 && <li className="text-red-600">{result.errors} errors</li>}
          </ul>
          <button
            onClick={() => setResult(null)}
            className="mt-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/(school)/admin/students/bulk-actions.tsx
git commit -m "feat(students): add BulkActions dropdown with download and upload"
```

---

### Task 3: Integrate BulkActions into Students Page

**Files:**
- Modify: `apps/web/app/(school)/admin/students/page.tsx`

- [ ] **Step 1: Update the students page to pass more data and show BulkActions**

Update `apps/web/app/(school)/admin/students/page.tsx`. Add email, admission_number, parent_phone to the select and row mapping. Add BulkActions next to AddStudentDialog:

```tsx
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { PageHeader } from "@/components/page-header";
import { AddStudentDialog } from "./add-student-dialog";
import { BulkActions } from "./bulk-actions";
import { StudentsTable } from "./students-table";

export default async function StudentsPage() {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  const [{ data: students }, { data: classes }] = await Promise.all([
    supabase
      .from("student_profiles")
      .select(
        "id, full_name, email, roll_number, admission_number, parent_phone, class:classes(name), section:sections(name)"
      )
      .eq("school_id", schoolId)
      .limit(5000),
    supabase
      .from("classes")
      .select("id, name")
      .eq("school_id", schoolId)
      .order("order"),
  ]);

  const rows = (students ?? []).map((s) => {
    const c = s.class as unknown as { name: string } | null;
    const sec = s.section as unknown as { name: string } | null;
    return {
      id: s.id,
      name: s.full_name ?? "",
      email: s.email ?? "",
      roll: s.roll_number ?? "",
      admission_number: s.admission_number ?? "",
      class_name: c?.name ?? "",
      section: sec?.name ?? "",
      parent_phone: s.parent_phone ?? "",
    };
  });

  const classFilterOptions = (classes ?? []).map((c) => ({
    label: c.name,
    value: c.name,
  }));

  return (
    <div>
      <PageHeader
        title="Students"
        description="Manage student enrollment and profiles."
        action={
          <div className="flex items-center gap-2">
            <BulkActions students={rows} />
            <AddStudentDialog schoolId={schoolId} classes={classes ?? []} />
          </div>
        }
        stats={[
          { label: "Total Students", value: rows.length },
          { label: "Classes", value: (classes ?? []).length },
        ]}
      />

      <StudentsTable rows={rows} classFilterOptions={classFilterOptions} />
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

Navigate to admin students page. Confirm:
- "Bulk Actions" dropdown appears
- "Download Students" generates a CSV with current data
- "Download Template" generates an empty template
- "Upload CSV" accepts a file, imports, and shows results

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/(school)/admin/students/page.tsx
git commit -m "feat(students): integrate bulk actions into admin students page"
```
