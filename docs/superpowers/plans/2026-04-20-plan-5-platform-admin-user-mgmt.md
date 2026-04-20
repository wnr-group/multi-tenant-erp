# Platform Admin User Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full user management (invite, edit, remove, bulk CSV import) to the platform admin school detail page, and simplify the New School form.

**Architecture:** API routes handle all mutations (no server actions). Platform admin pages are server components; interactive parts (tabs, forms, dialogs) are client components. CSV parsing happens client-side; server receives validated JSON rows. All privileged operations use the Supabase service role client.

**Tech Stack:** Next.js 16 App Router, Supabase (service role for admin ops, `admin.inviteUserByEmail` for user creation), shadcn/ui components, Base UI dialogs, Sonner toasts.

---

## File Map

### New files
| File | Responsibility |
|---|---|
| `apps/web/app/api/schools/[id]/route.ts` | PATCH school info |
| `apps/web/app/api/schools/[id]/users/route.ts` | POST invite user to school |
| `apps/web/app/api/schools/[id]/users/[roleId]/route.ts` | PATCH edit role, DELETE remove role |
| `apps/web/app/api/schools/[id]/import/route.ts` | POST bulk import users |
| `apps/web/app/platform-admin/schools/[id]/school-tabs.tsx` | Client tab navigation component |
| `apps/web/app/platform-admin/schools/[id]/overview-tab.tsx` | Client editable school info form |
| `apps/web/app/platform-admin/schools/[id]/users-tab.tsx` | Client user list + invite/edit/remove |
| `apps/web/app/platform-admin/schools/[id]/invite-user-dialog.tsx` | Client invite user dialog |
| `apps/web/app/platform-admin/schools/[id]/edit-role-dialog.tsx` | Client edit role dialog |
| `apps/web/app/platform-admin/schools/[id]/import-tab.tsx` | Client bulk import UI |
| `apps/web/lib/csv-parser.ts` | Client-side CSV string → row array parser |

### Modified files
| File | Change |
|---|---|
| `apps/web/app/platform-admin/schools/new/page.tsx` | Remove admin invite fields, simplify |
| `apps/web/app/platform-admin/schools/[id]/page.tsx` | Replace with tabbed layout, fetch all data |

---

## Task 1: Simplify New School form

**Files:**
- Modify: `apps/web/app/platform-admin/schools/new/page.tsx`

- [ ] **Step 1: Read the current file**

Read `apps/web/app/platform-admin/schools/new/page.tsx`.

- [ ] **Step 2: Replace with simplified form**

Replace the entire file:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function NewSchoolPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#2563EB");
  const [contactEmail, setContactEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data: school, error: schoolError } = await supabase
      .from("schools")
      .insert({ name, domain, primary_color: primaryColor, contact_email: contactEmail })
      .select()
      .single();

    if (schoolError || !school) {
      setError(schoolError?.message ?? "Failed to create school");
      setLoading(false);
      return;
    }

    toast.success("School created. Now invite users from the school detail page.");
    router.push(`/platform-admin/schools/${school.id}`);
    router.refresh();
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">New School</h1>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg bg-white p-6 shadow-sm">
        {error && (
          <p className="rounded bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
        )}
        <div>
          <Label>School Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <Label>Web Domain (e.g. school2.lvh.me for local dev)</Label>
          <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="school2.lvh.me" required />
        </div>
        <div>
          <Label>Primary Color (hex)</Label>
          <div className="flex items-center gap-2">
            <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} placeholder="#2563EB" />
            <div className="h-8 w-8 rounded border" style={{ backgroundColor: primaryColor }} />
          </div>
        </div>
        <div>
          <Label>School Contact Email</Label>
          <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Creating…" : "Create School"}
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Type-check and commit**

```bash
pnpm --filter @erp/web type-check
git add apps/web/app/platform-admin/schools/new/page.tsx
git commit -m "feat: simplify New School form — remove admin invite fields"
```

---

## Task 2: School PATCH API route

**Files:**
- Create: `apps/web/app/api/schools/[id]/route.ts`

- [ ] **Step 1: Create the API route**

Create `apps/web/app/api/schools/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function requireSuperAdmin(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();
  if (!roleRow || roleRow.role !== "super_admin") return null;
  return user;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSuperAdmin(request);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const allowed = ["name", "domain", "primary_color", "contact_email"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await adminClient
    .from("schools")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
```

- [ ] **Step 2: Type-check and commit**

```bash
pnpm --filter @erp/web type-check
git add apps/web/app/api/schools/\[id\]/route.ts
git commit -m "feat: add PATCH /api/schools/[id] for updating school info"
```

---

## Task 3: School users API routes (invite, edit, remove)

**Files:**
- Create: `apps/web/app/api/schools/[id]/users/route.ts`
- Create: `apps/web/app/api/schools/[id]/users/[roleId]/route.ts`

- [ ] **Step 1: Create invite user route**

Create `apps/web/app/api/schools/[id]/users/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();
  if (!roleRow || roleRow.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: schoolId } = await params;
  const { email, fullName, role } = await request.json() as {
    email: string;
    fullName: string;
    role: string;
  };

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Look up school domain for invite redirect
  const { data: school } = await adminClient
    .from("schools")
    .select("domain, name")
    .eq("id", schoolId)
    .single();

  const host = request.headers.get("host") ?? "";
  const port = host.includes(":") ? `:${host.split(":")[1]}` : "";
  const protocol = host.includes("localhost") || host.includes("lvh.me") ? "http" : "https";
  const redirectTo = school?.domain
    ? `${protocol}://${school.domain}${port}/invite`
    : undefined;

  const roleLabels: Record<string, string> = {
    school_admin: "School Admin",
    principal: "Principal",
    teacher: "Teacher",
    student: "Student",
    parent: "Parent",
  };

  const { data: inviteData, error: inviteError } =
    await adminClient.auth.admin.inviteUserByEmail(email, {
      data: {
        full_name: fullName,
        invited_role: roleLabels[role] ?? role,
        school_name: school?.name ?? "School",
      },
      redirectTo,
    });

  if (inviteError || !inviteData.user) {
    return NextResponse.json(
      { error: inviteError?.message ?? "Failed to invite user" },
      { status: 400 }
    );
  }

  const userId = inviteData.user.id;

  await adminClient.from("user_roles").insert({
    user_id: userId,
    school_id: schoolId,
    role,
  });

  await adminClient
    .from("profiles")
    .update({ school_id: schoolId, full_name: fullName })
    .eq("id", userId);

  // Create type-specific profile
  if (role === "teacher") {
    await adminClient.from("teacher_profiles").insert({ profile_id: userId, school_id: schoolId });
  } else if (role === "student") {
    await adminClient.from("student_profiles").insert({ profile_id: userId, school_id: schoolId });
  }

  return NextResponse.json({ userId });
}
```

- [ ] **Step 2: Create edit/remove role route**

Create `apps/web/app/api/schools/[id]/users/[roleId]/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function requireSuperAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();
  return roleRow?.role === "super_admin";
}

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; roleId: string }> }
) {
  if (!(await requireSuperAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { roleId } = await params;
  const { role, is_active } = await request.json() as {
    role?: string;
    is_active?: boolean;
  };

  const updates: Record<string, unknown> = {};
  if (role !== undefined) updates.role = role;
  if (is_active !== undefined) updates.is_active = is_active;

  const { data, error } = await getAdminClient()
    .from("user_roles")
    .update(updates)
    .eq("id", roleId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; roleId: string }> }
) {
  if (!(await requireSuperAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { roleId } = await params;
  const { error } = await getAdminClient()
    .from("user_roles")
    .delete()
    .eq("id", roleId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Type-check and commit**

```bash
pnpm --filter @erp/web type-check
git add apps/web/app/api/schools/\[id\]/users/
git commit -m "feat: add school user API routes — invite, edit role, remove"
```

---

## Task 4: Bulk import API route

**Files:**
- Create: `apps/web/app/api/schools/[id]/import/route.ts`

- [ ] **Step 1: Create the bulk import route**

Create `apps/web/app/api/schools/[id]/import/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();
  if (!roleRow || roleRow.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: schoolId } = await params;
  const { role, rows } = await request.json() as {
    role: string;
    rows: Array<{
      full_name: string;
      email: string;
      roll_number?: string;
      class_name?: string;
      section_name?: string;
      student_email?: string;
    }>;
  };

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Look up school for invite redirect
  const { data: school } = await adminClient
    .from("schools")
    .select("domain, name")
    .eq("id", schoolId)
    .single();

  const host = request.headers.get("host") ?? "";
  const port = host.includes(":") ? `:${host.split(":")[1]}` : "";
  const protocol = host.includes("localhost") || host.includes("lvh.me") ? "http" : "https";
  const redirectTo = school?.domain
    ? `${protocol}://${school.domain}${port}/invite`
    : undefined;

  // Pre-fetch classes and sections for student imports
  let classMap = new Map<string, string>();
  let sectionMap = new Map<string, string>();
  if (role === "student") {
    const { data: classes } = await adminClient
      .from("classes")
      .select("id, name")
      .eq("school_id", schoolId);
    classMap = new Map((classes ?? []).map((c) => [c.name.toLowerCase(), c.id]));

    const { data: sections } = await adminClient
      .from("sections")
      .select("id, name, class_id")
      .eq("school_id", schoolId);
    // Key: "classId:sectionName" for unique lookup
    sectionMap = new Map(
      (sections ?? []).map((s) => [`${s.class_id}:${s.name.toLowerCase()}`, s.id])
    );
  }

  const results: Array<{ row: number; status: "ok" | "error"; error?: string }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      // Create auth user
      const { data: inviteData, error: inviteError } =
        await adminClient.auth.admin.inviteUserByEmail(row.email, {
          data: {
            full_name: row.full_name,
            invited_role: role,
            school_name: school?.name ?? "School",
          },
          redirectTo,
        });

      if (inviteError || !inviteData.user) {
        results.push({ row: i, status: "error", error: inviteError?.message ?? "Invite failed" });
        continue;
      }

      const userId = inviteData.user.id;

      // Create user_role
      await adminClient.from("user_roles").insert({
        user_id: userId,
        school_id: schoolId,
        role,
      });

      // Update profile
      await adminClient
        .from("profiles")
        .update({ school_id: schoolId, full_name: row.full_name })
        .eq("id", userId);

      // Type-specific profile
      if (role === "student") {
        const classId = row.class_name ? classMap.get(row.class_name.toLowerCase()) : undefined;
        const sectionId = classId && row.section_name
          ? sectionMap.get(`${classId}:${row.section_name.toLowerCase()}`)
          : undefined;

        await adminClient.from("student_profiles").insert({
          profile_id: userId,
          school_id: schoolId,
          class_id: classId ?? null,
          section_id: sectionId ?? null,
          roll_number: row.roll_number ?? null,
        });
      } else if (role === "teacher") {
        await adminClient.from("teacher_profiles").insert({
          profile_id: userId,
          school_id: schoolId,
        });
      }

      results.push({ row: i, status: "ok" });
    } catch (err: any) {
      results.push({ row: i, status: "error", error: err?.message ?? "Unknown error" });
    }
  }

  return NextResponse.json({ results });
}
```

- [ ] **Step 2: Type-check and commit**

```bash
pnpm --filter @erp/web type-check
git add apps/web/app/api/schools/\[id\]/import/
git commit -m "feat: add bulk import API route for school users"
```

---

## Task 5: CSV parser utility

**Files:**
- Create: `apps/web/lib/csv-parser.ts`

- [ ] **Step 1: Create the CSV parser**

Create `apps/web/lib/csv-parser.ts`:

```ts
export interface CsvRow {
  [key: string]: string;
}

export function parseCsv(text: string): { headers: string[]; rows: CsvRow[] } {
  const lines = text.trim().split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    const row: CsvRow = {};
    headers.forEach((h, j) => {
      row[h] = values[j] ?? "";
    });
    rows.push(row);
  }

  return { headers, rows };
}

export function generateCsvTemplate(role: string): string {
  const templates: Record<string, string[]> = {
    student: ["full_name", "email", "roll_number", "class", "section"],
    teacher: ["full_name", "email"],
    parent: ["full_name", "email", "student_email"],
  };
  const headers = templates[role] ?? ["full_name", "email"];
  return headers.join(",") + "\n";
}

export function validateRow(
  row: CsvRow,
  role: string
): { valid: boolean; error?: string } {
  if (!row.full_name?.trim()) return { valid: false, error: "Missing full_name" };
  if (!row.email?.trim()) return { valid: false, error: "Missing email" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email.trim())) {
    return { valid: false, error: "Invalid email format" };
  }
  return { valid: true };
}
```

- [ ] **Step 2: Type-check and commit**

```bash
pnpm --filter @erp/web type-check
git add apps/web/lib/csv-parser.ts
git commit -m "feat: add client-side CSV parser with template generation and validation"
```

---

## Task 6: School tabs component

**Files:**
- Create: `apps/web/app/platform-admin/schools/[id]/school-tabs.tsx`

- [ ] **Step 1: Create the tabs component**

Create `apps/web/app/platform-admin/schools/[id]/school-tabs.tsx`:

```tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "users", label: "Users" },
  { key: "import", label: "Bulk Import" },
] as const;

export function SchoolTabs({ schoolId }: { schoolId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") ?? "overview";

  return (
    <div className="mb-6 flex gap-1 border-b">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => {
            const params = new URLSearchParams();
            if (tab.key !== "overview") params.set("tab", tab.key);
            const qs = params.toString();
            router.push(`/platform-admin/schools/${schoolId}${qs ? `?${qs}` : ""}`);
          }}
          className={cn(
            "px-4 py-2.5 text-sm font-medium transition-colors -mb-px border-b-2",
            activeTab === tab.key
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Type-check and commit**

```bash
pnpm --filter @erp/web type-check
git add apps/web/app/platform-admin/schools/\[id\]/school-tabs.tsx
git commit -m "feat: add SchoolTabs component for tabbed school detail page"
```

---

## Task 7: Overview tab

**Files:**
- Create: `apps/web/app/platform-admin/schools/[id]/overview-tab.tsx`

- [ ] **Step 1: Create the overview tab**

Create `apps/web/app/platform-admin/schools/[id]/overview-tab.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface SchoolData {
  id: string;
  name: string;
  domain: string | null;
  primary_color: string | null;
  contact_email: string | null;
}

interface RoleCounts {
  school_admin: number;
  teacher: number;
  student: number;
  principal: number;
  parent: number;
}

export function OverviewTab({
  school,
  roleCounts,
}: {
  school: SchoolData;
  roleCounts: RoleCounts;
}) {
  const router = useRouter();
  const [name, setName] = useState(school.name);
  const [domain, setDomain] = useState(school.domain ?? "");
  const [primaryColor, setPrimaryColor] = useState(school.primary_color ?? "#2563EB");
  const [contactEmail, setContactEmail] = useState(school.contact_email ?? "");
  const [loading, setLoading] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch(`/api/schools/${school.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, domain, primary_color: primaryColor, contact_email: contactEmail }),
    });
    setLoading(false);
    if (!res.ok) {
      const { error } = await res.json();
      toast.error(error ?? "Failed to update school");
    } else {
      toast.success("School updated.");
      router.refresh();
    }
  }

  const stats = [
    { label: "Admins", value: roleCounts.school_admin },
    { label: "Principals", value: roleCounts.principal },
    { label: "Teachers", value: roleCounts.teacher },
    { label: "Students", value: roleCounts.student },
    { label: "Parents", value: roleCounts.parent },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border bg-white px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{s.label}</p>
            <p className="mt-1 text-xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      <form onSubmit={handleSave} className="max-w-lg space-y-4 rounded-lg border bg-white p-6">
        <h2 className="text-base font-semibold text-gray-900">School Information</h2>
        <div className="space-y-1.5">
          <Label>School Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>Web Domain</Label>
          <Input value={domain} onChange={(e) => setDomain(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>Primary Color (hex)</Label>
          <div className="flex items-center gap-2">
            <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
            <div className="h-8 w-8 rounded border" style={{ backgroundColor: primaryColor }} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Contact Email</Label>
          <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : "Save Changes"}
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Type-check and commit**

```bash
pnpm --filter @erp/web type-check
git add apps/web/app/platform-admin/schools/\[id\]/overview-tab.tsx
git commit -m "feat: add OverviewTab with editable school info and role counts"
```

---

## Task 8: Invite user and edit role dialogs

**Files:**
- Create: `apps/web/app/platform-admin/schools/[id]/invite-user-dialog.tsx`
- Create: `apps/web/app/platform-admin/schools/[id]/edit-role-dialog.tsx`

- [ ] **Step 1: Create invite user dialog**

Create `apps/web/app/platform-admin/schools/[id]/invite-user-dialog.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const ROLES = [
  { value: "school_admin", label: "School Admin" },
  { value: "principal", label: "Principal" },
  { value: "teacher", label: "Teacher" },
  { value: "student", label: "Student" },
  { value: "parent", label: "Parent" },
];

export function InviteUserDialog({
  schoolId,
  open,
  onOpenChange,
}: {
  schoolId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("teacher");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch(`/api/schools/${schoolId}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, fullName, role }),
    });

    setLoading(false);
    if (!res.ok) {
      const { error } = await res.json();
      toast.error(error ?? "Failed to invite user");
      return;
    }

    toast.success(`${fullName} invited as ${ROLES.find((r) => r.value === role)?.label}.`);
    setFullName("");
    setEmail("");
    setRole("teacher");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Full Name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Inviting…" : "Send Invite"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Create edit role dialog**

Create `apps/web/app/platform-admin/schools/[id]/edit-role-dialog.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const ROLES = [
  { value: "school_admin", label: "School Admin" },
  { value: "principal", label: "Principal" },
  { value: "teacher", label: "Teacher" },
  { value: "student", label: "Student" },
  { value: "parent", label: "Parent" },
];

interface UserRole {
  roleId: string;
  userName: string;
  currentRole: string;
}

export function EditRoleDialog({
  schoolId,
  user,
  open,
  onOpenChange,
}: {
  schoolId: string;
  user: UserRole | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [role, setRole] = useState(user?.currentRole ?? "teacher");
  const [loading, setLoading] = useState(false);

  // Sync when user changes
  if (user && role !== user.currentRole && !loading) {
    setRole(user.currentRole);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    const res = await fetch(`/api/schools/${schoolId}/users/${user.roleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });

    setLoading(false);
    if (!res.ok) {
      const { error } = await res.json();
      toast.error(error ?? "Failed to update role");
      return;
    }

    toast.success(`Updated ${user.userName}'s role to ${ROLES.find((r) => r.value === role)?.label}.`);
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Role — {user?.userName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Role</Label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Saving…" : "Save Role"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Type-check and commit**

```bash
pnpm --filter @erp/web type-check
git add apps/web/app/platform-admin/schools/\[id\]/invite-user-dialog.tsx apps/web/app/platform-admin/schools/\[id\]/edit-role-dialog.tsx
git commit -m "feat: add InviteUserDialog and EditRoleDialog components"
```

---

## Task 9: Users tab

**Files:**
- Create: `apps/web/app/platform-admin/schools/[id]/users-tab.tsx`

- [ ] **Step 1: Create the users tab**

Create `apps/web/app/platform-admin/schools/[id]/users-tab.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { InviteUserDialog } from "./invite-user-dialog";
import { EditRoleDialog } from "./edit-role-dialog";

interface SchoolUser {
  id: string;       // profile id
  roleId: string;   // user_roles.id
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
}

export function UsersTab({
  schoolId,
  users,
}: {
  schoolId: string;
  users: SchoolUser[];
}) {
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editUser, setEditUser] = useState<{ roleId: string; userName: string; currentRole: string } | null>(null);

  async function toggleActive(roleId: string, currentlyActive: boolean) {
    const res = await fetch(`/api/schools/${schoolId}/users/${roleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !currentlyActive }),
    });
    if (!res.ok) {
      toast.error("Failed to update status");
      return;
    }
    toast.success(currentlyActive ? "User deactivated." : "User activated.");
    router.refresh();
  }

  async function removeUser(roleId: string, userName: string) {
    if (!confirm(`Remove ${userName} from this school? This cannot be undone.`)) return;
    const res = await fetch(`/api/schools/${schoolId}/users/${roleId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast.error("Failed to remove user");
      return;
    }
    toast.success(`${userName} removed.`);
    router.refresh();
  }

  const roleLabels: Record<string, string> = {
    school_admin: "School Admin",
    principal: "Principal",
    teacher: "Teacher",
    student: "Student",
    parent: "Parent",
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Users ({users.length})</h2>
        <Button size="sm" onClick={() => setInviteOpen(true)}>+ Invite User</Button>
      </div>

      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left">
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Name</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Email</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Role</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  No users yet. Invite users to get started.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.roleId} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{u.full_name}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3 text-gray-500">{roleLabels[u.role] ?? u.role}</td>
                  <td className="px-4 py-3">
                    <Badge variant={u.is_active ? "default" : "secondary"}>
                      {u.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditUser({ roleId: u.roleId, userName: u.full_name, currentRole: u.role })}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Edit Role
                      </button>
                      <button
                        onClick={() => toggleActive(u.roleId, u.is_active)}
                        className="text-xs text-amber-600 hover:underline"
                      >
                        {u.is_active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => removeUser(u.roleId, u.full_name)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <InviteUserDialog schoolId={schoolId} open={inviteOpen} onOpenChange={setInviteOpen} />
      <EditRoleDialog
        schoolId={schoolId}
        user={editUser}
        open={!!editUser}
        onOpenChange={(open) => { if (!open) setEditUser(null); }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Type-check and commit**

```bash
pnpm --filter @erp/web type-check
git add apps/web/app/platform-admin/schools/\[id\]/users-tab.tsx
git commit -m "feat: add UsersTab with invite, edit role, deactivate, remove"
```

---

## Task 10: Import tab

**Files:**
- Create: `apps/web/app/platform-admin/schools/[id]/import-tab.tsx`

- [ ] **Step 1: Create the import tab**

Create `apps/web/app/platform-admin/schools/[id]/import-tab.tsx`:

```tsx
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { parseCsv, generateCsvTemplate, validateRow, type CsvRow } from "@/lib/csv-parser";
import { Upload, Download, CheckCircle2, XCircle } from "lucide-react";

const IMPORT_ROLES = [
  { value: "student", label: "Students" },
  { value: "teacher", label: "Teachers" },
  { value: "parent", label: "Parents" },
];

interface ParsedRow extends CsvRow {
  _valid: boolean;
  _error?: string;
}

export function ImportTab({ schoolId }: { schoolId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [role, setRole] = useState("student");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<Array<{ row: number; status: string; error?: string }> | null>(null);

  function downloadTemplate() {
    const csv = generateCsvTemplate(role);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${role}_import_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResults(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { headers: h, rows: r } = parseCsv(text);
      setHeaders(h);
      setRows(
        r.map((row) => {
          const { valid, error } = validateRow(row, role);
          return { ...row, _valid: valid, _error: error };
        })
      );
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    const validRows = rows.filter((r) => r._valid);
    if (validRows.length === 0) {
      toast.error("No valid rows to import");
      return;
    }

    setImporting(true);
    const payload = validRows.map(({ _valid, _error, ...row }) => ({
      full_name: row.full_name ?? "",
      email: row.email ?? "",
      roll_number: row.roll_number,
      class_name: row.class,
      section_name: row.section,
      student_email: row.student_email,
    }));

    const res = await fetch(`/api/schools/${schoolId}/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, rows: payload }),
    });

    setImporting(false);
    if (!res.ok) {
      toast.error("Import failed");
      return;
    }

    const data = await res.json();
    setResults(data.results);
    const okCount = data.results.filter((r: any) => r.status === "ok").length;
    const errCount = data.results.filter((r: any) => r.status === "error").length;
    toast.success(`Imported ${okCount} users${errCount > 0 ? `, ${errCount} errors` : ""}.`);
    router.refresh();
  }

  const validCount = rows.filter((r) => r._valid).length;
  const errorCount = rows.filter((r) => !r._valid).length;

  return (
    <div className="space-y-6">
      {/* Role selector + template download */}
      <div className="flex items-end gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Import as</label>
          <select
            value={role}
            onChange={(e) => { setRole(e.target.value); setRows([]); setResults(null); }}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {IMPORT_ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="mr-1.5 h-4 w-4" /> Download Template
        </Button>
      </div>

      {/* File upload */}
      <div
        onClick={() => fileRef.current?.click()}
        className="cursor-pointer rounded-lg border-2 border-dashed bg-white p-8 text-center transition-colors hover:border-indigo-400 hover:bg-indigo-50/30"
      >
        <Upload className="mx-auto h-8 w-8 text-gray-400" />
        <p className="mt-2 text-sm font-medium text-gray-700">
          Click to upload CSV file
        </p>
        <p className="text-xs text-gray-400">or drag and drop</p>
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          onChange={handleFile}
          className="hidden"
        />
      </div>

      {/* Preview table */}
      {rows.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex gap-3 text-sm">
              <span className="text-green-600">{validCount} valid</span>
              {errorCount > 0 && <span className="text-red-600">{errorCount} errors</span>}
            </div>
            <Button size="sm" onClick={handleImport} disabled={importing || validCount === 0}>
              {importing ? "Importing…" : `Import ${validCount} Users`}
            </Button>
          </div>

          <div className="max-h-96 overflow-auto rounded-lg border bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">#</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Status</th>
                  {headers.filter((h) => !h.startsWith("_")).map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className={`border-b last:border-0 ${!row._valid ? "bg-red-50" : ""}`}>
                    <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                    <td className="px-3 py-2">
                      {row._valid ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-red-600">
                          <XCircle className="h-4 w-4" /> {row._error}
                        </span>
                      )}
                    </td>
                    {headers.filter((h) => !h.startsWith("_")).map((h) => (
                      <td key={h} className="px-3 py-2 text-gray-700">{row[h]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Results after import */}
      {results && (
        <div className="rounded-lg border bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-900">Import Results</h3>
          <div className="space-y-1 text-sm">
            {results.map((r) => (
              <div key={r.row} className="flex items-center gap-2">
                {r.status === "ok" ? (
                  <Badge variant="default">OK</Badge>
                ) : (
                  <Badge variant="secondary">Error</Badge>
                )}
                <span>Row {r.row + 1}: {r.status === "ok" ? "Imported" : r.error}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check and commit**

```bash
pnpm --filter @erp/web type-check
git add apps/web/app/platform-admin/schools/\[id\]/import-tab.tsx
git commit -m "feat: add ImportTab with CSV upload, preview, validation, and bulk import"
```

---

## Task 11: Wire up school detail page with tabs

**Files:**
- Modify: `apps/web/app/platform-admin/schools/[id]/page.tsx`

- [ ] **Step 1: Read the current file**

Read `apps/web/app/platform-admin/schools/[id]/page.tsx`.

- [ ] **Step 2: Replace with tabbed layout**

Replace the entire file:

```tsx
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ToggleActiveButton } from "./toggle-active-button";
import { ViewAsButton } from "./view-as-button";
import { SchoolTabs } from "./school-tabs";
import { OverviewTab } from "./overview-tab";
import { UsersTab } from "./users-tab";
import { ImportTab } from "./import-tab";

export default async function SchoolDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const activeTab = tab ?? "overview";

  const supabase = createServiceSupabaseClient();
  const { data: school } = await supabase
    .from("schools")
    .select("*")
    .eq("id", id)
    .single();

  if (!school) notFound();

  // Fetch all role rows (including inactive) for the users tab
  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("id, user_id, role, is_active")
    .eq("school_id", id);

  const userIds = [...new Set((roleRows ?? []).map((r) => r.user_id))];
  const { data: profiles } = userIds.length > 0
    ? await supabase.from("profiles").select("id, full_name, email").in("id", userIds)
    : { data: [] };

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  const users = (roleRows ?? []).map((r) => {
    const profile = profileMap.get(r.user_id);
    return {
      id: r.user_id,
      roleId: r.id,
      full_name: profile?.full_name ?? "",
      email: profile?.email ?? "",
      role: r.role,
      is_active: r.is_active,
    };
  });

  // Compute role counts for overview
  const roleCounts = {
    school_admin: users.filter((u) => u.role === "school_admin" && u.is_active).length,
    principal: users.filter((u) => u.role === "principal" && u.is_active).length,
    teacher: users.filter((u) => u.role === "teacher" && u.is_active).length,
    student: users.filter((u) => u.role === "student" && u.is_active).length,
    parent: users.filter((u) => u.role === "parent" && u.is_active).length,
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{school.name}</h1>
          <p className="text-sm text-gray-500">{school.contact_email} · {school.domain}</p>
        </div>
        <div className="flex gap-2">
          <ToggleActiveButton schoolId={school.id} isActive={school.is_active} />
          <ViewAsButton schoolDomain={school.domain ?? ""} />
        </div>
      </div>

      <SchoolTabs schoolId={school.id} />

      {activeTab === "overview" && (
        <OverviewTab school={school} roleCounts={roleCounts} />
      )}
      {activeTab === "users" && (
        <UsersTab schoolId={school.id} users={users} />
      )}
      {activeTab === "import" && (
        <ImportTab schoolId={school.id} />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Type-check and commit**

```bash
pnpm --filter @erp/web type-check
git add apps/web/app/platform-admin/schools/\[id\]/page.tsx
git commit -m "feat: wire up tabbed school detail page — overview, users, bulk import"
```

---

## Task 12: Final type-check and smoke test

- [ ] **Step 1: Full type-check**

```bash
pnpm --filter @erp/web type-check
```

- [ ] **Step 2: Smoke test**

Navigate to `http://core.lvh.me:3000/platform-admin/schools` as super_admin:
- [ ] Click "+ New School" — form should have 4 fields only (no admin fields)
- [ ] Create a school → redirects to school detail page
- [ ] Overview tab shows school info form + role counts
- [ ] Click "Users" tab → shows empty table + "Invite User" button
- [ ] Invite a school_admin → user appears in table
- [ ] Edit role → changes role
- [ ] Deactivate → status changes to Inactive
- [ ] Activate → status changes back to Active
- [ ] Remove → user removed from table
- [ ] Click "Bulk Import" tab → role selector + template download + file upload
- [ ] Upload a CSV → preview table with validation
- [ ] Import → results shown

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "chore: platform admin user management complete"
```
