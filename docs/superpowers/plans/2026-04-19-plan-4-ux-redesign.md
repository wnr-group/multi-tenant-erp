# Full UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform all web portal pages (admin, teacher, principal) from bare CRUD lists into a professional, role-aware product with a persistent shell, dashboards, search, modals, detail pages, and polish.

**Architecture:** A shared `(school)/layout.tsx` shell renders `<Sidebar>` + `<TopBar>` around all pages. Shared components (`PageHeader`, `StatCard`, `EmptyState`, `FilterableDataTable`) apply a consistent pattern across every list page. Forms move from inline to `Dialog` modals via a generic `ActionDialog` wrapper that passes `onSuccess` to the form.

**Tech Stack:** Next.js 16 App Router, React 19, shadcn/ui, Tailwind CSS, Lucide icons, Supabase SSR, Sonner (toasts — to be installed)

---

## File Map

### New files
| File | Responsibility |
|---|---|
| `apps/web/components/top-bar.tsx` | TopBar client component — breadcrumbs + user avatar |
| `apps/web/components/stat-card.tsx` | Single stat card (label + value + optional icon) |
| `apps/web/components/page-header.tsx` | Page header — title, description, action button slot, stat cards row |
| `apps/web/components/empty-state.tsx` | EmptyState — icon + title + description + CTA |
| `apps/web/components/action-dialog.tsx` | Generic dialog wrapper with open/close state + onSuccess |
| `apps/web/components/filterable-data-table.tsx` | Client component — search input + optional filter + DataTable |
| `apps/web/app/(school)/dashboard/page.tsx` | Role-branching dashboard server component |
| `apps/web/app/(school)/dashboard/loading.tsx` | Dashboard skeleton |
| `apps/web/app/(school)/admin/teachers/[id]/page.tsx` | Teacher detail page |
| `apps/web/app/(school)/admin/students/[id]/page.tsx` | Student detail page |
| `apps/web/app/(school)/admin/teachers/loading.tsx` | Teachers list skeleton |
| `apps/web/app/(school)/admin/students/loading.tsx` | Students list skeleton |
| `apps/web/app/(school)/admin/classes/loading.tsx` | Classes list skeleton |
| `apps/web/app/(school)/admin/subjects/loading.tsx` | Subjects list skeleton |
| `apps/web/app/(school)/admin/academics/loading.tsx` | Academics list skeleton |
| `apps/web/app/(school)/admin/announcements/loading.tsx` | Announcements list skeleton |
| `apps/web/app/(school)/admin/syllabus/loading.tsx` | Syllabus list skeleton |

### Modified files
| File | Change |
|---|---|
| `apps/web/app/layout.tsx` | Add `<Toaster />` from sonner |
| `apps/web/app/(school)/layout.tsx` | Full shell: Sidebar + TopBar + main |
| `apps/web/components/sidebar.tsx` | Add `userName` + `userRole` footer props |
| `apps/web/components/data-table.tsx` | Add optional `renderActions` prop |
| `apps/web/app/(school)/admin/teachers/invite-teacher-form.tsx` | Add `onSuccess?: () => void` |
| `apps/web/app/(school)/admin/teachers/page.tsx` | PageHeader, ActionDialog, FilterableDataTable, EmptyState, row actions |
| `apps/web/app/(school)/admin/students/add-student-form.tsx` | Add `onSuccess?: () => void` |
| `apps/web/app/(school)/admin/students/page.tsx` | Same pattern |
| `apps/web/app/(school)/admin/classes/add-class-form.tsx` | Add `onSuccess?: () => void` |
| `apps/web/app/(school)/admin/classes/add-section-form.tsx` | Add `onSuccess?: () => void` |
| `apps/web/app/(school)/admin/classes/page.tsx` | Same pattern |
| `apps/web/app/(school)/admin/subjects/add-subject-form.tsx` | Add `onSuccess?: () => void` |
| `apps/web/app/(school)/admin/subjects/page.tsx` | Same pattern |
| `apps/web/app/(school)/admin/academics/add-academic-year-form.tsx` | Add `onSuccess?: () => void` |
| `apps/web/app/(school)/admin/academics/add-exam-form.tsx` | Add `onSuccess?: () => void` |
| `apps/web/app/(school)/admin/academics/page.tsx` | Same pattern |
| `apps/web/app/(school)/admin/announcements/create-announcement-form.tsx` | Add `onSuccess?: () => void` |
| `apps/web/app/(school)/admin/announcements/page.tsx` | Same pattern |
| `apps/web/app/(school)/admin/syllabus/upload-syllabus-form.tsx` | Add `onSuccess?: () => void` |
| `apps/web/app/(school)/admin/syllabus/page.tsx` | Same pattern |
| `apps/web/app/(school)/admin/settings/page.tsx` | Improved layout with section cards |

## Scope Note

This plan covers: app shell (all roles), dashboards (admin/teacher/principal), all 8 admin list pages, teacher and student detail pages, and toast feedback.

**Not in this plan:** Individual teacher portal pages (attendance mark, homework, feedback, results) and principal portal pages (reports, discipline, announcements) get the shell chrome automatically but their page-level content upgrades (PageHeader, EmptyState, etc.) follow the same patterns from Tasks 5–8 and can be addressed in a follow-up. Confirmation dialogs for destructive actions are deferred until delete server actions are confirmed.

---

## Task 1: Install Sonner and wire Toaster into root layout

**Files:**
- Modify: `apps/web/app/layout.tsx`

- [ ] **Step 1: Install sonner**

```bash
cd apps/web && pnpm add sonner
```

- [ ] **Step 2: Read the root layout to see current structure**

Read `apps/web/app/layout.tsx` before editing.

- [ ] **Step 3: Add Toaster to root layout**

Add the import and component to `apps/web/app/layout.tsx`:

```tsx
import { Toaster } from "sonner";

// Inside <body>, after {children}:
<Toaster position="bottom-right" richColors />
```

Full updated `<body>` section:
```tsx
<body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
  {children}
  <Toaster position="bottom-right" richColors />
</body>
```

- [ ] **Step 4: Type-check**

```bash
cd /path/to/erp && pnpm --filter @erp/web type-check
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/layout.tsx apps/web/package.json pnpm-lock.yaml
git commit -m "feat: install sonner and add Toaster to root layout"
```

---

## Task 2: Build TopBar component

**Files:**
- Create: `apps/web/components/top-bar.tsx`

- [ ] **Step 1: Create the TopBar component**

Create `apps/web/components/top-bar.tsx`:

```tsx
"use client";

import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

interface TopBarProps {
  userName: string;
  userRole: string;
  brandColor?: string;
}

const ROLE_LABELS: Record<string, string> = {
  school_admin: "School Admin",
  teacher: "Teacher",
  principal: "Principal",
  super_admin: "Platform Admin",
};

function formatSegment(segment: string): string {
  // UUID — show "Detail" instead of the raw ID
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(segment)) {
    return "Detail";
  }
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function TopBar({ userName, userRole, brandColor }: TopBarProps) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const roleLabel = ROLE_LABELS[userRole] ?? userRole;
  const avatarBg = brandColor ?? "#4f46e5";

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-white px-6">
      <nav className="flex items-center gap-1 text-sm">
        {segments.length === 0 ? (
          <span className="font-medium text-gray-900">Dashboard</span>
        ) : (
          segments.map((seg, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-gray-400" />}
              <span
                className={
                  i === segments.length - 1
                    ? "font-medium text-gray-900"
                    : "text-gray-500"
                }
              >
                {formatSegment(seg)}
              </span>
            </span>
          ))
        )}
      </nav>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium leading-none text-gray-900">
            {userName}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">{roleLabel}</p>
        </div>
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: avatarBg }}
        >
          {initials}
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm --filter @erp/web type-check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/top-bar.tsx
git commit -m "feat: add TopBar component with breadcrumbs and user avatar"
```

---

## Task 3: Add user footer to Sidebar

**Files:**
- Modify: `apps/web/components/sidebar.tsx`

- [ ] **Step 1: Read the current sidebar**

Read `apps/web/components/sidebar.tsx`.

- [ ] **Step 2: Add userName and userRole props and footer**

Update the `SidebarProps` interface and add the footer section. The footer appears at the very bottom of the sidebar, separated by a divider:

```tsx
// Updated interface
interface SidebarProps {
  title: string;
  items: NavItem[];
  brandColor?: string;
  userName?: string;
  userRole?: string;
}

const ROLE_LABELS: Record<string, string> = {
  school_admin: "School Admin",
  teacher: "Teacher",
  principal: "Principal",
  super_admin: "Platform Admin",
};

// Updated function signature
export function Sidebar({ title, items, brandColor, userName, userRole }: SidebarProps) {
  // ... existing code unchanged ...

  // Add this AFTER the <nav> block, still inside <aside>:
  return (
    <aside
      className="flex h-full w-60 flex-col text-white"
      style={{ backgroundColor: sidebarBg }}
    >
      {/* existing logo header */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: logoBg }}
        >
          <GraduationCap className="h-[18px] w-[18px] text-white" />
        </div>
        <span className="text-sm font-semibold tracking-wide text-white/90">
          {title}
        </span>
      </div>
      <div className="mx-4 border-t" style={{ borderColor: dividerColor }} />

      {/* existing nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
        {items.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = ICON_MAP[item.label] ?? LayoutDashboard;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                isActive
                  ? "bg-white/15 text-white"
                  : "hover:bg-white/[0.08] hover:text-white"
              )}
              style={!isActive ? { color: inactiveText } : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* user footer — new */}
      {userName && (
        <>
          <div className="mx-4 border-t" style={{ borderColor: dividerColor }} />
          <div className="flex items-center gap-3 px-4 py-4">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: logoBg }}
            >
              {userName
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-white/90">
                {userName}
              </p>
              <p className="truncate text-[11px] text-white/50">
                {ROLE_LABELS[userRole ?? ""] ?? userRole}
              </p>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
```

- [ ] **Step 3: Type-check**

```bash
pnpm --filter @erp/web type-check
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/sidebar.tsx
git commit -m "feat: add user identity footer to Sidebar"
```

---

## Task 4: Wire the app shell in (school)/layout.tsx

**Files:**
- Modify: `apps/web/app/(school)/layout.tsx`

- [ ] **Step 1: Read the current layout**

Read `apps/web/app/(school)/layout.tsx`.

- [ ] **Step 2: Replace with full shell**

Replace the entire file:

```tsx
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "../../lib/supabase/server";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/top-bar";

const SCHOOL_ROLES = [
  "super_admin",
  "school_admin",
  "principal",
  "teacher",
] as const;

const NAV_ITEMS: Record<string, { label: string; href: string }[]> = {
  school_admin: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Teachers", href: "/admin/teachers" },
    { label: "Students", href: "/admin/students" },
    { label: "Classes", href: "/admin/classes" },
    { label: "Subjects", href: "/admin/subjects" },
    { label: "Academics", href: "/admin/academics" },
    { label: "Fees", href: "/admin/fees" },
    { label: "Syllabus", href: "/admin/syllabus" },
    { label: "Announcements", href: "/admin/announcements" },
    { label: "Settings", href: "/admin/settings" },
  ],
  teacher: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Attendance", href: "/teacher/attendance" },
    { label: "Homework", href: "/teacher/homework" },
    { label: "Results", href: "/teacher/results" },
    { label: "Feedback", href: "/teacher/feedback" },
  ],
  principal: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Reports", href: "/principal/reports" },
    { label: "Discipline", href: "/principal/discipline" },
    { label: "Announcements", href: "/principal/announcements" },
  ],
  super_admin: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Schools", href: "/platform-admin/schools" },
  ],
};

export default async function SchoolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: roleRow }, { data: profile }] = await Promise.all([
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single(),
    supabase
      .from("profiles")
      .select("full_name, school_id")
      .eq("id", user.id)
      .single(),
  ]);

  if (
    !roleRow ||
    !SCHOOL_ROLES.includes(roleRow.role as (typeof SCHOOL_ROLES)[number])
  ) {
    redirect("/login");
  }

  const role = roleRow.role as string;
  const userName = profile?.full_name ?? user.email ?? "User";

  let brandColor: string | undefined;
  let schoolName = "School ERP";

  if (profile?.school_id) {
    const { data: school } = await supabase
      .from("schools")
      .select("name, primary_color")
      .eq("id", profile.school_id)
      .single();
    brandColor = school?.primary_color ?? undefined;
    schoolName = school?.name ?? "School ERP";
  }

  const navItems = NAV_ITEMS[role] ?? [];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar
        title={schoolName}
        items={navItems}
        brandColor={brandColor}
        userName={userName}
        userRole={role}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar
          userName={userName}
          userRole={role}
          brandColor={brandColor}
        />
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

```bash
pnpm --filter @erp/web type-check
```

Expected: no errors.

- [ ] **Step 4: Start dev server and visually verify the shell**

```bash
pnpm --filter @erp/web dev
```

Navigate to any admin page. You should see: sidebar on the left (brand-colored), top bar with breadcrumbs and user avatar, content in a scrollable main area.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/\(school\)/layout.tsx
git commit -m "feat: wire full app shell — Sidebar + TopBar in school layout"
```

---

## Task 5: Build StatCard and PageHeader components

**Files:**
- Create: `apps/web/components/stat-card.tsx`
- Create: `apps/web/components/page-header.tsx`

- [ ] **Step 1: Create StatCard**

Create `apps/web/components/stat-card.tsx`:

```tsx
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  className?: string;
}

export function StatCard({ label, value, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-white px-5 py-4 shadow-sm",
        className
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
```

- [ ] **Step 2: Create PageHeader**

Create `apps/web/components/page-header.tsx`:

```tsx
interface StatItem {
  label: string;
  value: string | number;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  stats?: StatItem[];
}

import { StatCard } from "@/components/stat-card";

export function PageHeader({
  title,
  description,
  action,
  stats,
}: PageHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          )}
        </div>
        {action && <div className="ml-4 shrink-0">{action}</div>}
      </div>
      {stats && stats.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {stats.map((s) => (
            <StatCard key={s.label} label={s.label} value={s.value} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

```bash
pnpm --filter @erp/web type-check
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/stat-card.tsx apps/web/components/page-header.tsx
git commit -m "feat: add StatCard and PageHeader components"
```

---

## Task 6: Build EmptyState component

**Files:**
- Create: `apps/web/components/empty-state.tsx`

- [ ] **Step 1: Create EmptyState**

Create `apps/web/components/empty-state.tsx`:

```tsx
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-white py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
        <Icon className="h-7 w-7 text-gray-400" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm --filter @erp/web type-check
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/empty-state.tsx
git commit -m "feat: add EmptyState component"
```

---

## Task 7: Build ActionDialog component

**Files:**
- Create: `apps/web/components/action-dialog.tsx`

This is a generic reusable dialog. Every "Add" / "Invite" / "Upload" button on every page uses this wrapper. The `children` render prop receives an `onSuccess` callback to close the dialog after successful form submission.

- [ ] **Step 1: Check that Dialog is available**

Confirm `apps/web/components/ui/dialog.tsx` exists and exports `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogTrigger`.

- [ ] **Step 2: Create ActionDialog**

Create `apps/web/components/action-dialog.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ActionDialogProps {
  trigger: string;
  title: string;
  children: (onSuccess: () => void) => React.ReactNode;
}

export function ActionDialog({ trigger, title, children }: ActionDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">{trigger}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="pt-2">{children(() => setOpen(false))}</div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Type-check**

```bash
pnpm --filter @erp/web type-check
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/action-dialog.tsx
git commit -m "feat: add generic ActionDialog component"
```

---

## Task 8: Build FilterableDataTable component + extend DataTable with row actions

**Files:**
- Create: `apps/web/components/filterable-data-table.tsx`
- Modify: `apps/web/components/data-table.tsx`

- [ ] **Step 1: Read current DataTable**

Read `apps/web/components/data-table.tsx`.

- [ ] **Step 2: Add renderActions prop to DataTable**

Update `apps/web/components/data-table.tsx` — add an optional `renderActions` prop. When provided, an extra column is appended with no header:

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
  renderActions?: (row: T) => React.ReactNode;
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  emptyMessage = "No records found.",
  renderActions,
}: DataTableProps<T>) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            {columns.map((col, i) => (
              <TableHead
                key={i}
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {col.header}
              </TableHead>
            ))}
            {renderActions && <TableHead className="w-12" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length + (renderActions ? 1 : 0)}
                className="py-12 text-center text-sm text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => (
              <TableRow key={row.id} className="hover:bg-muted/30">
                {columns.map((col, i) => (
                  <TableCell key={i} className="text-sm">
                    {typeof col.accessor === "function"
                      ? col.accessor(row)
                      : (row[col.accessor] as React.ReactNode)}
                  </TableCell>
                ))}
                {renderActions && (
                  <TableCell className="text-right">
                    {renderActions(row)}
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 3: Create FilterableDataTable**

Create `apps/web/components/filterable-data-table.tsx`:

```tsx
"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/data-table";

interface FilterOption {
  label: string;
  value: string;
}

interface FilterConfig {
  label: string;
  options: FilterOption[];
  filterFn: (row: any, value: string) => boolean;
}

interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
}

interface FilterableDataTableProps<T extends { id: string }> {
  data: T[];
  columns: Column<T>[];
  searchKeys: (keyof T)[];
  searchPlaceholder?: string;
  filter?: FilterConfig;
  renderActions?: (row: T) => React.ReactNode;
  emptyState?: React.ReactNode;
}

export function FilterableDataTable<T extends { id: string }>({
  data,
  columns,
  searchKeys,
  searchPlaceholder = "Search...",
  filter,
  renderActions,
  emptyState,
}: FilterableDataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [filterValue, setFilterValue] = useState("");

  const filtered = useMemo(() => {
    let result = data;
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter((row) =>
        searchKeys.some((key) =>
          String(row[key] ?? "")
            .toLowerCase()
            .includes(q)
        )
      );
    }
    if (filterValue && filter) {
      result = result.filter((row) => filter.filterFn(row, filterValue));
    }
    return result;
  }, [data, query, filterValue, searchKeys, filter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9"
          />
        </div>
        {filter && (
          <select
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">{filter.label}</option>
            {filter.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )}
      </div>
      {filtered.length === 0 && query === "" && filterValue === "" && emptyState
        ? emptyState
        : (
          <DataTable
            data={filtered}
            columns={columns}
            renderActions={renderActions}
            emptyMessage={`No results for "${query}"`}
          />
        )}
    </div>
  );
}
```

- [ ] **Step 4: Type-check**

```bash
pnpm --filter @erp/web type-check
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/data-table.tsx apps/web/components/filterable-data-table.tsx
git commit -m "feat: extend DataTable with row actions, add FilterableDataTable"
```

---

## Task 9: Build role-based Dashboard page

**Files:**
- Create: `apps/web/app/(school)/dashboard/page.tsx`
- Create: `apps/web/app/(school)/dashboard/loading.tsx`

- [ ] **Step 1: Create the dashboard page**

Create `apps/web/app/(school)/dashboard/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { StatCard } from "@/components/stat-card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Users, GraduationCap, Megaphone, Plus } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  const role = roleRow?.role ?? "teacher";
  const schoolId = await getSchoolId();

  if (role === "school_admin" || role === "super_admin") {
    const [{ count: studentCount }, { count: teacherCount }, { data: recentStudents }] =
      await Promise.all([
        supabase
          .from("student_profiles")
          .select("id", { count: "exact", head: true })
          .eq("school_id", schoolId!),
        supabase
          .from("teacher_profiles")
          .select("id", { count: "exact", head: true })
          .eq("school_id", schoolId!),
        supabase
          .from("student_profiles")
          .select("id, profile:profiles(full_name), class:classes(name), section:sections(name), created_at")
          .eq("school_id", schoolId!)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back. Here's what's happening at your school.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Total Students" value={studentCount ?? 0} />
          <StatCard label="Total Teachers" value={teacherCount ?? 0} />
          <StatCard label="Fees Collected" value="—" />
          <StatCard label="Pending Fees" value="—" />
        </div>

        {/* Quick actions */}
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Quick Actions
          </h2>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="sm">
              <Link href="/admin/students">
                <Plus className="mr-1.5 h-4 w-4" /> Add Student
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/teachers">
                <Plus className="mr-1.5 h-4 w-4" /> Invite Teacher
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/announcements">
                <Plus className="mr-1.5 h-4 w-4" /> Announcement
              </Link>
            </Button>
          </div>
        </div>

        {/* Recent admissions */}
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Recent Admissions
          </h2>
          {(recentStudents ?? []).length === 0 ? (
            <p className="text-sm text-gray-500">No students admitted yet.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border bg-white">
              {(recentStudents ?? []).map((s: any) => {
                const profile = s.profile as { full_name: string } | null;
                const cls = s.class as { name: string } | null;
                const sec = s.section as { name: string } | null;
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between border-b px-5 py-3 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">
                        {(profile?.full_name ?? "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {profile?.full_name ?? "—"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {cls?.name ?? "—"}{sec?.name ? ` · ${sec.name}` : ""}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400">
                      {new Date(s.created_at).toLocaleDateString()}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (role === "teacher") {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Your teaching overview for today.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <StatCard label="My Classes" value="—" />
          <StatCard label="Homework to Review" value="—" />
          <StatCard label="Attendance Status" value="—" />
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="sm">
            <Link href="/teacher/attendance/mark">Mark Attendance</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/teacher/homework">View Homework</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Principal
  const [{ data: announcements }, { data: disciplineRecords }] = await Promise.all([
    supabase
      .from("announcements")
      .select("id, title, target_type, created_at")
      .eq("school_id", schoolId!)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("discipline_records")
      .select("id, description, created_at, student:student_profiles(profile:profiles(full_name))")
      .eq("school_id", schoolId!)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const [{ count: studentCount }, { count: teacherCount }] = await Promise.all([
    supabase
      .from("student_profiles")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId!),
    supabase
      .from("teacher_profiles")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId!),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">School health overview.</p>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Today's Attendance" value="—" />
        <StatCard label="Active Teachers" value={teacherCount ?? 0} />
        <StatCard label="Active Students" value={studentCount ?? 0} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Recent Announcements
          </h2>
          <div className="overflow-hidden rounded-lg border bg-white">
            {(announcements ?? []).length === 0 ? (
              <p className="px-5 py-4 text-sm text-gray-500">No announcements yet.</p>
            ) : (
              (announcements ?? []).map((a) => (
                <div key={a.id} className="border-b px-5 py-3 last:border-0">
                  <p className="text-sm font-medium text-gray-900">{a.title}</p>
                  <p className="text-xs text-gray-500">
                    {a.target_type} · {new Date(a.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Recent Discipline Logs
          </h2>
          <div className="overflow-hidden rounded-lg border bg-white">
            {(disciplineRecords ?? []).length === 0 ? (
              <p className="px-5 py-4 text-sm text-gray-500">No records yet.</p>
            ) : (
              (disciplineRecords ?? []).map((d: any) => (
                <div key={d.id} className="border-b px-5 py-3 last:border-0">
                  <p className="text-sm font-medium text-gray-900">
                    {(d.student?.profile as any)?.full_name ?? "Unknown Student"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {d.description} · {new Date(d.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create dashboard loading skeleton**

Create `apps/web/app/(school)/dashboard/loading.tsx`:

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Check if shadcn Skeleton component is already installed**

```bash
ls apps/web/components/ui/skeleton.tsx 2>/dev/null || echo "MISSING"
```

If MISSING, add it:

```bash
cd apps/web && npx shadcn@latest add skeleton
```

- [ ] **Step 4: Type-check**

```bash
pnpm --filter @erp/web type-check
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/\(school\)/dashboard/
git commit -m "feat: add role-based dashboard page with stats and quick actions"
```

---

## Task 10: Upgrade Teachers page

**Files:**
- Modify: `apps/web/app/(school)/admin/teachers/invite-teacher-form.tsx`
- Modify: `apps/web/app/(school)/admin/teachers/page.tsx`
- Create: `apps/web/app/(school)/admin/teachers/loading.tsx`

- [ ] **Step 1: Add onSuccess prop to InviteTeacherForm**

Read `apps/web/app/(school)/admin/teachers/invite-teacher-form.tsx`, then update the props and call `onSuccess` after `router.refresh()`:

```tsx
export function InviteTeacherForm({
  schoolId,
  onSuccess,
}: {
  schoolId: string;
  onSuccess?: () => void;
}) {
  // ... existing state unchanged ...

  async function handleSubmit(e: React.FormEvent) {
    // ... existing fetch logic unchanged ...

    setName(""); setEmail("");
    setLoading(false);
    router.refresh();
    onSuccess?.();           // ← add this line
  }

  // ... rest of form JSX unchanged ...
}
```

- [ ] **Step 2: Rewrite Teachers page**

Replace `apps/web/app/(school)/admin/teachers/page.tsx`:

```tsx
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { PageHeader } from "@/components/page-header";
import { ActionDialog } from "@/components/action-dialog";
import { FilterableDataTable } from "@/components/filterable-data-table";
import { EmptyState } from "@/components/empty-state";
import { InviteTeacherForm } from "./invite-teacher-form";
import { Users } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";

export default async function TeachersPage() {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  const { data: teachers } = await supabase
    .from("teacher_profiles")
    .select("id, profile:profiles(full_name, email)")
    .eq("school_id", schoolId);

  const rows = (teachers ?? []).map((t) => {
    const p = t.profile as unknown as { full_name: string; email: string } | null;
    return { id: t.id, name: p?.full_name ?? "", email: p?.email ?? "" };
  });

  return (
    <div>
      <PageHeader
        title="Teachers"
        description="Manage your school's teaching staff."
        action={
          <ActionDialog trigger="+ Invite Teacher" title="Invite Teacher">
            {(onSuccess) => <InviteTeacherForm schoolId={schoolId} onSuccess={onSuccess} />}
          </ActionDialog>
        }
        stats={[
          { label: "Total Teachers", value: rows.length },
        ]}
      />
      <FilterableDataTable
        data={rows}
        columns={[
          { header: "Name", accessor: "name" },
          { header: "Email", accessor: "email" },
        ]}
        searchKeys={["name", "email"]}
        searchPlaceholder="Search teachers..."
        renderActions={(row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/admin/teachers/${row.id}`}>View Profile</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        emptyState={
          <EmptyState
            icon={Users}
            title="No teachers yet"
            description="Invite your first teacher to get started."
          />
        }
      />
    </div>
  );
}
```

- [ ] **Step 3: Create loading skeleton**

Create `apps/web/app/(school)/admin/teachers/loading.tsx`:

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function TeachersLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Skeleton className="h-20 rounded-lg" />
      </div>
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}
```

- [ ] **Step 4: Type-check**

```bash
pnpm --filter @erp/web type-check
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/\(school\)/admin/teachers/
git commit -m "feat: upgrade Teachers page — PageHeader, modal form, search, row actions, empty state"
```

---

## Task 11: Upgrade Students page

**Files:**
- Modify: `apps/web/app/(school)/admin/students/add-student-form.tsx`
- Modify: `apps/web/app/(school)/admin/students/page.tsx`
- Create: `apps/web/app/(school)/admin/students/loading.tsx`

- [ ] **Step 1: Add onSuccess to AddStudentForm**

Read `apps/web/app/(school)/admin/students/add-student-form.tsx`, then update:

```tsx
export function AddStudentForm({
  schoolId,
  classes,
  onSuccess,
}: {
  schoolId: string;
  classes: ClassOption[];
  onSuccess?: () => void;
}) {
  // At the end of handleSubmit, after setLoading(false) and router.refresh():
  onSuccess?.();
}
```

- [ ] **Step 2: Rewrite Students page**

Replace `apps/web/app/(school)/admin/students/page.tsx`:

```tsx
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { PageHeader } from "@/components/page-header";
import { ActionDialog } from "@/components/action-dialog";
import { FilterableDataTable } from "@/components/filterable-data-table";
import { EmptyState } from "@/components/empty-state";
import { AddStudentForm } from "./add-student-form";
import { GraduationCap, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export default async function StudentsPage() {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  const [{ data: students }, { data: classes }] = await Promise.all([
    supabase
      .from("student_profiles")
      .select(
        "id, roll_number, profile:profiles(full_name, email), class:classes(name), section:sections(name)"
      )
      .eq("school_id", schoolId),
    supabase
      .from("classes")
      .select("id, name")
      .eq("school_id", schoolId)
      .order("order"),
  ]);

  const rows = (students ?? []).map((s) => {
    const p = s.profile as unknown as { full_name: string } | null;
    const c = s.class as unknown as { name: string } | null;
    const sec = s.section as unknown as { name: string } | null;
    return {
      id: s.id,
      name: p?.full_name ?? "",
      roll: s.roll_number ?? "",
      class_name: c?.name ?? "",
      section: sec?.name ?? "",
    };
  });

  const classOptions = (classes ?? []).map((c) => ({
    label: c.name,
    value: c.name,
  }));

  return (
    <div>
      <PageHeader
        title="Students"
        description="Manage student enrollment and profiles."
        action={
          <ActionDialog trigger="+ Add Student" title="Add Student">
            {(onSuccess) => (
              <AddStudentForm
                schoolId={schoolId}
                classes={classes ?? []}
                onSuccess={onSuccess}
              />
            )}
          </ActionDialog>
        }
        stats={[
          { label: "Total Students", value: rows.length },
          { label: "Classes", value: new Set(rows.map((r) => r.class_name)).size },
        ]}
      />
      <FilterableDataTable
        data={rows}
        columns={[
          { header: "Name", accessor: "name" },
          { header: "Roll No.", accessor: "roll" },
          { header: "Class", accessor: "class_name" },
          { header: "Section", accessor: "section" },
        ]}
        searchKeys={["name", "roll"]}
        searchPlaceholder="Search students..."
        filter={
          classOptions.length > 0
            ? {
                label: "All Classes",
                options: classOptions,
                filterFn: (row, value) => row.class_name === value,
              }
            : undefined
        }
        renderActions={(row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/admin/students/${row.id}`}>View Profile</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        emptyState={
          <EmptyState
            icon={GraduationCap}
            title="No students yet"
            description="Add your first student to get started."
          />
        }
      />
    </div>
  );
}
```

- [ ] **Step 3: Create loading skeleton**

Create `apps/web/app/(school)/admin/students/loading.tsx`:

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function StudentsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
      </div>
      <Skeleton className="h-80 rounded-lg" />
    </div>
  );
}
```

- [ ] **Step 4: Type-check**

```bash
pnpm --filter @erp/web type-check
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/\(school\)/admin/students/
git commit -m "feat: upgrade Students page — PageHeader, modal, search, class filter, row actions"
```

---

## Task 12: Upgrade Classes page

**Files:**
- Modify: `apps/web/app/(school)/admin/classes/add-class-form.tsx`
- Modify: `apps/web/app/(school)/admin/classes/add-section-form.tsx`
- Modify: `apps/web/app/(school)/admin/classes/page.tsx`
- Create: `apps/web/app/(school)/admin/classes/loading.tsx`

- [ ] **Step 1: Add onSuccess to both class forms**

Read `apps/web/app/(school)/admin/classes/add-class-form.tsx` and `add-section-form.tsx`. In each form, add `onSuccess?: () => void` to the props interface and call `onSuccess?.()` after `router.refresh()` in the submit handler.

- [ ] **Step 2: Rewrite Classes page**

Replace `apps/web/app/(school)/admin/classes/page.tsx`:

```tsx
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { PageHeader } from "@/components/page-header";
import { ActionDialog } from "@/components/action-dialog";
import { FilterableDataTable } from "@/components/filterable-data-table";
import { EmptyState } from "@/components/empty-state";
import { AddClassForm } from "./add-class-form";
import { AddSectionForm } from "./add-section-form";
import { School } from "lucide-react";

export default async function ClassesPage() {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, \"order\"")
    .eq("school_id", schoolId)
    .order("order");

  const { data: sections } = await supabase
    .from("sections")
    .select("id, name, class_id, class:classes(name)")
    .eq("school_id", schoolId)
    .order("name");

  const sectionRows = (sections ?? []).map((s) => {
    const cls = s.class as unknown as { name: string } | null;
    return { id: s.id, class_name: cls?.name ?? "", section_name: s.name };
  });

  return (
    <div className="space-y-10">
      <div>
        <PageHeader
          title="Classes"
          description="Manage classes and sections for your school."
          action={
            <ActionDialog trigger="+ Add Class" title="Add Class">
              {(onSuccess) => (
                <AddClassForm schoolId={schoolId} onSuccess={onSuccess} />
              )}
            </ActionDialog>
          }
          stats={[
            { label: "Total Classes", value: (classes ?? []).length },
            { label: "Total Sections", value: sectionRows.length },
          ]}
        />
        <FilterableDataTable
          data={classes ?? []}
          columns={[
            { header: "Class Name", accessor: "name" },
            { header: "Order", accessor: "order" },
          ]}
          searchKeys={["name"]}
          searchPlaceholder="Search classes..."
          emptyState={
            <EmptyState
              icon={School}
              title="No classes yet"
              description="Add your first class to get started."
            />
          }
        />
      </div>

      <div>
        <PageHeader
          title="Sections"
          description="Assign sections to classes."
          action={
            <ActionDialog trigger="+ Add Section" title="Add Section">
              {(onSuccess) => (
                <AddSectionForm
                  schoolId={schoolId}
                  classes={classes ?? []}
                  onSuccess={onSuccess}
                />
              )}
            </ActionDialog>
          }
        />
        <FilterableDataTable
          data={sectionRows}
          columns={[
            { header: "Class", accessor: "class_name" },
            { header: "Section", accessor: "section_name" },
          ]}
          searchKeys={["class_name", "section_name"]}
          searchPlaceholder="Search sections..."
          emptyState={
            <EmptyState
              icon={School}
              title="No sections yet"
              description="Add sections after creating classes."
            />
          }
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create loading skeleton**

Create `apps/web/app/(school)/admin/classes/loading.tsx`:

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function ClassesLoading() {
  return (
    <div className="space-y-10">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
        <Skeleton className="h-48 rounded-lg" />
      </div>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
        <Skeleton className="h-48 rounded-lg" />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Type-check**

```bash
pnpm --filter @erp/web type-check
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/\(school\)/admin/classes/
git commit -m "feat: upgrade Classes page — PageHeader, modal forms, search, empty states"
```

---

## Task 13: Upgrade Subjects page

**Files:**
- Modify: `apps/web/app/(school)/admin/subjects/add-subject-form.tsx`
- Modify: `apps/web/app/(school)/admin/subjects/page.tsx`
- Create: `apps/web/app/(school)/admin/subjects/loading.tsx`

- [ ] **Step 1: Add onSuccess to AddSubjectForm**

Read `apps/web/app/(school)/admin/subjects/add-subject-form.tsx`. Add `onSuccess?: () => void` to props and call `onSuccess?.()` after `router.refresh()`.

- [ ] **Step 2: Rewrite Subjects page**

Replace `apps/web/app/(school)/admin/subjects/page.tsx`:

```tsx
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { PageHeader } from "@/components/page-header";
import { ActionDialog } from "@/components/action-dialog";
import { FilterableDataTable } from "@/components/filterable-data-table";
import { EmptyState } from "@/components/empty-state";
import { AddSubjectForm } from "./add-subject-form";
import { BookOpen } from "lucide-react";

export default async function SubjectsPage() {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  const [{ data: subjects }, { data: classes }] = await Promise.all([
    supabase
      .from("subjects")
      .select("id, name, code, class:classes(name)")
      .eq("school_id", schoolId)
      .order("name"),
    supabase
      .from("classes")
      .select("id, name")
      .eq("school_id", schoolId)
      .order("order"),
  ]);

  const rows = (subjects ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    code: s.code ?? "—",
    class_name: (s.class as unknown as { name: string } | null)?.name ?? "—",
  }));

  const classOptions = (classes ?? []).map((c) => ({
    label: c.name,
    value: c.name,
  }));

  return (
    <div>
      <PageHeader
        title="Subjects"
        description="Manage subjects taught in each class."
        action={
          <ActionDialog trigger="+ Add Subject" title="Add Subject">
            {(onSuccess) => (
              <AddSubjectForm
                schoolId={schoolId}
                classes={classes ?? []}
                onSuccess={onSuccess}
              />
            )}
          </ActionDialog>
        }
        stats={[
          { label: "Total Subjects", value: rows.length },
          { label: "Classes Covered", value: new Set(rows.map((r) => r.class_name)).size },
        ]}
      />
      <FilterableDataTable
        data={rows}
        columns={[
          { header: "Subject", accessor: "name" },
          { header: "Code", accessor: "code" },
          { header: "Class", accessor: "class_name" },
        ]}
        searchKeys={["name", "code"]}
        searchPlaceholder="Search subjects..."
        filter={
          classOptions.length > 0
            ? {
                label: "All Classes",
                options: classOptions,
                filterFn: (row, value) => row.class_name === value,
              }
            : undefined
        }
        emptyState={
          <EmptyState
            icon={BookOpen}
            title="No subjects yet"
            description="Add subjects so teachers can assign homework and enter marks."
          />
        }
      />
    </div>
  );
}
```

- [ ] **Step 3: Create loading skeleton**

Create `apps/web/app/(school)/admin/subjects/loading.tsx`:

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function SubjectsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
      </div>
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}
```

- [ ] **Step 4: Type-check and commit**

```bash
pnpm --filter @erp/web type-check
git add apps/web/app/\(school\)/admin/subjects/
git commit -m "feat: upgrade Subjects page — PageHeader, modal, search, class filter"
```

---

## Task 14: Upgrade Academics page

**Files:**
- Modify: `apps/web/app/(school)/admin/academics/add-academic-year-form.tsx`
- Modify: `apps/web/app/(school)/admin/academics/add-exam-form.tsx`
- Modify: `apps/web/app/(school)/admin/academics/page.tsx`
- Create: `apps/web/app/(school)/admin/academics/loading.tsx`

- [ ] **Step 1: Add onSuccess to both forms**

Read both form files. Add `onSuccess?: () => void` to props and call `onSuccess?.()` after `router.refresh()` in each.

- [ ] **Step 2: Rewrite Academics page**

Replace `apps/web/app/(school)/admin/academics/page.tsx`:

```tsx
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { PageHeader } from "@/components/page-header";
import { ActionDialog } from "@/components/action-dialog";
import { FilterableDataTable } from "@/components/filterable-data-table";
import { EmptyState } from "@/components/empty-state";
import { AddAcademicYearForm } from "./add-academic-year-form";
import { AddExamForm } from "./add-exam-form";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";

export default async function AcademicsPage() {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  const { data: academicYears } = await supabase
    .from("academic_years")
    .select("id, name, start_date, end_date, is_current")
    .eq("school_id", schoolId)
    .order("start_date", { ascending: false });

  const { data: exams } = await supabase
    .from("exams")
    .select("id, name, start_date, end_date, academic_year:academic_years(name)")
    .eq("school_id", schoolId)
    .order("start_date", { ascending: false });

  const yearRows = (academicYears ?? []).map((y) => ({
    id: y.id,
    name: y.name,
    start: y.start_date ?? "—",
    end: y.end_date ?? "—",
    is_current: y.is_current,
  }));

  const examRows = (exams ?? []).map((e) => {
    const ay = e.academic_year as unknown as { name: string } | null;
    return {
      id: e.id,
      name: e.name,
      academic_year: ay?.name ?? "—",
      start: e.start_date ?? "—",
      end: e.end_date ?? "—",
    };
  });

  const currentYear = yearRows.find((y) => y.is_current);

  return (
    <div className="space-y-10">
      <div>
        <PageHeader
          title="Academics"
          description="Manage academic years and exam schedules."
          action={
            <ActionDialog trigger="+ Add Academic Year" title="Add Academic Year">
              {(onSuccess) => (
                <AddAcademicYearForm schoolId={schoolId} onSuccess={onSuccess} />
              )}
            </ActionDialog>
          }
          stats={[
            { label: "Academic Years", value: yearRows.length },
            { label: "Current Year", value: currentYear?.name ?? "—" },
            { label: "Exams Scheduled", value: examRows.length },
          ]}
        />
        <FilterableDataTable
          data={yearRows}
          columns={[
            { header: "Name", accessor: "name" },
            { header: "Start", accessor: "start" },
            { header: "End", accessor: "end" },
            {
              header: "Status",
              accessor: (row) =>
                row.is_current ? (
                  <Badge variant="default">Current</Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                ),
            },
          ]}
          searchKeys={["name"]}
          searchPlaceholder="Search academic years..."
          emptyState={
            <EmptyState
              icon={Calendar}
              title="No academic years yet"
              description="Add an academic year to start scheduling exams."
            />
          }
        />
      </div>

      <div>
        <PageHeader
          title="Exams"
          description="Schedule exams for each academic year."
          action={
            <ActionDialog trigger="+ Add Exam" title="Add Exam">
              {(onSuccess) => (
                <AddExamForm
                  schoolId={schoolId}
                  academicYears={(academicYears ?? []).map((y) => ({
                    id: y.id,
                    name: y.name,
                  }))}
                  onSuccess={onSuccess}
                />
              )}
            </ActionDialog>
          }
        />
        <FilterableDataTable
          data={examRows}
          columns={[
            { header: "Exam Name", accessor: "name" },
            { header: "Academic Year", accessor: "academic_year" },
            { header: "Start", accessor: "start" },
            { header: "End", accessor: "end" },
          ]}
          searchKeys={["name"]}
          searchPlaceholder="Search exams..."
          emptyState={
            <EmptyState
              icon={Calendar}
              title="No exams yet"
              description="Add academic years first, then schedule exams."
            />
          }
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create loading skeleton**

Create `apps/web/app/(school)/admin/academics/loading.tsx`:

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function AcademicsLoading() {
  return (
    <div className="space-y-10">
      {[0, 1].map((i) => (
        <div key={i} className="space-y-6">
          <div className="flex items-start justify-between">
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-9 w-40" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[0, 1, 2].map((j) => <Skeleton key={j} className="h-20 rounded-lg" />)}
          </div>
          <Skeleton className="h-48 rounded-lg" />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Type-check and commit**

```bash
pnpm --filter @erp/web type-check
git add apps/web/app/\(school\)/admin/academics/
git commit -m "feat: upgrade Academics page — PageHeader, modal forms, search, empty states"
```

---

## Task 15: Upgrade Announcements page

**Files:**
- Modify: `apps/web/app/(school)/admin/announcements/create-announcement-form.tsx`
- Modify: `apps/web/app/(school)/admin/announcements/page.tsx`
- Create: `apps/web/app/(school)/admin/announcements/loading.tsx`

- [ ] **Step 1: Add onSuccess to CreateAnnouncementForm**

Read `apps/web/app/(school)/admin/announcements/create-announcement-form.tsx`. Add `onSuccess?: () => void` to props and call `onSuccess?.()` after `router.refresh()`.

- [ ] **Step 2: Rewrite Announcements page**

Replace `apps/web/app/(school)/admin/announcements/page.tsx`:

```tsx
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { PageHeader } from "@/components/page-header";
import { ActionDialog } from "@/components/action-dialog";
import { FilterableDataTable } from "@/components/filterable-data-table";
import { EmptyState } from "@/components/empty-state";
import { CreateAnnouncementForm } from "./create-announcement-form";
import { Megaphone } from "lucide-react";

export default async function AnnouncementsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const schoolId = (await getSchoolId())!;

  const { data: announcements } = await supabase
    .from("announcements")
    .select("id, title, target_type, created_at")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });

  const rows = (announcements ?? []).map((a) => ({
    id: a.id,
    title: a.title,
    target_type: a.target_type,
    date: new Date(a.created_at).toLocaleDateString(),
  }));

  const thisMonth = rows.filter((r) => {
    const d = new Date(r.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const targetOptions = [
    ...new Set(rows.map((r) => r.target_type).filter(Boolean)),
  ].map((t) => ({ label: t, value: t }));

  return (
    <div>
      <PageHeader
        title="Announcements"
        description="Broadcast messages to students, teachers, or everyone."
        action={
          <ActionDialog trigger="+ New Announcement" title="Create Announcement">
            {(onSuccess) => (
              <CreateAnnouncementForm
                schoolId={schoolId}
                createdBy={user!.id}
                onSuccess={onSuccess}
              />
            )}
          </ActionDialog>
        }
        stats={[
          { label: "Total Sent", value: rows.length },
          { label: "This Month", value: thisMonth },
        ]}
      />
      <FilterableDataTable
        data={rows}
        columns={[
          { header: "Title", accessor: "title" },
          { header: "Target", accessor: "target_type" },
          { header: "Date", accessor: "date" },
        ]}
        searchKeys={["title"]}
        searchPlaceholder="Search announcements..."
        filter={
          targetOptions.length > 0
            ? {
                label: "All Targets",
                options: targetOptions,
                filterFn: (row, value) => row.target_type === value,
              }
            : undefined
        }
        emptyState={
          <EmptyState
            icon={Megaphone}
            title="No announcements yet"
            description="Create your first announcement to notify staff and students."
          />
        }
      />
    </div>
  );
}
```

- [ ] **Step 3: Create loading skeleton**

Create `apps/web/app/(school)/admin/announcements/loading.tsx`:

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function AnnouncementsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-9 w-44" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
      </div>
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}
```

- [ ] **Step 4: Type-check and commit**

```bash
pnpm --filter @erp/web type-check
git add apps/web/app/\(school\)/admin/announcements/
git commit -m "feat: upgrade Announcements page — PageHeader, modal, search, target filter"
```

---

## Task 16: Upgrade Syllabus page

**Files:**
- Modify: `apps/web/app/(school)/admin/syllabus/upload-syllabus-form.tsx`
- Modify: `apps/web/app/(school)/admin/syllabus/page.tsx`
- Create: `apps/web/app/(school)/admin/syllabus/loading.tsx`

- [ ] **Step 1: Add onSuccess to UploadSyllabusForm**

Read `apps/web/app/(school)/admin/syllabus/upload-syllabus-form.tsx`. Add `onSuccess?: () => void` to props and call `onSuccess?.()` after `router.refresh()`.

- [ ] **Step 2: Rewrite Syllabus page**

Replace `apps/web/app/(school)/admin/syllabus/page.tsx`:

```tsx
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { PageHeader } from "@/components/page-header";
import { ActionDialog } from "@/components/action-dialog";
import { FilterableDataTable } from "@/components/filterable-data-table";
import { EmptyState } from "@/components/empty-state";
import { UploadSyllabusForm } from "./upload-syllabus-form";
import { Upload } from "lucide-react";

export default async function SyllabusPage() {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  const [{ data: syllabusEntries }, { data: classes }, { data: subjects }, { data: academicYears }] =
    await Promise.all([
      supabase
        .from("syllabus")
        .select(
          "id, file_url, class:classes(name), subject:subjects(name), academic_year:academic_years(name)"
        )
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false }),
      supabase.from("classes").select("id, name").eq("school_id", schoolId).order("order"),
      supabase.from("subjects").select("id, name, class_id").eq("school_id", schoolId).order("name"),
      supabase
        .from("academic_years")
        .select("id, name")
        .eq("school_id", schoolId)
        .order("start_date", { ascending: false }),
    ]);

  const rows = (syllabusEntries ?? []).map((s) => {
    const cls = s.class as unknown as { name: string } | null;
    const subject = s.subject as unknown as { name: string } | null;
    const ay = s.academic_year as unknown as { name: string } | null;
    return {
      id: s.id,
      class_name: cls?.name ?? "—",
      subject_name: subject?.name ?? "—",
      academic_year: ay?.name ?? "—",
      file_url: s.file_url ?? "",
    };
  });

  const yearOptions = (academicYears ?? []).map((y) => ({
    label: y.name,
    value: y.name,
  }));

  return (
    <div>
      <PageHeader
        title="Syllabus"
        description="Upload and manage syllabus files by class and subject."
        action={
          <ActionDialog trigger="+ Upload Syllabus" title="Upload Syllabus">
            {(onSuccess) => (
              <UploadSyllabusForm
                schoolId={schoolId}
                classes={(classes ?? []).map((c) => ({ id: c.id, name: c.name }))}
                subjects={(subjects ?? []).map((s) => ({
                  id: s.id,
                  name: s.name,
                  classId: s.class_id,
                }))}
                academicYears={(academicYears ?? []).map((y) => ({
                  id: y.id,
                  name: y.name,
                }))}
                onSuccess={onSuccess}
              />
            )}
          </ActionDialog>
        }
        stats={[
          { label: "Files Uploaded", value: rows.length },
          { label: "Classes Covered", value: new Set(rows.map((r) => r.class_name)).size },
        ]}
      />
      <FilterableDataTable
        data={rows}
        columns={[
          { header: "Class", accessor: "class_name" },
          { header: "Subject", accessor: "subject_name" },
          { header: "Academic Year", accessor: "academic_year" },
          {
            header: "File",
            accessor: (row) =>
              row.file_url ? (
                <a
                  href={row.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline hover:text-blue-800"
                >
                  View
                </a>
              ) : (
                "—"
              ),
          },
        ]}
        searchKeys={["class_name", "subject_name"]}
        searchPlaceholder="Search syllabus..."
        filter={
          yearOptions.length > 0
            ? {
                label: "All Years",
                options: yearOptions,
                filterFn: (row, value) => row.academic_year === value,
              }
            : undefined
        }
        emptyState={
          <EmptyState
            icon={Upload}
            title="No syllabus files yet"
            description="Upload syllabus PDFs for each class and subject."
          />
        }
      />
    </div>
  );
}
```

- [ ] **Step 3: Create loading skeleton**

Create `apps/web/app/(school)/admin/syllabus/loading.tsx`:

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function SyllabusLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
      </div>
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}
```

- [ ] **Step 4: Type-check and commit**

```bash
pnpm --filter @erp/web type-check
git add apps/web/app/\(school\)/admin/syllabus/
git commit -m "feat: upgrade Syllabus page — PageHeader, modal, search, year filter"
```

---

## Task 17: Upgrade Settings page

**Files:**
- Modify: `apps/web/app/(school)/admin/settings/page.tsx`

- [ ] **Step 1: Read current settings page**

Read `apps/web/app/(school)/admin/settings/page.tsx`.

- [ ] **Step 2: Improve layout with section card and add toast feedback**

Replace the file:

```tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function SettingsPage() {
  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("profiles")
        .select("school_id")
        .eq("id", user.id)
        .single()
        .then(({ data: p }) => {
          if (!p?.school_id) return;
          setSchoolId(p.school_id);
          supabase
            .from("schools")
            .select("name, contact_email")
            .eq("id", p.school_id)
            .single()
            .then(({ data: s }) => {
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
    const { error } = await supabase
      .from("schools")
      .update({ name, contact_email: contactEmail })
      .eq("id", schoolId);
    setLoading(false);
    if (error) {
      toast.error("Failed to save settings. Please try again.");
    } else {
      toast.success("Settings saved successfully.");
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">School Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Update your school's basic information.
        </p>
      </div>
      <div className="max-w-lg">
        <form
          onSubmit={handleSave}
          className="space-y-5 rounded-lg border bg-white p-6 shadow-sm"
        >
          <div className="space-y-1.5">
            <Label htmlFor="school-name">School Name</Label>
            <Input
              id="school-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact-email">Contact Email</Label>
            <Input
              id="contact-email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Saving…" : "Save Changes"}
          </Button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Type-check and commit**

```bash
pnpm --filter @erp/web type-check
git add apps/web/app/\(school\)/admin/settings/page.tsx
git commit -m "feat: upgrade Settings page — improved layout, toast feedback"
```

---

## Task 18: Teacher detail page

**Files:**
- Create: `apps/web/app/(school)/admin/teachers/[id]/page.tsx`

- [ ] **Step 1: Create the teacher detail page**

Create `apps/web/app/(school)/admin/teachers/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail } from "lucide-react";

export default async function TeacherDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: teacher } = await supabase
    .from("teacher_profiles")
    .select("id, created_at, profile:profiles(full_name, email), school_id")
    .eq("id", id)
    .single();

  if (!teacher) notFound();

  const profile = teacher.profile as unknown as {
    full_name: string;
    email: string;
  } | null;

  const initials = (profile?.full_name ?? "?")
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/admin/teachers">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Teachers
        </Link>
      </Button>

      {/* Profile header */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex items-start gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xl font-bold text-indigo-600">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-gray-900">
              {profile?.full_name ?? "—"}
            </h1>
            <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
              <Mail className="h-3.5 w-3.5" />
              {profile?.email ?? "—"}
            </div>
            <p className="mt-0.5 text-xs text-gray-400">
              Joined {new Date(teacher.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Placeholder sections for backend-dependent data */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Assigned Classes
          </h2>
          <p className="text-sm text-gray-400 italic">
            Class assignments will appear here once teacher-class linking is implemented.
          </p>
        </div>
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Subjects Taught
          </h2>
          <p className="text-sm text-gray-400 italic">
            Subject assignments will appear here once teacher-class linking is implemented.
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check and commit**

```bash
pnpm --filter @erp/web type-check
git add apps/web/app/\(school\)/admin/teachers/\[id\]/
git commit -m "feat: add Teacher detail page with profile header"
```

---

## Task 19: Student detail page

**Files:**
- Create: `apps/web/app/(school)/admin/students/[id]/page.tsx`

- [ ] **Step 1: Create the student detail page**

Create `apps/web/app/(school)/admin/students/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: student } = await supabase
    .from("student_profiles")
    .select(
      "id, roll_number, admission_number, created_at, profile:profiles(full_name, email), class:classes(name), section:sections(name)"
    )
    .eq("id", id)
    .single();

  if (!student) notFound();

  const profile = student.profile as unknown as {
    full_name: string;
    email: string;
  } | null;
  const cls = student.class as unknown as { name: string } | null;
  const sec = student.section as unknown as { name: string } | null;

  const initials = (profile?.full_name ?? "?")
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/admin/students">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Students
        </Link>
      </Button>

      {/* Profile header */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex items-start gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-600">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-gray-900">
              {profile?.full_name ?? "—"}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
              {cls?.name && (
                <span>
                  {cls.name}
                  {sec?.name ? ` · Section ${sec.name}` : ""}
                </span>
              )}
              {student.roll_number && (
                <span>Roll No: {student.roll_number}</span>
              )}
              {student.admission_number && (
                <span>Adm: {student.admission_number}</span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-gray-400">
              Admitted {new Date(student.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Placeholder panels for backend-dependent data */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Fee Status
          </h2>
          <p className="text-sm text-gray-400 italic">
            Fee information will appear here once fee payments are implemented (Plan 3.5).
          </p>
        </div>
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Attendance
          </h2>
          <p className="text-sm text-gray-400 italic">
            Attendance summary will appear here once attendance records are linked.
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check and commit**

```bash
pnpm --filter @erp/web type-check
git add apps/web/app/\(school\)/admin/students/\[id\]/
git commit -m "feat: add Student detail page with profile header and placeholder panels"
```

---

## Task 20: Add toast feedback to all forms

All forms already call `router.refresh()` on success and set an `error` state on failure. This task adds `toast.success` / `toast.error` calls to replace or supplement the inline error state.

**Files to modify:** All 9 form files in admin pages.

- [ ] **Step 1: Update InviteTeacherForm**

In `apps/web/app/(school)/admin/teachers/invite-teacher-form.tsx`, add:

```tsx
import { toast } from "sonner";

// Inside handleSubmit, replace the error-display logic:
if (!res.ok) {
  const { error: msg } = await res.json();
  toast.error(msg ?? "Invite failed. Please try again.");
  setLoading(false);
  return;
}

setName(""); setEmail("");
setLoading(false);
toast.success("Teacher invited successfully.");
router.refresh();
onSuccess?.();
```

- [ ] **Step 2: Update AddStudentForm**

In `apps/web/app/(school)/admin/students/add-student-form.tsx`:

```tsx
import { toast } from "sonner";

// On error:
toast.error(msg ?? "Failed to add student. Please try again.");

// On success (after resets):
toast.success("Student added successfully.");
router.refresh();
onSuccess?.();
```

- [ ] **Step 3: Update remaining forms**

Apply the same `toast.success` / `toast.error` pattern to:
- `apps/web/app/(school)/admin/classes/add-class-form.tsx` — `toast.success("Class added.")`
- `apps/web/app/(school)/admin/classes/add-section-form.tsx` — `toast.success("Section added.")`
- `apps/web/app/(school)/admin/subjects/add-subject-form.tsx` — `toast.success("Subject added.")`
- `apps/web/app/(school)/admin/academics/add-academic-year-form.tsx` — `toast.success("Academic year added.")`
- `apps/web/app/(school)/admin/academics/add-exam-form.tsx` — `toast.success("Exam added.")`
- `apps/web/app/(school)/admin/announcements/create-announcement-form.tsx` — `toast.success("Announcement sent.")`
- `apps/web/app/(school)/admin/syllabus/upload-syllabus-form.tsx` — `toast.success("Syllabus uploaded.")`

For each file: read it, add `import { toast } from "sonner"`, replace inline error display with `toast.error(...)`, add `toast.success(...)` on the success path.

- [ ] **Step 4: Type-check**

```bash
pnpm --filter @erp/web type-check
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/\(school\)/admin/
git commit -m "feat: add toast success/error feedback to all admin forms"
```

---

## Task 21: Final type-check and smoke test

- [ ] **Step 1: Full type-check**

```bash
pnpm --filter @erp/web type-check
```

Expected: 0 errors.

- [ ] **Step 2: Start dev server**

```bash
pnpm --filter @erp/web dev
```

- [ ] **Step 3: Smoke-test the shell**

Navigate to any admin page. Verify:
- [ ] Sidebar renders with school name and nav items
- [ ] Active nav item is highlighted
- [ ] TopBar shows breadcrumbs, user name, role, and avatar
- [ ] Sidebar footer shows user name and role

- [ ] **Step 4: Smoke-test the dashboard**

Navigate to `/dashboard`. Verify:
- [ ] Student + teacher counts render
- [ ] Quick action buttons are present
- [ ] Recent admissions list renders (or shows empty message)

- [ ] **Step 5: Smoke-test a list page**

Navigate to `/admin/teachers`. Verify:
- [ ] Stats card row renders
- [ ] "+ Invite Teacher" button opens a Dialog
- [ ] Search input filters the table client-side
- [ ] Row "⋯" menu appears and "View Profile" navigates to `/admin/teachers/[id]`
- [ ] Teacher detail page renders with profile header

- [ ] **Step 6: Smoke-test form submission**

Add a teacher via the dialog. Verify:
- [ ] Dialog closes on success
- [ ] Toast "Teacher invited successfully." appears bottom-right
- [ ] Table updates without full page reload

- [ ] **Step 7: Final commit**

```bash
git add .
git commit -m "chore: UX redesign complete — all admin pages upgraded to professional product shell"
```
