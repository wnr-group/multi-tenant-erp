# Plan 3: Web Portals — Super Admin + School Admin + Principal

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Super Admin (WnR platform), School Admin, and Principal web portals — all CRUD operations, dashboards, and management screens.

**Architecture:** Next.js App Router server components for data fetching; client components only for interactive forms and tables. shadcn/ui for all UI primitives. Each portal is a separate route group with its own layout and sidebar. Data access via `@erp/shared/supabase/server` client.

**Tech Stack:** Next.js 14 App Router, shadcn/ui, Tailwind CSS, `@supabase/ssr`, Zod

**Prerequisites:** Plan 1 + Plan 2 complete. shadcn/ui initialized in `apps/web`.

---

## File Map

```
apps/web/
├── components/
│   ├── sidebar.tsx                        # reusable sidebar shell
│   └── data-table.tsx                     # reusable paginated table
├── app/
│   ├── (platform-admin)/
│   │   ├── layout.tsx                     # ← already created in Plan 2, add sidebar
│   │   ├── dashboard/
│   │   │   └── page.tsx                   # platform stats
│   │   └── schools/
│   │       ├── page.tsx                   # list all schools
│   │       ├── new/
│   │       │   └── page.tsx               # create school + invite admin
│   │       └── [id]/
│   │           └── page.tsx               # school detail + toggle active
│   ├── (school)/
│   │   ├── admin/
│   │   │   ├── layout.tsx                 # school admin sidebar layout
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── classes/
│   │   │   │   └── page.tsx               # manage classes + sections
│   │   │   ├── teachers/
│   │   │   │   └── page.tsx               # invite + list teachers
│   │   │   ├── students/
│   │   │   │   └── page.tsx               # add + list students
│   │   │   ├── fees/
│   │   │   │   └── page.tsx               # fee structures + payment recording
│   │   │   ├── announcements/
│   │   │   │   └── page.tsx               # create/list announcements
│   │   │   └── settings/
│   │   │       └── page.tsx               # school name, logo
│   │   └── principal/
│   │       ├── layout.tsx                 # principal sidebar layout
│   │       ├── dashboard/
│   │       │   └── page.tsx               # attendance overview + exam results summary
│   │       ├── reports/
│   │       │   └── page.tsx               # attendance + report card PDFs
│   │       ├── discipline/
│   │       │   └── page.tsx               # all discipline records
│   │       └── announcements/
│   │           └── page.tsx               # create announcements
```

---

## Task 1: Initialize shadcn/ui + Shared Components

**Files:**
- Modify: `apps/web/package.json` (add shadcn deps)
- Create: `apps/web/components/sidebar.tsx`
- Create: `apps/web/components/data-table.tsx`

- [ ] **Step 1: Initialize shadcn/ui**

```bash
cd apps/web
npx shadcn@latest init
```

When prompted:
- Style: Default
- Base color: Slate
- CSS variables: Yes

- [ ] **Step 2: Add required shadcn components**

```bash
npx shadcn@latest add button input label table badge card dialog form select
```

- [ ] **Step 3: Create `apps/web/components/sidebar.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
}

interface SidebarProps {
  title: string;
  items: NavItem[];
}

export function Sidebar({ title, items }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-56 flex-col border-r bg-white">
      <div className="border-b px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          {title}
        </p>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "mb-1 flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
              pathname === item.href
                ? "bg-blue-50 text-blue-700"
                : "text-gray-600 hover:bg-gray-100"
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 4: Create `apps/web/components/data-table.tsx`**

```tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  emptyMessage = "No records found.",
}: DataTableProps<T>) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col, i) => (
              <TableHead key={i}>{col.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="py-8 text-center text-sm text-gray-400"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => (
              <TableRow key={row.id}>
                {columns.map((col, i) => (
                  <TableCell key={i}>
                    {typeof col.accessor === "function"
                      ? col.accessor(row)
                      : (row[col.accessor] as React.ReactNode)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 5: Create `apps/web/app/api/invite-user/route.ts`**

All user invite operations (school admin, teacher, student) require `supabase.auth.admin` which needs the service role key. This MUST run server-side. Client forms call this API route instead.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@erp/shared/supabase/server";

export async function POST(request: NextRequest) {
  // Verify caller is authenticated and has admin/super_admin role
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!roleRow || !["super_admin", "school_admin"].includes(roleRow.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { email, fullName, schoolId, role, extraInserts } = await request.json() as {
    email: string;
    fullName: string;
    schoolId: string;
    role: string;
    extraInserts?: { table: string; data: Record<string, unknown> }[];
  };

  // Use service role client for admin operations
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Invite the user
  const { data: inviteData, error: inviteError } =
    await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName },
    });

  if (inviteError || !inviteData.user) {
    return NextResponse.json(
      { error: inviteError?.message ?? "Failed to invite user" },
      { status: 400 }
    );
  }

  const userId = inviteData.user.id;

  // Assign role
  await adminClient.from("user_roles").insert({
    user_id: userId,
    school_id: schoolId,
    role,
  });

  // Set school_id on profile
  await adminClient
    .from("profiles")
    .update({ school_id: schoolId, full_name: fullName })
    .eq("id", userId);

  // Run any extra inserts (e.g. teacher_profiles, student_profiles)
  if (extraInserts) {
    for (const { table, data } of extraInserts) {
      await adminClient.from(table).insert({ ...data, profile_id: userId });
    }
  }

  return NextResponse.json({ userId });
}
```

- [ ] **Step 6: Commit**

```bash
cd ~/Documents/balaji-erp
git add apps/web
git commit -m "feat: init shadcn/ui, shared components, and server-side invite API"
```

---

## Task 2: Platform Admin — Dashboard + Schools CRUD

**Files:**
- Modify: `apps/web/app/(platform-admin)/layout.tsx`
- Create: `apps/web/app/(platform-admin)/dashboard/page.tsx`
- Create: `apps/web/app/(platform-admin)/schools/page.tsx`
- Create: `apps/web/app/(platform-admin)/schools/new/page.tsx`
- Create: `apps/web/app/(platform-admin)/schools/[id]/page.tsx`

- [ ] **Step 1: Update `apps/web/app/(platform-admin)/layout.tsx` with sidebar**

```tsx
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@erp/shared/supabase/server";
import { Sidebar } from "@/components/sidebar";

const NAV = [
  { label: "Dashboard", href: "/platform-admin/dashboard" },
  { label: "Schools", href: "/platform-admin/schools" },
];

export default async function PlatformAdminLayout({
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

  if (roleRow?.role !== "super_admin") redirect("/login");

  return (
    <div className="flex h-screen">
      <Sidebar title="WnR Platform" items={NAV} />
      <main className="flex-1 overflow-y-auto bg-gray-50 p-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Create `apps/web/app/(platform-admin)/dashboard/page.tsx`**

```tsx
import { createServerSupabaseClient } from "@erp/shared/supabase/server";

export default async function PlatformDashboard() {
  const supabase = await createServerSupabaseClient();

  const [{ count: schoolCount }, { count: userCount }] = await Promise.all([
    supabase.from("schools").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
  ]);

  const stats = [
    { label: "Total Schools", value: schoolCount ?? 0 },
    { label: "Total Users", value: userCount ?? 0 },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Platform Overview</h1>
      <div className="grid grid-cols-2 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `apps/web/app/(platform-admin)/schools/page.tsx`**

```tsx
import Link from "next/link";
import { createServerSupabaseClient } from "@erp/shared/supabase/server";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function SchoolsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: schools } = await supabase
    .from("schools")
    .select("id, name, contact_email, is_active, created_at")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Schools</h1>
        <Button asChild>
          <Link href="/platform-admin/schools/new">+ New School</Link>
        </Button>
      </div>
      <DataTable
        data={schools ?? []}
        columns={[
          { header: "Name", accessor: "name" },
          { header: "Email", accessor: "contact_email" },
          {
            header: "Status",
            accessor: (row) => (
              <Badge variant={row.is_active ? "default" : "secondary"}>
                {row.is_active ? "Active" : "Inactive"}
              </Badge>
            ),
          },
          {
            header: "",
            accessor: (row) => (
              <Link
                href={`/platform-admin/schools/${row.id}`}
                className="text-sm text-blue-600 hover:underline"
              >
                View
              </Link>
            ),
          },
        ]}
        emptyMessage="No schools yet. Create one to get started."
      />
    </div>
  );
}
```

- [ ] **Step 4: Create `apps/web/app/(platform-admin)/schools/new/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@erp/shared/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NewSchoolPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#2563EB");
  const [contactEmail, setContactEmail] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminName, setAdminName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    // 1. Create school
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

    // 2. Invite school admin via server-side API (requires service role key)
    const res = await fetch("/api/invite-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: adminEmail,
        fullName: adminName,
        schoolId: school.id,
        role: "school_admin",
      }),
    });

    if (!res.ok) {
      const { error: msg } = await res.json();
      setError(msg ?? "Failed to invite admin");
      setLoading(false);
      return;
    }

    router.push("/platform-admin/schools");
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
          <Label>Web Domain (e.g. greenvalley.balajierp.com)</Label>
          <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="schoolname.balajierp.com" required />
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
        <hr className="my-2" />
        <p className="text-sm font-medium text-gray-700">School Admin</p>
        <div>
          <Label>Admin Full Name</Label>
          <Input value={adminName} onChange={(e) => setAdminName(e.target.value)} required />
        </div>
        <div>
          <Label>Admin Email</Label>
          <Input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Creating…" : "Create School & Invite Admin"}
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 5: Create `apps/web/app/(platform-admin)/schools/[id]/page.tsx`**

```tsx
import { createServerSupabaseClient } from "@erp/shared/supabase/server";
import { notFound } from "next/navigation";
import { ToggleActiveButton } from "./toggle-active-button";
import { ViewAsButton } from "./view-as-button";

export default async function SchoolDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createServerSupabaseClient();
  const { data: school } = await supabase
    .from("schools")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!school) notFound();

  const { data: users } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("school_id", params.id);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{school.name}</h1>
          <p className="text-sm text-gray-500">{school.contact_email}</p>
        </div>
        <div className="flex gap-2">
          <ToggleActiveButton schoolId={school.id} isActive={school.is_active} />
          <ViewAsButton schoolDomain={school.domain ?? ""} />
        </div>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-800">Users ({users?.length ?? 0})</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-2">Name</th>
              <th className="pb-2">Email</th>
            </tr>
          </thead>
          <tbody>
            {users?.map((u) => (
              <tr key={u.id} className="border-b last:border-0">
                <td className="py-2">{u.full_name}</td>
                <td className="py-2 text-gray-500">{u.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create `apps/web/app/(platform-admin)/schools/[id]/toggle-active-button.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@erp/shared/supabase/client";
import { Button } from "@/components/ui/button";

export function ToggleActiveButton({
  schoolId,
  isActive,
}: {
  schoolId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const supabase = createClient();
    await supabase
      .from("schools")
      .update({ is_active: !isActive })
      .eq("id", schoolId);
    router.refresh();
    setLoading(false);
  }

  return (
    <Button
      variant={isActive ? "destructive" : "default"}
      onClick={toggle}
      disabled={loading}
    >
      {loading ? "Updating…" : isActive ? "Deactivate School" : "Activate School"}
    </Button>
  );
}
```

- [ ] **Step 7: Create `apps/web/app/(platform-admin)/schools/[id]/view-as-button.tsx`**

This button lets the Platform Admin switch context into a school's portal as a specific role. It sets an `acting_as` cookie then redirects to the school's domain.

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ViewAsButton({ schoolDomain }: { schoolDomain: string }) {
  const [loading, setLoading] = useState(false);

  async function switchContext(role: string) {
    if (!schoolDomain) return;
    setLoading(true);
    // Set acting_as cookie then redirect to school domain
    await fetch("/api/context-switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, schoolDomain }),
    });
    // Redirect to school's domain
    window.location.href = `https://${schoolDomain}/${role === "school_admin" ? "admin" : role}/dashboard`;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={loading || !schoolDomain}>
          View as…
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => switchContext("school_admin")}>
          School Admin
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchContext("principal")}>
          Principal
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchContext("teacher")}>
          Teacher
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 8: Create `apps/web/app/api/context-switch/route.ts`**

This API route sets the `acting_as` cookie on the school's domain by redirecting through it.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@erp/shared/supabase/server";

export async function POST(request: NextRequest) {
  const { role, schoolDomain } = await request.json() as { role: string; schoolDomain: string };

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Log the context switch in audit_log
  await supabase.from("audit_log").insert({
    performed_by: user.id,
    acting_as_role: role,
    action: "context_switch.enter",
    entity_type: "school",
    metadata: { school_domain: schoolDomain, target_role: role },
  });

  const response = NextResponse.json({ ok: true });
  // Set acting_as cookie — readable by middleware on the school domain
  response.cookies.set("acting_as", role, {
    httpOnly: false,
    path: "/",
    domain: schoolDomain.includes("balajierp.com") ? ".balajierp.com" : schoolDomain,
    maxAge: 60 * 60 * 8, // 8 hours
    sameSite: "lax",
    secure: true,
  });
  return response;
}
```

- [ ] **Step 9: Create `apps/web/components/context-switch-banner.tsx`**

This banner appears at the top of every school portal page when a user is in a context-switched session.

```tsx
import { headers } from "next/headers";
import { ExitContextButton } from "./exit-context-button";

export async function ContextSwitchBanner() {
  const headersList = await headers();
  const actingAs = headersList.get("x-acting-as");
  const realRole = headersList.get("x-real-role");

  if (!actingAs) return null;

  const roleLabels: Record<string, string> = {
    school_admin: "School Admin",
    principal: "Principal",
    teacher: "Teacher",
  };

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between bg-amber-400 px-4 py-2 text-sm font-medium text-amber-900">
      <span>
        You are viewing as <strong>{roleLabels[actingAs] ?? actingAs}</strong>.
        Actions are logged under your real identity ({realRole}).
      </span>
      <ExitContextButton />
    </div>
  );
}
```

- [ ] **Step 10: Create `apps/web/components/exit-context-button.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ExitContextButton() {
  const router = useRouter();

  async function exit() {
    await fetch("/api/context-exit", { method: "POST" });
    // Return to platform admin
    window.location.href = `https://admin.balajierp.com/platform-admin/dashboard`;
  }

  return (
    <Button size="sm" variant="outline" onClick={exit} className="border-amber-700 text-amber-900 hover:bg-amber-500">
      Exit View
    </Button>
  );
}
```

- [ ] **Step 11: Create `apps/web/app/api/context-exit/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@erp/shared/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    await supabase.from("audit_log").insert({
      performed_by: user.id,
      acting_as_role: "super_admin",
      action: "context_switch.exit",
      entity_type: "session",
      metadata: {},
    });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete("acting_as");
  return response;
}
```

- [ ] **Step 12: Add `ContextSwitchBanner` to school portal layouts**

In `apps/web/app/(school)/admin/layout.tsx`, `apps/web/app/(school)/principal/layout.tsx`, and `apps/web/app/(school)/teacher/layout.tsx`, import and render the banner at the top:

```tsx
import { ContextSwitchBanner } from "@/components/context-switch-banner";

// Inside the layout return:
return (
  <div className="flex h-screen flex-col">
    <ContextSwitchBanner />
    <div className="flex flex-1 overflow-hidden">
      <Sidebar title="..." items={NAV} />
      <main className="flex-1 overflow-y-auto bg-gray-50 p-8">{children}</main>
    </div>
  </div>
);
```

- [ ] **Step 13: Add shadcn dropdown-menu component**

```bash
cd apps/web
npx shadcn@latest add dropdown-menu
```

- [ ] **Step 14: Create `apps/web/components/switch-role-panel.tsx`**

This reusable component is used by School Admin and Principal dashboards to switch into lower role views. It sets the `acting_as` cookie via the same `/api/context-switch` API route.

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const ROLE_LABELS: Record<string, string> = {
  school_admin: "School Admin",
  principal: "Principal",
  teacher: "Teacher",
};

const ROLE_PATHS: Record<string, string> = {
  school_admin: "/admin/dashboard",
  principal: "/principal/dashboard",
  teacher: "/teacher/dashboard",
};

export function SwitchRolePanel({ roles }: { roles: string[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function switchTo(role: string) {
    setLoading(true);
    await fetch("/api/context-switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, schoolDomain: window.location.hostname }),
    });
    router.push(ROLE_PATHS[role] ?? "/");
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="rounded-lg bg-white p-5 shadow-sm">
      <p className="mb-3 text-sm font-medium text-gray-700">View portal as:</p>
      <div className="flex gap-2">
        {roles.map((role) => (
          <Button
            key={role}
            variant="outline"
            onClick={() => switchTo(role)}
            disabled={loading}
          >
            {ROLE_LABELS[role] ?? role} View
          </Button>
        ))}
      </div>
      <p className="mt-2 text-xs text-gray-400">
        Your actions remain logged under your real identity.
      </p>
    </div>
  );
}
```

- [ ] **Step 15: Type-check**

```bash
pnpm --filter @erp/web type-check
```

Expected: 0 errors.

- [ ] **Step 16: Commit**

```bash
git add apps/web
git commit -m "feat: platform admin dashboard + schools CRUD, context switching, banner, audit log"
```

---

## Task 3: School Admin Portal

**Files:**
- Create: `apps/web/app/(school)/admin/layout.tsx`
- Create: `apps/web/app/(school)/admin/dashboard/page.tsx`
- Create: `apps/web/app/(school)/admin/classes/page.tsx`
- Create: `apps/web/app/(school)/admin/teachers/page.tsx`
- Create: `apps/web/app/(school)/admin/students/page.tsx`
- Create: `apps/web/app/(school)/admin/fees/page.tsx`
- Create: `apps/web/app/(school)/admin/announcements/page.tsx`
- Create: `apps/web/app/(school)/admin/settings/page.tsx`

- [ ] **Step 1: Create `apps/web/app/(school)/admin/layout.tsx`**

```tsx
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@erp/shared/supabase/server";
import { Sidebar } from "@/components/sidebar";
import { ContextSwitchBanner } from "@/components/context-switch-banner";

const NAV = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Classes", href: "/admin/classes" },
  { label: "Teachers", href: "/admin/teachers" },
  { label: "Students", href: "/admin/students" },
  { label: "Fees", href: "/admin/fees" },
  { label: "Announcements", href: "/admin/announcements" },
  { label: "Settings", href: "/admin/settings" },
];

export default async function AdminLayout({
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

  // School Admin portal: accessible by school_admin, or higher roles via context switch
  const allowed = ["school_admin", "super_admin"];
  if (!roleRow || !allowed.includes(roleRow.role)) redirect("/login");

  return (
    <div className="flex h-screen flex-col">
      <ContextSwitchBanner />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar title="School Admin" items={NAV} />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-8">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `apps/web/app/(school)/admin/dashboard/page.tsx`**

```tsx
import { createServerSupabaseClient } from "@erp/shared/supabase/server";

export default async function AdminDashboard() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id")
    .eq("id", user!.id)
    .single();

  const schoolId = profile?.school_id;

  const [{ count: teacherCount }, { count: studentCount }] = await Promise.all([
    supabase
      .from("teacher_profiles")
      .select("*", { count: "exact", head: true })
      .eq("school_id", schoolId),
    supabase
      .from("student_profiles")
      .select("*", { count: "exact", head: true })
      .eq("school_id", schoolId),
  ]);

  const stats = [
    { label: "Teachers", value: teacherCount ?? 0 },
    { label: "Students", value: studentCount ?? 0 },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">School Overview</h1>
      <div className="grid grid-cols-2 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>
      {/* School Admin can switch context to view the school as Principal or Teacher */}
      <SwitchRolePanel roles={["principal", "teacher"]} />
    </div>
  );
}
```

- [ ] **Step 3: Create `apps/web/app/(school)/admin/classes/page.tsx`**

```tsx
import { createServerSupabaseClient } from "@erp/shared/supabase/server";
import { DataTable } from "@/components/data-table";
import { AddClassForm } from "./add-class-form";

export default async function ClassesPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id")
    .eq("id", user!.id)
    .single();

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, order")
    .eq("school_id", profile!.school_id!)
    .order("order");

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Classes</h1>
      <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
        <AddClassForm schoolId={profile!.school_id!} />
      </div>
      <DataTable
        data={classes ?? []}
        columns={[
          { header: "Class Name", accessor: "name" },
          { header: "Order", accessor: "order" },
        ]}
        emptyMessage="No classes yet."
      />
    </div>
  );
}
```

- [ ] **Step 4: Create `apps/web/app/(school)/admin/classes/add-class-form.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@erp/shared/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddClassForm({ schoolId }: { schoolId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    await supabase.from("classes").insert({ school_id: schoolId, name });
    setName("");
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      <div className="flex-1">
        <Label>Class Name (e.g., "Class 10")</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Adding…" : "Add Class"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 5: Create `apps/web/app/(school)/admin/teachers/page.tsx`**

```tsx
import { createServerSupabaseClient } from "@erp/shared/supabase/server";
import { DataTable } from "@/components/data-table";
import { InviteTeacherForm } from "./invite-teacher-form";

export default async function TeachersPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id")
    .eq("id", user!.id)
    .single();

  const { data: teachers } = await supabase
    .from("teacher_profiles")
    .select("id, profile:profiles(full_name, email)")
    .eq("school_id", profile!.school_id!);

  const rows = (teachers ?? []).map((t) => ({
    id: t.id,
    name: (t.profile as { full_name: string; email: string } | null)?.full_name ?? "",
    email: (t.profile as { full_name: string; email: string } | null)?.email ?? "",
  }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Teachers</h1>
      <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
        <InviteTeacherForm schoolId={profile!.school_id!} />
      </div>
      <DataTable
        data={rows}
        columns={[
          { header: "Name", accessor: "name" },
          { header: "Email", accessor: "email" },
        ]}
        emptyMessage="No teachers yet."
      />
    </div>
  );
}
```

- [ ] **Step 6: Create `apps/web/app/(school)/admin/teachers/invite-teacher-form.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function InviteTeacherForm({ schoolId }: { schoolId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/invite-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        fullName: name,
        schoolId,
        role: "teacher",
        extraInserts: [
          { table: "teacher_profiles", data: { school_id: schoolId } },
        ],
      }),
    });

    if (!res.ok) {
      const { error: msg } = await res.json();
      setError(msg ?? "Invite failed");
      setLoading(false);
      return;
    }

    setName("");
    setEmail("");
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
      <div>
        <Label>Full Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <Label>Email</Label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Inviting…" : "Invite Teacher"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 7: Create `apps/web/app/(school)/admin/students/page.tsx`**

```tsx
import { createServerSupabaseClient } from "@erp/shared/supabase/server";
import { DataTable } from "@/components/data-table";
import { AddStudentForm } from "./add-student-form";

export default async function StudentsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id")
    .eq("id", user!.id)
    .single();

  const schoolId = profile!.school_id!;

  const [{ data: students }, { data: classes }] = await Promise.all([
    supabase
      .from("student_profiles")
      .select("id, roll_number, admission_number, profile:profiles(full_name, email), class:classes(name), section:sections(name)")
      .eq("school_id", schoolId),
    supabase.from("classes").select("id, name").eq("school_id", schoolId).order("order"),
  ]);

  const rows = (students ?? []).map((s) => ({
    id: s.id,
    name: (s.profile as { full_name: string } | null)?.full_name ?? "",
    roll: s.roll_number ?? "",
    class: (s.class as { name: string } | null)?.name ?? "",
    section: (s.section as { name: string } | null)?.name ?? "",
  }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Students</h1>
      <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
        <AddStudentForm schoolId={schoolId} classes={classes ?? []} />
      </div>
      <DataTable
        data={rows}
        columns={[
          { header: "Name", accessor: "name" },
          { header: "Roll No.", accessor: "roll" },
          { header: "Class", accessor: "class" },
          { header: "Section", accessor: "section" },
        ]}
        emptyMessage="No students yet."
      />
    </div>
  );
}
```

- [ ] **Step 8: Create `apps/web/app/(school)/admin/students/add-student-form.tsx`**

```tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@erp/shared/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ClassOption { id: string; name: string }
interface SectionOption { id: string; name: string }

export function AddStudentForm({
  schoolId,
  classes,
}: {
  schoolId: string;
  classes: ClassOption[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!classId) return;
    const supabase = createClient();
    supabase.from("sections").select("id, name").eq("class_id", classId).then(({ data }) => {
      setSections(data ?? []);
      setSectionId("");
    });
  }, [classId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

    // Invite via server-side API route (requires service role key)
    const res = await fetch("/api/invite-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        fullName: name,
        schoolId,
        role: "student",
        extraInserts: [
          {
            table: "student_profiles",
            data: {
              school_id: schoolId,
              class_id: classId,
              section_id: sectionId,
              roll_number: rollNumber,
            },
          },
        ],
      }),
    });

    if (!res.ok) {
      const { error: msg } = await res.json();
      setError(msg ?? "Failed to create student account");
      setLoading(false);
      return;
    }

    setName(""); setEmail(""); setRollNumber(""); setClassId(""); setSectionId("");
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
      {error && <p className="col-span-2 text-sm text-red-600">{error}</p>}
      <div>
        <Label>Full Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <Label>Email</Label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div>
        <Label>Roll Number</Label>
        <Input value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} />
      </div>
      <div>
        <Label>Class</Label>
        <Select onValueChange={setClassId} value={classId}>
          <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
          <SelectContent>
            {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Section</Label>
        <Select onValueChange={setSectionId} value={sectionId} disabled={!classId}>
          <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
          <SelectContent>
            {sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-2">
        <Button type="submit" disabled={loading || !sectionId}>
          {loading ? "Adding…" : "Add Student"}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 9: Create `apps/web/app/(school)/admin/fees/page.tsx`**

```tsx
import { createServerSupabaseClient } from "@erp/shared/supabase/server";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";

export default async function FeesPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("school_id").eq("id", user!.id).single();

  const { data: payments } = await supabase
    .from("fee_payments")
    .select("id, amount_paid, status, payment_date, student:profiles(full_name), fee_structure:fee_structures(fee_type, amount)")
    .eq("school_id", profile!.school_id!)
    .order("created_at", { ascending: false });

  const rows = (payments ?? []).map((p) => ({
    id: p.id,
    student: (p.student as { full_name: string } | null)?.full_name ?? "",
    fee_type: (p.fee_structure as { fee_type: string; amount: number } | null)?.fee_type ?? "",
    amount: `₹${(p.fee_structure as { fee_type: string; amount: number } | null)?.amount ?? 0}`,
    paid: `₹${p.amount_paid}`,
    date: p.payment_date ?? "—",
    status: p.status,
  }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Fee Payments</h1>
      <DataTable
        data={rows}
        columns={[
          { header: "Student", accessor: "student" },
          { header: "Fee Type", accessor: "fee_type" },
          { header: "Amount", accessor: "amount" },
          { header: "Paid", accessor: "paid" },
          { header: "Date", accessor: "date" },
          {
            header: "Status",
            accessor: (row) => (
              <Badge
                variant={
                  row.status === "paid"
                    ? "default"
                    : row.status === "partial"
                    ? "secondary"
                    : "destructive"
                }
              >
                {row.status}
              </Badge>
            ),
          },
        ]}
        emptyMessage="No fee records yet."
      />
    </div>
  );
}
```

- [ ] **Step 10: Create `apps/web/app/(school)/admin/announcements/page.tsx`**

```tsx
import { createServerSupabaseClient } from "@erp/shared/supabase/server";
import { DataTable } from "@/components/data-table";
import { CreateAnnouncementForm } from "./create-announcement-form";

export default async function AnnouncementsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("school_id").eq("id", user!.id).single();

  const { data: announcements } = await supabase
    .from("announcements")
    .select("id, title, target_type, created_at")
    .eq("school_id", profile!.school_id!)
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Announcements</h1>
      <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
        <CreateAnnouncementForm schoolId={profile!.school_id!} createdBy={user!.id} />
      </div>
      <DataTable
        data={announcements ?? []}
        columns={[
          { header: "Title", accessor: "title" },
          { header: "Target", accessor: "target_type" },
          { header: "Date", accessor: (row) => new Date(row.created_at).toLocaleDateString() },
        ]}
        emptyMessage="No announcements yet."
      />
    </div>
  );
}
```

- [ ] **Step 11: Create `apps/web/app/(school)/admin/announcements/create-announcement-form.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@erp/shared/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateAnnouncementForm({
  schoolId,
  createdBy,
}: {
  schoolId: string;
  createdBy: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    await supabase.from("announcements").insert({
      school_id: schoolId,
      title,
      content,
      target_type: "school",
      created_by: createdBy,
    });
    setTitle("");
    setContent("");
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Label>Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div>
        <Label>Content</Label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          rows={3}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Posting…" : "Post Announcement"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 12: Create `apps/web/app/(school)/admin/settings/page.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@erp/shared/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("profiles").select("school_id").eq("id", user.id).single().then(({ data: p }) => {
        if (!p?.school_id) return;
        setSchoolId(p.school_id);
        supabase.from("schools").select("name, contact_email").eq("id", p.school_id).single().then(({ data: s }) => {
          if (!s) return;
          setName(s.name);
          setContactEmail(s.contact_email ?? "");
        });
      });
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolId) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.from("schools").update({ name, contact_email: contactEmail }).eq("id", schoolId);
    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">School Settings</h1>
      <form onSubmit={handleSave} className="space-y-4 rounded-lg bg-white p-6 shadow-sm">
        <div>
          <Label>School Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <Label>Contact Email</Label>
          <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
        </div>
        <Button type="submit" disabled={loading}>
          {saved ? "Saved!" : loading ? "Saving…" : "Save Changes"}
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 13: Type-check**

```bash
pnpm --filter @erp/web type-check
```

Expected: 0 errors.

- [ ] **Step 14: Commit**

```bash
git add apps/web
git commit -m "feat: school admin portal — dashboard, classes, teachers, students, fees, announcements, settings"
```

---

## Task 4: Principal Portal

**Files:**
- Create: `apps/web/app/(school)/principal/layout.tsx`
- Create: `apps/web/app/(school)/principal/dashboard/page.tsx`
- Create: `apps/web/app/(school)/principal/reports/page.tsx`
- Create: `apps/web/app/(school)/principal/discipline/page.tsx`
- Create: `apps/web/app/(school)/principal/announcements/page.tsx`

- [ ] **Step 1: Create `apps/web/app/(school)/principal/layout.tsx`**

```tsx
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@erp/shared/supabase/server";
import { Sidebar } from "@/components/sidebar";
import { ContextSwitchBanner } from "@/components/context-switch-banner";

const NAV = [
  { label: "Dashboard", href: "/principal/dashboard" },
  { label: "Reports", href: "/principal/reports" },
  { label: "Discipline", href: "/principal/discipline" },
  { label: "Announcements", href: "/principal/announcements" },
];

export default async function PrincipalLayout({
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

  // Principal portal: accessible by principal, school_admin, or super_admin (context switch)
  const allowed = ["principal", "school_admin", "super_admin"];
  if (!roleRow || !allowed.includes(roleRow.role)) redirect("/login");

  return (
    <div className="flex h-screen flex-col">
      <ContextSwitchBanner />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar title="Principal" items={NAV} />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-8">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `apps/web/app/(school)/principal/dashboard/page.tsx`**

```tsx
import { createServerSupabaseClient } from "@erp/shared/supabase/server";

export default async function PrincipalDashboard() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("school_id").eq("id", user!.id).single();
  const schoolId = profile!.school_id!;

  const today = new Date().toISOString().split("T")[0];

  const [{ count: presentToday }, { count: absentToday }, { count: totalStudents }] =
    await Promise.all([
      supabase.from("attendance_records").select("*", { count: "exact", head: true }).eq("school_id", schoolId).eq("date", today).eq("status", "present"),
      supabase.from("attendance_records").select("*", { count: "exact", head: true }).eq("school_id", schoolId).eq("date", today).eq("status", "absent"),
      supabase.from("student_profiles").select("*", { count: "exact", head: true }).eq("school_id", schoolId),
    ]);

  const stats = [
    { label: "Present Today", value: presentToday ?? 0 },
    { label: "Absent Today", value: absentToday ?? 0 },
    { label: "Total Students", value: totalStudents ?? 0 },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Principal Dashboard</h1>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>
      {/* Principal can switch context to Teacher view */}
      <SwitchRolePanel roles={["teacher"]} />
    </div>
  );
}
```

- [ ] **Step 3: Create `apps/web/app/(school)/principal/discipline/page.tsx`**

```tsx
import { createServerSupabaseClient } from "@erp/shared/supabase/server";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";

export default async function DisciplinePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("school_id").eq("id", user!.id).single();

  const { data: records } = await supabase
    .from("discipline_records")
    .select("id, category, severity, description, created_at, student:profiles(full_name)")
    .eq("school_id", profile!.school_id!)
    .order("created_at", { ascending: false });

  const rows = (records ?? []).map((r) => ({
    id: r.id,
    student: (r.student as { full_name: string } | null)?.full_name ?? "",
    category: r.category,
    severity: r.severity,
    description: r.description,
    date: new Date(r.created_at).toLocaleDateString(),
  }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Discipline Records</h1>
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
        emptyMessage="No discipline records."
      />
    </div>
  );
}
```

- [ ] **Step 4: Create `apps/web/app/(school)/principal/reports/page.tsx`**

```tsx
import { createServerSupabaseClient } from "@erp/shared/supabase/server";
import { DataTable } from "@/components/data-table";

export default async function ReportsPage() {
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
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Reports</h1>
      <h2 className="mb-3 text-base font-semibold text-gray-700">Exams</h2>
      <DataTable
        data={exams ?? []}
        columns={[
          { header: "Exam", accessor: "name" },
          { header: "Start", accessor: (row) => row.start_date ?? "—" },
          { header: "End", accessor: (row) => row.end_date ?? "—" },
        ]}
        emptyMessage="No exams defined yet."
      />
    </div>
  );
}
```

- [ ] **Step 5: Create `apps/web/app/(school)/principal/announcements/page.tsx`**

```tsx
import { createServerSupabaseClient } from "@erp/shared/supabase/server";
import { DataTable } from "@/components/data-table";
import { CreateAnnouncementForm } from "../../admin/announcements/create-announcement-form";

export default async function PrincipalAnnouncementsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("school_id").eq("id", user!.id).single();

  const { data: announcements } = await supabase
    .from("announcements")
    .select("id, title, target_type, created_at")
    .eq("school_id", profile!.school_id!)
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Announcements</h1>
      <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
        <CreateAnnouncementForm schoolId={profile!.school_id!} createdBy={user!.id} />
      </div>
      <DataTable
        data={announcements ?? []}
        columns={[
          { header: "Title", accessor: "title" },
          { header: "Target", accessor: "target_type" },
          { header: "Date", accessor: (row) => new Date(row.created_at).toLocaleDateString() },
        ]}
        emptyMessage="No announcements yet."
      />
    </div>
  );
}
```

- [ ] **Step 6: Type-check**

```bash
pnpm --filter @erp/web type-check
```

Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add apps/web
git commit -m "feat: principal portal — dashboard, reports, discipline, announcements"
```

---

## Task 5: School Admin — Section Management, Timetable CRUD, Academic Year + Exam CRUD, Fee Structure Creation

These pages were missing from the initial plan and are required for the teacher and parent experiences to function.

**Files:**
- Create: `apps/web/app/(school)/admin/classes/add-section-form.tsx`
- Create: `apps/web/app/(school)/admin/timetable/page.tsx`
- Create: `apps/web/app/(school)/admin/timetable/add-timetable-form.tsx`
- Create: `apps/web/app/(school)/admin/academics/page.tsx`
- Create: `apps/web/app/(school)/admin/academics/add-exam-form.tsx`
- Create: `apps/web/app/(school)/admin/fees/add-fee-structure-form.tsx`
- Create: `apps/web/app/(school)/admin/fees/record-payment-form.tsx`

- [ ] **Step 1: Create `apps/web/app/(school)/admin/classes/add-section-form.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@erp/shared/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function AddSectionForm({
  schoolId,
  classes,
}: {
  schoolId: string;
  classes: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [classId, setClassId] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    await supabase.from("sections").insert({ school_id: schoolId, class_id: classId, name });
    setName(""); setClassId("");
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3 mt-4">
      <div>
        <Label>Class</Label>
        <Select onValueChange={setClassId} value={classId}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Section Name (e.g. "A")</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <Button type="submit" disabled={loading || !classId}>
        {loading ? "Adding…" : "Add Section"}
      </Button>
    </form>
  );
}
```

Update `apps/web/app/(school)/admin/classes/page.tsx` to import and render `AddSectionForm` below the class form, and list existing sections per class.

- [ ] **Step 2: Add timetable nav item to admin sidebar**

In the admin layout's `NAV` array, add:
```typescript
{ label: "Timetable", href: "/admin/timetable" },
{ label: "Academics", href: "/admin/academics" },
```

- [ ] **Step 3: Create `apps/web/app/(school)/admin/timetable/page.tsx`**

```tsx
import { createServerSupabaseClient } from "@erp/shared/supabase/server";
import { DataTable } from "@/components/data-table";
import { AddTimetableForm } from "./add-timetable-form";

const DAYS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default async function TimetablePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("school_id").eq("id", user!.id).single();
  const schoolId = profile!.school_id!;

  const [{ data: slots }, { data: sections }, { data: subjects }, { data: teachers }] = await Promise.all([
    supabase.from("timetable").select("id, day_of_week, period, subject:subjects(name), section:sections(name, class:classes(name)), teacher:profiles(full_name)").eq("school_id", schoolId).order("day_of_week").order("period"),
    supabase.from("sections").select("id, name, class:classes(name)").eq("school_id", schoolId),
    supabase.from("subjects").select("id, name").eq("school_id", schoolId),
    supabase.from("teacher_profiles").select("profile_id, profile:profiles(full_name)").eq("school_id", schoolId),
  ]);

  const rows = (slots ?? []).map((s) => ({
    id: s.id,
    day: DAYS[s.day_of_week] ?? "",
    period: `P${s.period}`,
    subject: (s.subject as { name: string } | null)?.name ?? "",
    section: `${(s.section as { name: string; class: { name: string } } | null)?.class?.name ?? ""} - ${(s.section as { name: string } | null)?.name ?? ""}`,
    teacher: (s.teacher as { full_name: string } | null)?.full_name ?? "",
  }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Timetable</h1>
      <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
        <AddTimetableForm
          schoolId={schoolId}
          sections={(sections ?? []).map((s) => ({ id: s.id, label: `${(s.class as { name: string } | null)?.name ?? ""} - ${s.name}` }))}
          subjects={(subjects ?? []).map((s) => ({ id: s.id, name: s.name }))}
          teachers={(teachers ?? []).map((t) => ({ id: t.profile_id, name: (t.profile as { full_name: string } | null)?.full_name ?? "" }))}
        />
      </div>
      <DataTable data={rows} columns={[
        { header: "Day", accessor: "day" },
        { header: "Period", accessor: "period" },
        { header: "Section", accessor: "section" },
        { header: "Subject", accessor: "subject" },
        { header: "Teacher", accessor: "teacher" },
      ]} emptyMessage="No timetable entries yet." />
    </div>
  );
}
```

- [ ] **Step 4: Create `apps/web/app/(school)/admin/timetable/add-timetable-form.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@erp/shared/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Option { id: string; name?: string; label?: string }

const DAYS = [
  { value: "1", label: "Monday" }, { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" }, { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" }, { value: "6", label: "Saturday" },
];

export function AddTimetableForm({ schoolId, sections, subjects, teachers }: {
  schoolId: string; sections: Option[]; subjects: Option[]; teachers: Option[];
}) {
  const router = useRouter();
  const [sectionId, setSectionId] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("");
  const [period, setPeriod] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    await supabase.from("timetable").insert({
      school_id: schoolId, section_id: sectionId,
      day_of_week: parseInt(dayOfWeek), period: parseInt(period),
      subject_id: subjectId, teacher_id: teacherId,
    });
    setSectionId(""); setDayOfWeek(""); setPeriod(""); setSubjectId(""); setTeacherId("");
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-3 gap-3">
      <div>
        <Label>Section</Label>
        <Select onValueChange={setSectionId} value={sectionId}>
          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>{sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.label ?? s.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label>Day</Label>
        <Select onValueChange={setDayOfWeek} value={dayOfWeek}>
          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>{DAYS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label>Period</Label>
        <Input type="number" min={1} max={10} value={period} onChange={(e) => setPeriod(e.target.value)} required />
      </div>
      <div>
        <Label>Subject</Label>
        <Select onValueChange={setSubjectId} value={subjectId}>
          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label>Teacher</Label>
        <Select onValueChange={setTeacherId} value={teacherId}>
          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>{teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="flex items-end">
        <Button type="submit" disabled={loading || !sectionId || !dayOfWeek || !period || !subjectId || !teacherId}>
          {loading ? "Adding…" : "Add Slot"}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 5: Create `apps/web/app/(school)/admin/academics/page.tsx`**

Manages academic years and exams.

```tsx
import { createServerSupabaseClient } from "@erp/shared/supabase/server";
import { DataTable } from "@/components/data-table";
import { AddExamForm } from "./add-exam-form";
import { AddAcademicYearForm } from "./add-academic-year-form";

export default async function AcademicsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("school_id").eq("id", user!.id).single();
  const schoolId = profile!.school_id!;

  const [{ data: years }, { data: exams }] = await Promise.all([
    supabase.from("academic_years").select("id, name, start_date, end_date, is_current").eq("school_id", schoolId).order("start_date", { ascending: false }),
    supabase.from("exams").select("id, name, start_date, end_date, academic_year:academic_years(name)").eq("school_id", schoolId).order("start_date", { ascending: false }),
  ]);

  const examRows = (exams ?? []).map((e) => ({
    id: e.id,
    name: e.name,
    year: (e.academic_year as { name: string } | null)?.name ?? "",
    start: e.start_date ?? "—",
    end: e.end_date ?? "—",
  }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Academics</h1>

      <h2 className="mb-3 text-base font-semibold text-gray-700">Academic Years</h2>
      <div className="mb-4 rounded-lg bg-white p-6 shadow-sm">
        <AddAcademicYearForm schoolId={schoolId} />
      </div>
      <DataTable data={years ?? []} columns={[
        { header: "Year", accessor: "name" },
        { header: "Start", accessor: "start_date" },
        { header: "End", accessor: "end_date" },
        { header: "Current", accessor: (row) => row.is_current ? "✓" : "" },
      ]} emptyMessage="No academic years defined." />

      <h2 className="mt-8 mb-3 text-base font-semibold text-gray-700">Exams</h2>
      <div className="mb-4 rounded-lg bg-white p-6 shadow-sm">
        <AddExamForm schoolId={schoolId} academicYears={years ?? []} />
      </div>
      <DataTable data={examRows} columns={[
        { header: "Exam", accessor: "name" },
        { header: "Academic Year", accessor: "year" },
        { header: "Start", accessor: "start" },
        { header: "End", accessor: "end" },
      ]} emptyMessage="No exams defined." />
    </div>
  );
}
```

- [ ] **Step 6: Create `apps/web/app/(school)/admin/academics/add-academic-year-form.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@erp/shared/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddAcademicYearForm({ schoolId }: { schoolId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    await supabase.from("academic_years").insert({
      school_id: schoolId, name, start_date: startDate, end_date: endDate, is_current: true,
    });
    setName(""); setStartDate(""); setEndDate("");
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div><Label>Name (e.g. "2026-27")</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
      <div><Label>Start Date</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required /></div>
      <div><Label>End Date</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required /></div>
      <Button type="submit" disabled={loading}>{loading ? "Adding…" : "Add Year"}</Button>
    </form>
  );
}
```

- [ ] **Step 7: Create `apps/web/app/(school)/admin/academics/add-exam-form.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@erp/shared/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function AddExamForm({ schoolId, academicYears }: { schoolId: string; academicYears: { id: string; name: string }[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [yearId, setYearId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    await supabase.from("exams").insert({
      school_id: schoolId, academic_year_id: yearId, name,
      start_date: startDate || null, end_date: endDate || null,
    });
    setName(""); setYearId(""); setStartDate(""); setEndDate("");
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div><Label>Exam Name (e.g. "FA1")</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
      <div>
        <Label>Academic Year</Label>
        <Select onValueChange={setYearId} value={yearId}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>{academicYears.map((y) => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div><Label>Start Date</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
      <div><Label>End Date</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
      <Button type="submit" disabled={loading || !yearId}>{loading ? "Adding…" : "Add Exam"}</Button>
    </form>
  );
}
```

- [ ] **Step 8: Add fee structure creation form to fees page**

Create `apps/web/app/(school)/admin/fees/add-fee-structure-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@erp/shared/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function AddFeeStructureForm({ schoolId, classes, academicYears }: {
  schoolId: string;
  classes: { id: string; name: string }[];
  academicYears: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [classId, setClassId] = useState("");
  const [yearId, setYearId] = useState("");
  const [feeType, setFeeType] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    await supabase.from("fee_structures").insert({
      school_id: schoolId, class_id: classId, academic_year_id: yearId,
      fee_type: feeType, amount: parseFloat(amount), due_date: dueDate || null,
    });
    setClassId(""); setYearId(""); setFeeType(""); setAmount(""); setDueDate("");
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-3 gap-3">
      <div>
        <Label>Fee Type</Label>
        <Input value={feeType} onChange={(e) => setFeeType(e.target.value)} placeholder="tuition, transport, lab…" required />
      </div>
      <div>
        <Label>Amount (₹)</Label>
        <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </div>
      <div>
        <Label>Class</Label>
        <Select onValueChange={setClassId} value={classId}>
          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label>Academic Year</Label>
        <Select onValueChange={setYearId} value={yearId}>
          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>{academicYears.map((y) => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label>Due Date</Label>
        <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </div>
      <div className="flex items-end">
        <Button type="submit" disabled={loading || !classId || !yearId || !feeType || !amount}>
          {loading ? "Adding…" : "Add Fee Structure"}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 9: Create syllabus management page**

Add `{ label: "Syllabus", href: "/admin/syllabus" }` to the admin layout NAV.

Create `apps/web/app/(school)/admin/syllabus/page.tsx`:

```tsx
import { createServerSupabaseClient } from "@erp/shared/supabase/server";
import { DataTable } from "@/components/data-table";
import { UploadSyllabusForm } from "./upload-syllabus-form";

export default async function SyllabusPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("school_id").eq("id", user!.id).single();
  const schoolId = profile!.school_id!;

  const [{ data: syllabi }, { data: classes }, { data: subjects }, { data: years }] = await Promise.all([
    supabase.from("syllabus").select("id, file_url, class:classes(name), subject:subjects(name), academic_year:academic_years(name)").eq("school_id", schoolId),
    supabase.from("classes").select("id, name").eq("school_id", schoolId).order("order"),
    supabase.from("subjects").select("id, name, class_id").eq("school_id", schoolId),
    supabase.from("academic_years").select("id, name").eq("school_id", schoolId),
  ]);

  const rows = (syllabi ?? []).map((s) => ({
    id: s.id,
    class: (s.class as { name: string } | null)?.name ?? "",
    subject: (s.subject as { name: string } | null)?.name ?? "",
    year: (s.academic_year as { name: string } | null)?.name ?? "",
    url: s.file_url,
  }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Syllabus</h1>
      <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
        <UploadSyllabusForm schoolId={schoolId} classes={classes ?? []} subjects={subjects ?? []} academicYears={years ?? []} />
      </div>
      <DataTable data={rows} columns={[
        { header: "Class", accessor: "class" },
        { header: "Subject", accessor: "subject" },
        { header: "Academic Year", accessor: "year" },
        { header: "File", accessor: (row) => <a href={row.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">Download</a> },
      ]} emptyMessage="No syllabus uploaded yet." />
    </div>
  );
}
```

- [ ] **Step 10: Create `apps/web/app/(school)/admin/syllabus/upload-syllabus-form.tsx`**

```tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@erp/shared/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Option { id: string; name: string; class_id?: string }

export function UploadSyllabusForm({ schoolId, classes, subjects, academicYears }: {
  schoolId: string; classes: Option[]; subjects: Option[]; academicYears: Option[];
}) {
  const router = useRouter();
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [yearId, setYearId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [filteredSubjects, setFilteredSubjects] = useState<Option[]>([]);

  useEffect(() => {
    setFilteredSubjects(subjects.filter((s) => s.class_id === classId));
    setSubjectId("");
  }, [classId, subjects]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    const supabase = createClient();
    const filePath = `syllabus/${schoolId}/${classId}/${subjectId}/${file.name}`;
    const { error: uploadError } = await supabase.storage.from("files").upload(filePath, file);
    if (uploadError) { setLoading(false); return; }
    const { data: urlData } = supabase.storage.from("files").getPublicUrl(filePath);
    await supabase.from("syllabus").insert({
      school_id: schoolId, class_id: classId, subject_id: subjectId,
      academic_year_id: yearId, file_url: urlData.publicUrl,
    });
    setFile(null); setClassId(""); setSubjectId(""); setYearId("");
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
      <div>
        <Label>Class</Label>
        <Select onValueChange={setClassId} value={classId}>
          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label>Subject</Label>
        <Select onValueChange={setSubjectId} value={subjectId} disabled={!classId}>
          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>{filteredSubjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label>Academic Year</Label>
        <Select onValueChange={setYearId} value={yearId}>
          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>{academicYears.map((y) => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label>PDF File</Label>
        <input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
      </div>
      <div className="col-span-2">
        <Button type="submit" disabled={loading || !classId || !subjectId || !yearId || !file}>
          {loading ? "Uploading…" : "Upload Syllabus"}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 11: Type-check**

```bash
pnpm --filter @erp/web type-check
```

Expected: 0 errors.

- [ ] **Step 12: Commit**

```bash
git add apps/web
git commit -m "feat: school admin — section management, timetable CRUD, academics (years + exams), fee structures, syllabus upload"
```

---

## Task 6: Audit Logging Helper

All write operations should log to `audit_log`. Instead of adding logging calls to every form, create a reusable helper.

**Files:**
- Create: `packages/shared/src/audit.ts`

- [ ] **Step 1: Create `packages/shared/src/audit.ts`**

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";

export async function logAudit(
  supabase: SupabaseClient,
  params: {
    schoolId?: string | null;
    action: string;
    entityType: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
    actingAsRole?: string;
  }
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Get the user's actual role
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  await supabase.from("audit_log").insert({
    school_id: params.schoolId ?? null,
    performed_by: user.id,
    acting_as_role: params.actingAsRole ?? roleRow?.role ?? "unknown",
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId ?? null,
    metadata: params.metadata ?? {},
  });
}
```

- [ ] **Step 2: Export from shared package**

Add to `packages/shared/src/index.ts`:
```typescript
export { logAudit } from "./audit";
```

- [ ] **Step 3: Usage example — call `logAudit` after writes**

In any client or server component after a successful mutation (e.g. attendance mark), add:

```typescript
import { logAudit } from "@erp/shared";

// After saving attendance:
await logAudit(supabase, {
  schoolId,
  action: "attendance.mark",
  entityType: "attendance_records",
  metadata: { date, sectionId, studentCount: records.length },
});
```

This pattern is used for: `attendance.mark`, `homework.create`, `exam_results.enter`, `fee_payment.record`, `discipline.create`, `announcement.create`, `school.create`, `school.toggle_active`, `settings.update`.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/audit.ts packages/shared/src/index.ts
git commit -m "feat: reusable audit logging helper"
```

---

## Verification Checklist

Before declaring Plan 3 complete, confirm all of the following:

- [ ] `pnpm type-check` passes with 0 errors
- [ ] Super Admin: can list schools, create a new school + invite admin, toggle active/inactive, view as lower roles
- [ ] School Admin: can add classes + sections, manage timetable, create academic years + exams, add fee structures, upload syllabus, invite teachers, add students, post announcements
- [ ] Principal: can see attendance summary, discipline records, exam list, post announcements, switch to teacher view
- [ ] Context switch: banner appears, exit works, audit log records entries
- [ ] Invite acceptance: `/invite` page loads and allows password setting
- [ ] Unauthorized role trying to access another portal is redirected to `/login`
- [ ] All pages load without runtime errors in browser console
