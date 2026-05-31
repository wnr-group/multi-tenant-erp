# Enterprise UI Improvements

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the visual density and professionalism of tables and cards on the highest-traffic pages (dashboard, students list, discipline) to give an enterprise SaaS feel.

**Architecture:** Targeted CSS/component changes — tighter table row spacing, subtler shadows, consistent font sizing, and a more professional DataTable with alternating row highlights. No structural changes.

**Tech Stack:** Tailwind CSS, existing DataTable/Card components

---

### Task 1: Improve DataTable Component Styling

**Files:**
- Modify: `apps/web/components/data-table.tsx`

- [ ] **Step 1: Update the DataTable for enterprise density**

Replace the entire contents of `apps/web/components/data-table.tsx` with:

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
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm animate-fade-in-up">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            {columns.map((col, i) => (
              <TableHead
                key={i}
                className="h-10 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
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
            data.map((row, rowIndex) => (
              <TableRow
                key={row.id}
                className={`transition-colors hover:bg-muted/30 ${rowIndex % 2 === 0 ? "" : "bg-muted/10"}`}
              >
                {columns.map((col, i) => (
                  <TableCell key={i} className="px-4 py-3 text-sm">
                    {typeof col.accessor === "function"
                      ? col.accessor(row)
                      : (row[col.accessor] as React.ReactNode)}
                  </TableCell>
                ))}
                {renderActions && (
                  <TableCell className="px-4 py-3 text-right">
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

Key changes: added `shadow-sm`, tighter header height (`h-10`), explicit `px-4` padding, alternating row tinting (`bg-muted/10`), consistent `py-3` cell padding.

- [ ] **Step 2: Verify tables across pages**

Navigate to admin students, admin discipline, teacher results — tables should look tighter and more professional.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/data-table.tsx
git commit -m "style(data-table): enterprise density with alternating rows and tighter spacing"
```

---

### Task 2: Improve FilterableDataTable Styling

**Files:**
- Modify: `apps/web/components/filterable-data-table.tsx`

- [ ] **Step 1: Update the search/filter bar styling**

In `apps/web/components/filterable-data-table.tsx`, update the wrapper and filter bar for a cleaner look. Replace the `return` section:

```tsx
return (
  <div className="space-y-4 animate-fade-in-up">
    <div className="flex items-center gap-3">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-9 h-9 text-sm"
        />
      </div>
      {filter && (
        <select
          value={filterValue}
          onChange={(e) => setFilterValue(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
          emptyMessage={query ? `No results for "${query}"` : "No records found."}
        />
      )}
  </div>
);
```

Key changes: `max-w-sm` on search (doesn't stretch full width), `h-9` on inputs for consistent height, `text-sm` explicitly.

- [ ] **Step 2: Verify in browser**

Check the students list page — search bar should be compact and aligned.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/filterable-data-table.tsx
git commit -m "style(filterable-table): compact search bar with max-width"
```

---

### Task 3: Improve Dashboard Stat Cards

**Files:**
- Modify: `apps/web/app/(school)/admin/dashboard/page.tsx`

- [ ] **Step 1: Tighten stat card styling**

In `apps/web/app/(school)/admin/dashboard/page.tsx`, update the stat card grid item class. Change:

```tsx
<div key={s.label} className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md animate-fade-in-up" style={{ animationDelay: `${index * 60}ms` }}>
  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${s.iconBg} ${s.iconColor}`}>
    <Icon className="h-6 w-6" />
  </div>
  <div className="min-w-0">
    <p className="text-2xl font-bold text-foreground truncate">{s.value}</p>
    <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
  </div>
</div>
```

to:

```tsx
<div key={s.label} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:shadow-md animate-fade-in-up" style={{ animationDelay: `${index * 60}ms` }}>
  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${s.iconBg} ${s.iconColor}`}>
    <Icon className="h-5 w-5" />
  </div>
  <div className="min-w-0">
    <p className="text-xl font-bold text-foreground truncate">{s.value}</p>
    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{s.label}</p>
  </div>
</div>
```

Key changes: smaller padding (`p-4`), smaller icon container (`h-10 w-10`, `rounded-lg`), smaller value text (`text-xl`), uppercase label with tracking, permanent subtle shadow.

- [ ] **Step 2: Verify dashboard**

Navigate to admin dashboard — stat cards should look more compact and refined.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/(school)/admin/dashboard/page.tsx
git commit -m "style(dashboard): tighter stat cards with enterprise density"
```

---

### Task 4: Add Consistent Page Headers with Description

**Files:**
- Modify: `apps/web/app/(school)/admin/discipline/page.tsx`
- Modify: `apps/web/app/(school)/principal/discipline/page.tsx`
- Modify: `apps/web/app/(school)/teacher/discipline/page.tsx`

- [ ] **Step 1: Ensure discipline pages use consistent header pattern**

The admin discipline page already has a subtitle. Ensure principal and teacher also have one:

Principal (`apps/web/app/(school)/principal/discipline/page.tsx`) — change:
```tsx
<h1 className="mb-6 text-2xl font-bold text-gray-900">Discipline</h1>
```
to:
```tsx
<div className="mb-6">
  <h1 className="text-2xl font-bold text-foreground">Discipline</h1>
  <p className="mt-1 text-sm text-muted-foreground">All discipline incidents across the school.</p>
</div>
```

Teacher (`apps/web/app/(school)/teacher/discipline/page.tsx`) — change:
```tsx
<h1 className="mb-6 text-2xl font-bold text-gray-900">Discipline</h1>
```
to:
```tsx
<div className="mb-6">
  <h1 className="text-2xl font-bold text-foreground">Discipline</h1>
  <p className="mt-1 text-sm text-muted-foreground">Discipline records for your section.</p>
</div>
```

Also update admin to use `text-foreground` instead of `text-gray-900`:
```tsx
<h1 className="text-2xl font-bold text-foreground">Discipline</h1>
```

- [ ] **Step 2: Verify all three pages**

Check admin, principal, and teacher discipline pages have consistent headers.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/(school)/admin/discipline/page.tsx apps/web/app/(school)/principal/discipline/page.tsx apps/web/app/(school)/teacher/discipline/page.tsx
git commit -m "style(discipline): consistent page headers with descriptions"
```
