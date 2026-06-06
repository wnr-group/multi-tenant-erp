# Predefined Fee Types Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace free-text `fee_type` in `fee_line_items` with a FK to a `fee_types` table seeded with 13 predefined types (grouped into Core / Ancillary / Miscellaneous), while allowing school admins to add school-specific custom types from a dedicated Settings page.

**Architecture:** A new `fee_types` table holds both global predefined types (school_id IS NULL) and per-school custom types (school_id set). `fee_line_items.fee_type TEXT` is replaced with `fee_type_id UUID FK`. All fee creation forms get a grouped `FeeTypeSelect` dropdown. Old `fee_structures` and `fee_payments` tables (legacy, unused by live users) are dropped cleanly.

**Tech Stack:** Supabase (PostgreSQL + RLS), Next.js 15, Expo/React Native, Supabase JS v2 client

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `supabase/migrations/20240001000035_fee_types.sql` | Schema: new table, drop old tables, alter fee_line_items, seed data |
| Create | `apps/web/components/fee-type-select.tsx` | Grouped `<select>` reused across all fee forms |
| Create | `apps/web/app/api/fee-types/route.ts` | GET list + POST create custom type |
| Create | `apps/web/app/api/fee-types/[id]/route.ts` | PATCH rename/recategorize + DELETE |
| Create | `apps/web/app/(school)/admin/settings/fee-types/page.tsx` | Server component: fetch types |
| Create | `apps/web/app/(school)/admin/settings/fee-types/fee-types-client.tsx` | Client: display + CRUD for custom types |
| Modify | `apps/web/app/(school)/layout.tsx` | Add "Fee Types" nav item for school_admin |
| Modify | `apps/web/app/(school)/admin/fees/page.tsx` | Fetch fee types; join fee_types in line items query |
| Modify | `apps/web/app/(school)/admin/fees/push-fee-form.tsx` | Replace text input with FeeTypeSelect; send fee_type_id |
| Delete | `apps/web/app/(school)/admin/fees/add-fee-structure-form.tsx` | References dropped fee_structures table |
| Modify | `apps/web/app/api/fees/push-to-class/route.ts` | Accept fee_type_id instead of fee_type string |
| Modify | `apps/web/app/(school)/admin/students/[id]/student-fees-tab.tsx` | Join fee_types in queries; pass feeTypes to client |
| Modify | `apps/web/app/(school)/admin/students/[id]/student-fees-client.tsx` | FeeTypeSelect for Add Fee form; accept feeTypes prop; send fee_type_id |
| Rewrite | `apps/web/app/(school)/teacher/fees/page.tsx` | Query fee_line_items (not fee_structures/fee_payments) |
| Rewrite | `apps/web/app/(school)/teacher/fees/fees-table.tsx` | New FeeRow interface with lineItemId |
| Rewrite | `apps/web/app/(school)/teacher/fees/record-payment-form.tsx` | Call /api/fees/record-offline-payment instead of old endpoint |
| Modify | `apps/mobile/app/(parent)/fees.tsx` | Join fee_types for name display |

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20240001000035_fee_types.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- Drop legacy fee tables (no live data, safe to cascade)
DROP TABLE IF EXISTS public.fee_payments CASCADE;
DROP TABLE IF EXISTS public.fee_structures CASCADE;

-- fee_types: global predefined (school_id IS NULL) + per-school custom
CREATE TABLE public.fee_types (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  category      TEXT NOT NULL CHECK (category IN ('core', 'ancillary', 'miscellaneous')),
  is_predefined BOOLEAN NOT NULL DEFAULT false,
  school_id     UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  is_one_time   BOOLEAN NOT NULL DEFAULT false,
  is_refundable BOOLEAN NOT NULL DEFAULT false,
  is_optional   BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fee_types_scope CHECK (
    (is_predefined = true AND school_id IS NULL) OR
    (is_predefined = false AND school_id IS NOT NULL)
  )
);

-- Prevent duplicate names within same scope
CREATE UNIQUE INDEX fee_types_predefined_name ON public.fee_types(name)
  WHERE school_id IS NULL;
CREATE UNIQUE INDEX fee_types_school_name ON public.fee_types(name, school_id)
  WHERE school_id IS NOT NULL;

CREATE INDEX idx_fee_types_school ON public.fee_types(school_id);

-- RLS
ALTER TABLE public.fee_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fee_types_read" ON public.fee_types FOR SELECT
  USING (
    school_id IS NULL
    OR public.get_my_role() = 'super_admin'
    OR school_id = public.get_my_school_id()
  );

CREATE POLICY "fee_types_insert" ON public.fee_types FOR INSERT
  WITH CHECK (
    is_predefined = false
    AND (
      public.get_my_role() = 'super_admin'
      OR (public.get_my_role() = 'school_admin' AND school_id = public.get_my_school_id())
    )
  );

CREATE POLICY "fee_types_update" ON public.fee_types FOR UPDATE
  USING (
    is_predefined = false
    AND (
      public.get_my_role() = 'super_admin'
      OR (public.get_my_role() = 'school_admin' AND school_id = public.get_my_school_id())
    )
  )
  WITH CHECK (
    is_predefined = false
    AND (
      public.get_my_role() = 'super_admin'
      OR (public.get_my_role() = 'school_admin' AND school_id = public.get_my_school_id())
    )
  );

CREATE POLICY "fee_types_delete" ON public.fee_types FOR DELETE
  USING (
    is_predefined = false
    AND (
      public.get_my_role() = 'super_admin'
      OR (public.get_my_role() = 'school_admin' AND school_id = public.get_my_school_id())
    )
  );

-- Seed 13 predefined fee types
INSERT INTO public.fee_types (name, category, is_predefined, is_one_time, is_refundable, is_optional) VALUES
  -- Core
  ('Tuition Fee',                               'core',          true, false, false, false),
  ('Special Fee / Smart Class Fee',             'core',          true, false, false, false),
  ('Examination Fee',                           'core',          true, false, false, false),
  -- Ancillary
  ('Admission Fee',                             'ancillary',     true, true,  false, false),
  ('Caution Deposit',                           'ancillary',     true, false, true,  false),
  ('Books, Notebooks, and Stationery Fee',      'ancillary',     true, false, false, false),
  ('Uniform and Identity Card Charges',         'ancillary',     true, false, false, false),
  ('Transport / Van Fee',                       'ancillary',     true, false, false, false),
  ('Extracurricular / Co-curricular Activity Fee', 'ancillary',  true, false, false, false),
  -- Miscellaneous
  ('Capitation Fee / Donation',                 'miscellaneous', true, false, false, true),
  ('Building Fund / Infrastructure Development Fee', 'miscellaneous', true, false, false, true),
  ('Tie-up / Compulsory Tie-in Fees',           'miscellaneous', true, false, false, false),
  ('Skill-Class Fees',                          'miscellaneous', true, false, false, false);

-- Migrate fee_line_items: replace free-text fee_type with FK
ALTER TABLE public.fee_line_items DROP COLUMN fee_type;
ALTER TABLE public.fee_line_items ADD COLUMN fee_type_id UUID REFERENCES public.fee_types(id);
ALTER TABLE public.fee_line_items ALTER COLUMN fee_type_id SET NOT NULL;
CREATE INDEX idx_fee_line_items_fee_type ON public.fee_line_items(fee_type_id);
```

- [ ] **Step 2: Apply migration to local Supabase**

```bash
cd "/Users/dineshlearning/Documents/make money/erp"
npx supabase db reset
```

Expected: migration runs without errors, all 13 seed rows inserted.

Verify:
```bash
npx supabase db diff --schema public
```

Expected: no pending diff (schema matches migrations).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20240001000035_fee_types.sql
git commit -m "feat(db): add fee_types table, seed 13 predefined types, drop legacy fee tables"
```

---

## Task 2: FeeTypeSelect Shared Component

**Files:**
- Create: `apps/web/components/fee-type-select.tsx`

- [ ] **Step 1: Create the component**

```tsx
// apps/web/components/fee-type-select.tsx

export interface FeeType {
  id: string;
  name: string;
  category: "core" | "ancillary" | "miscellaneous";
  is_predefined: boolean;
}

interface Props {
  feeTypes: FeeType[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
  placeholder?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  core: "Core Fees",
  ancillary: "Ancillary & Service Fees",
  miscellaneous: "Miscellaneous Fees",
};

const CATEGORY_ORDER = ["core", "ancillary", "miscellaneous"] as const;

export function FeeTypeSelect({
  feeTypes,
  value,
  onChange,
  required,
  className,
  placeholder = "Select fee type",
}: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      className={
        className ??
        "mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      }
    >
      <option value="">{placeholder}</option>
      {CATEGORY_ORDER.map((cat) => {
        const predefined = feeTypes.filter((ft) => ft.category === cat && ft.is_predefined);
        const custom = feeTypes.filter((ft) => ft.category === cat && !ft.is_predefined);
        const all = [...predefined, ...custom];
        if (all.length === 0) return null;
        return (
          <optgroup key={cat} label={CATEGORY_LABELS[cat]}>
            {all.map((ft) => (
              <option key={ft.id} value={ft.id}>
                {ft.name}
                {!ft.is_predefined ? " (Custom)" : ""}
              </option>
            ))}
          </optgroup>
        );
      })}
    </select>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/fee-type-select.tsx
git commit -m "feat(ui): add FeeTypeSelect grouped dropdown component"
```

---

## Task 3: Fee Types API Routes

**Files:**
- Create: `apps/web/app/api/fee-types/route.ts`
- Create: `apps/web/app/api/fee-types/[id]/route.ts`

- [ ] **Step 1: Create `apps/web/app/api/fee-types/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const schoolId = await getSchoolId();
  if (!schoolId) return NextResponse.json({ error: "No school context" }, { status: 400 });

  const { data, error } = await supabase
    .from("fee_types")
    .select("id, name, category, is_predefined, is_one_time, is_refundable, is_optional")
    .or(`school_id.eq.${schoolId},school_id.is.null`)
    .order("is_predefined", { ascending: false })
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ feeTypes: data });
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role, school_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!roleRow || !["school_admin", "super_admin"].includes(roleRow.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const schoolId = await getSchoolId();
  if (!schoolId) return NextResponse.json({ error: "No school context" }, { status: 400 });
  if (roleRow.school_id !== schoolId && roleRow.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { name: string; category: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.name?.trim() || !["core", "ancillary", "miscellaneous"].includes(body.category)) {
    return NextResponse.json({ error: "name and valid category are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("fee_types")
    .insert({ name: body.name.trim(), category: body.category, is_predefined: false, school_id: schoolId })
    .select("id, name, category, is_predefined")
    .single();

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "A fee type with this name already exists." }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ feeType: data }, { status: 201 });
}
```

- [ ] **Step 2: Create `apps/web/app/api/fee-types/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";

interface Params { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role, school_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!roleRow || !["school_admin", "super_admin"].includes(roleRow.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const schoolId = await getSchoolId();
  if (!schoolId) return NextResponse.json({ error: "No school context" }, { status: 400 });

  let body: { name?: string; category?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.category && !["core", "ancillary", "miscellaneous"].includes(body.category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const updates: Record<string, string> = {};
  if (body.name?.trim()) updates.name = body.name.trim();
  if (body.category) updates.category = body.category;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("fee_types")
    .update(updates)
    .eq("id", id)
    .eq("is_predefined", false)
    .eq("school_id", schoolId)
    .select("id, name, category, is_predefined")
    .single();

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "A fee type with this name already exists." }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Not found or forbidden" }, { status: 404 });
  return NextResponse.json({ feeType: data });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role, school_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!roleRow || !["school_admin", "super_admin"].includes(roleRow.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const schoolId = await getSchoolId();
  if (!schoolId) return NextResponse.json({ error: "No school context" }, { status: 400 });

  const { error, count } = await supabase
    .from("fee_types")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("is_predefined", false)
    .eq("school_id", schoolId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!count) return NextResponse.json({ error: "Not found or forbidden" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/fee-types/
git commit -m "feat(api): add fee-types CRUD endpoints"
```

---

## Task 4: Fee Types Settings Page

**Files:**
- Create: `apps/web/app/(school)/admin/settings/fee-types/page.tsx`
- Create: `apps/web/app/(school)/admin/settings/fee-types/fee-types-client.tsx`

- [ ] **Step 1: Create `apps/web/app/(school)/admin/settings/fee-types/fee-types-client.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { FeeType } from "@/components/fee-type-select";

interface Props {
  predefined: FeeType[];
  custom: FeeType[];
}

const CATEGORIES = [
  { value: "core", label: "Core Fees" },
  { value: "ancillary", label: "Ancillary & Service Fees" },
  { value: "miscellaneous", label: "Miscellaneous Fees" },
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  core: "Core Fees",
  ancillary: "Ancillary & Service Fees",
  miscellaneous: "Miscellaneous Fees",
};

const CATEGORY_ORDER = ["core", "ancillary", "miscellaneous"];

function FlagBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-current px-1.5 py-0.5 text-[10px] font-medium opacity-60">
      {label}
    </span>
  );
}

export function FeeTypesClient({ predefined, custom: initialCustom }: Props) {
  const router = useRouter();
  const [custom, setCustom] = useState(initialCustom);

  // Add form
  const [adding, setAdding] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", category: "core" as string });
  const [addLoading, setAddLoading] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", category: "" });
  const [editLoading, setEditLoading] = useState(false);

  async function handleAdd() {
    if (!addForm.name.trim()) { toast.error("Name is required."); return; }
    setAddLoading(true);
    const res = await fetch("/api/fee-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    });
    const data = await res.json();
    setAddLoading(false);
    if (!res.ok) { toast.error(data.error ?? "Failed to add."); return; }
    setCustom((prev) => [...prev, data.feeType]);
    setAddForm({ name: "", category: "core" });
    setAdding(false);
    toast.success("Custom fee type added.");
  }

  async function handleEdit(id: string) {
    setEditLoading(true);
    const res = await fetch(`/api/fee-types/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    const data = await res.json();
    setEditLoading(false);
    if (!res.ok) { toast.error(data.error ?? "Failed to update."); return; }
    setCustom((prev) => prev.map((ft) => ft.id === id ? data.feeType : ft));
    setEditingId(null);
    toast.success("Fee type updated.");
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this custom fee type? Any line items using it will lose their type reference.")) return;
    const res = await fetch(`/api/fee-types/${id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json(); toast.error(d.error ?? "Failed to delete."); return; }
    setCustom((prev) => prev.filter((ft) => ft.id !== id));
    toast.success("Fee type deleted.");
  }

  return (
    <div className="space-y-10">
      {/* Predefined types — read-only */}
      <div>
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Predefined Fee Types</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          These are standard fee types available to all schools. They cannot be edited or deleted.
        </p>
        {CATEGORY_ORDER.map((cat) => {
          const types = predefined.filter((ft) => ft.category === cat);
          if (types.length === 0) return null;
          return (
            <div key={cat} className="mb-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {CATEGORY_LABELS[cat]}
              </p>
              <div className="divide-y divide-border rounded-lg border bg-card">
                {types.map((ft) => (
                  <div key={ft.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="flex-1 text-sm font-medium text-foreground">{ft.name}</span>
                    <div className="flex gap-1.5">
                      {ft.is_one_time && <FlagBadge label="One-Time" />}
                      {ft.is_refundable && <FlagBadge label="Refundable" />}
                      {ft.is_optional && <FlagBadge label="Optional" />}
                    </div>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Predefined
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Custom types */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Custom Fee Types</h2>
            <p className="mt-1 text-sm text-muted-foreground">Fee types specific to your school.</p>
          </div>
          <button
            onClick={() => { setAdding(!adding); setAddForm({ name: "", category: "core" }); }}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            + Add Custom Type
          </button>
        </div>

        {adding && (
          <div className="my-4 rounded-lg border border-indigo-200 bg-indigo-50 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-indigo-600">New Custom Fee Type</p>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Name *</label>
                <input
                  type="text"
                  value={addForm.name}
                  onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Annual Day Fee"
                  className="mt-0.5 block w-56 rounded-md border border-input bg-white px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Category *</label>
                <select
                  value={addForm.category}
                  onChange={(e) => setAddForm((f) => ({ ...f, category: e.target.value }))}
                  className="mt-0.5 block rounded-md border border-input bg-white px-3 py-1.5 text-sm"
                >
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <button
                onClick={handleAdd}
                disabled={addLoading}
                className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {addLoading ? "Saving…" : "Save"}
              </button>
              <button onClick={() => setAdding(false)} className="text-sm text-muted-foreground hover:text-foreground">
                Cancel
              </button>
            </div>
          </div>
        )}

        {custom.length === 0 && !adding ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No custom fee types yet. Add one above.
          </div>
        ) : (
          <div className="divide-y divide-border rounded-lg border bg-card">
            {custom.map((ft) => (
              <div key={ft.id} className="flex items-center gap-3 px-4 py-3">
                {editingId === ft.id ? (
                  <>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-48 rounded-md border border-input bg-white px-3 py-1 text-sm"
                    />
                    <select
                      value={editForm.category}
                      onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                      className="rounded-md border border-input bg-white px-3 py-1 text-sm"
                    >
                      {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                    <button
                      onClick={() => handleEdit(ft.id)}
                      disabled={editLoading}
                      className="text-sm font-medium text-indigo-600 hover:underline disabled:opacity-50"
                    >
                      {editLoading ? "Saving…" : "Save"}
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-sm text-muted-foreground hover:text-foreground">
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-medium text-foreground">{ft.name}</span>
                    <span className="text-xs text-muted-foreground">{CATEGORY_LABELS[ft.category]}</span>
                    <button
                      onClick={() => { setEditingId(ft.id); setEditForm({ name: ft.name, category: ft.category }); }}
                      className="text-sm font-medium text-indigo-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(ft.id)}
                      className="text-sm font-medium text-red-500 hover:underline"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `apps/web/app/(school)/admin/settings/fee-types/page.tsx`**

```tsx
export const dynamic = "force-dynamic";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { FeeTypesClient } from "./fee-types-client";
import type { FeeType } from "@/components/fee-type-select";

export default async function FeeTypesPage() {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  const { data } = await supabase
    .from("fee_types")
    .select("id, name, category, is_predefined, is_one_time, is_refundable, is_optional")
    .or(`school_id.eq.${schoolId},school_id.is.null`)
    .order("name");

  const all = (data ?? []) as (FeeType & { is_one_time: boolean; is_refundable: boolean; is_optional: boolean })[];
  const predefined = all.filter((ft) => ft.is_predefined);
  const custom = all.filter((ft) => !ft.is_predefined);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Fee Types</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage the fee types available when creating fee line items.
        </p>
      </div>
      <FeeTypesClient predefined={predefined} custom={custom} />
    </div>
  );
}
```

- [ ] **Step 3: Add "Fee Types" nav item to school_admin sidebar**

Open `apps/web/app/(school)/layout.tsx`. In the `NAV_ITEMS.school_admin` array, add the Fee Types entry after "Fees":

Old:
```typescript
    { label: "Fees",           href: "/admin/fees" },
    { label: "Syllabus",       href: "/admin/syllabus" },
```

New:
```typescript
    { label: "Fees",           href: "/admin/fees" },
    { label: "Fee Types",      href: "/admin/settings/fee-types" },
    { label: "Syllabus",       href: "/admin/syllabus" },
```

- [ ] **Step 4: Add "Fee Types" icon to sidebar ICON_MAP**

Open `apps/web/components/sidebar.tsx`. Add `Tag` to the lucide imports and add to ICON_MAP:

At the top, add `Tag` to the lucide import:
```typescript
import {
  LayoutDashboard, School, GraduationCap, Users, BookOpen,
  Calendar, ClipboardList, DollarSign, Megaphone, Settings,
  Clock, FileText, MessageSquare, UserCheck,
  Building2, BarChart3, Shield, Upload, LogOut, Image, Tag,
} from "lucide-react";
```

In `ICON_MAP`:
```typescript
  "Fee Types": Tag,
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/(school)/admin/settings/fee-types/ apps/web/app/(school)/layout.tsx apps/web/components/sidebar.tsx
git commit -m "feat(settings): add Fee Types management page with predefined/custom display and CRUD"
```

---

## Task 5: Update Admin Fees Page (Push Fee Form)

**Files:**
- Modify: `apps/web/app/(school)/admin/fees/page.tsx`
- Modify: `apps/web/app/(school)/admin/fees/push-fee-form.tsx`
- Delete: `apps/web/app/(school)/admin/fees/add-fee-structure-form.tsx`
- Modify: `apps/web/app/api/fees/push-to-class/route.ts`

- [ ] **Step 1: Update `apps/web/app/(school)/admin/fees/page.tsx`**

Replace the entire file:

```tsx
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { PushFeeForm } from "./push-fee-form";
import type { FeeType } from "@/components/fee-type-select";

export default async function FeesPage() {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  const [classesRes, academicYearsRes, lineItemsRes, feeTypesRes] = await Promise.all([
    supabase.from("classes").select("id, name").eq("school_id", schoolId).order("name"),
    supabase.from("academic_years").select("id, name").eq("school_id", schoolId).order("start_date", { ascending: false }),
    supabase
      .from("fee_line_items")
      .select("id, fee_type:fee_types(name), total_amount, due_date, status, student:student_profiles(full_name), class:classes(name), academic_year:academic_years(name)")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("fee_types")
      .select("id, name, category, is_predefined")
      .or(`school_id.eq.${schoolId},school_id.is.null`)
      .order("is_predefined", { ascending: false })
      .order("name"),
  ]);

  const lineItemRows = (lineItemsRes.data ?? []).map((li) => ({
    id: li.id as string,
    student: (li.student as { full_name?: string } | null)?.full_name ?? "—",
    fee_type: (li.fee_type as { name?: string } | null)?.name ?? "—",
    amount: `₹${Number(li.total_amount).toLocaleString("en-IN")}`,
    class_name: (li.class as { name?: string } | null)?.name ?? "—",
    academic_year: (li.academic_year as { name?: string } | null)?.name ?? "—",
    due_date: (li.due_date as string | null) ?? "—",
    status: li.status as string,
  }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Fees</h1>

      <h2 className="mb-4 text-xl font-semibold text-gray-800">Push Fee to Class</h2>
      <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
        <p className="mb-4 text-sm text-muted-foreground">Creates a fee line item for every student in the selected class.</p>
        <PushFeeForm
          classes={(classesRes.data ?? []).map((c) => ({ id: c.id, name: c.name }))}
          academicYears={(academicYearsRes.data ?? []).map((y) => ({ id: y.id, name: y.name }))}
          feeTypes={(feeTypesRes.data ?? []) as FeeType[]}
        />
      </div>

      <h2 className="mb-4 mt-10 text-xl font-semibold text-gray-800">Fee Line Items (Recent 100)</h2>
      <DataTable
        data={lineItemRows}
        columns={[
          { header: "Student", accessor: "student" },
          { header: "Fee Type", accessor: "fee_type" },
          { header: "Amount", accessor: "amount" },
          { header: "Class", accessor: "class_name" },
          { header: "Academic Year", accessor: "academic_year" },
          { header: "Due Date", accessor: "due_date" },
          {
            header: "Status",
            accessor: (row) => (
              <Badge variant={row.status === "paid" ? "default" : row.status === "partial" ? "secondary" : "destructive"}>
                {row.status || "pending"}
              </Badge>
            ),
          },
        ]}
        emptyMessage="No fee line items yet. Push a fee to a class to get started."
      />
    </div>
  );
}
```

- [ ] **Step 2: Replace `apps/web/app/(school)/admin/fees/push-fee-form.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FeeTypeSelect, type FeeType } from "@/components/fee-type-select";

interface Props {
  classes: { id: string; name: string }[];
  academicYears: { id: string; name: string }[];
  feeTypes: FeeType[];
}

export function PushFeeForm({ classes, academicYears, feeTypes }: Props) {
  const router = useRouter();
  const [feeTypeId, setFeeTypeId] = useState("");
  const [amount, setAmount] = useState("");
  const [classId, setClassId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ created: number } | null>(null);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);
    if (!classId) { setError("Please select a class."); return; }
    if (!feeTypeId) { setError("Please select a fee type."); return; }
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) { setError("Enter a valid amount."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/fees/push-to-class", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          class_id: classId,
          academic_year_id: academicYearId || null,
          fee_type_id: feeTypeId,
          total_amount: amountNum,
          due_date: dueDate || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to push fees."); return; }
      setResult({ created: data.created });
      setFeeTypeId(""); setAmount(""); setClassId(""); setAcademicYearId(""); setDueDate("");
      router.refresh();
    } catch {
      setError("Unexpected error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-48">
          <Label>Fee Type</Label>
          <FeeTypeSelect
            feeTypes={feeTypes}
            value={feeTypeId}
            onChange={setFeeTypeId}
            required
          />
        </div>
        <div className="w-36">
          <Label>Amount (₹)</Label>
          <Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="5000" required />
        </div>
        <div className="w-40">
          <Label>Class</Label>
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Select class</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="w-44">
          <Label>Academic Year</Label>
          <select
            value={academicYearId}
            onChange={(e) => setAcademicYearId(e.target.value)}
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Select year</option>
            {academicYears.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
          </select>
        </div>
        <div>
          <Label>Due Date (optional)</Label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "Pushing…" : "Push to Class"}
        </Button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {result && (
        <p className="text-sm text-green-700">
          Done — created {result.created} fee line item{result.created !== 1 ? "s" : ""}.
        </p>
      )}
    </form>
  );
}
```

- [ ] **Step 3: Delete `add-fee-structure-form.tsx`**

```bash
rm "/Users/dineshlearning/Documents/make money/erp/apps/web/app/(school)/admin/fees/add-fee-structure-form.tsx"
```

- [ ] **Step 4: Update `apps/web/app/api/fees/push-to-class/route.ts`**

Change the body type and the fee_line_items insert. In the existing file:

Replace:
```typescript
  let body: { class_id: string; academic_year_id: string; fee_type: string; total_amount: number; due_date?: string };
```
With:
```typescript
  let body: { class_id: string; academic_year_id: string; fee_type_id: string; total_amount: number; due_date?: string };
```

Replace:
```typescript
  if (!body.class_id || !body.fee_type || typeof body.total_amount !== "number" || body.total_amount <= 0 || !isFinite(body.total_amount)) {
```
With:
```typescript
  if (!body.class_id || !body.fee_type_id || typeof body.total_amount !== "number" || body.total_amount <= 0 || !isFinite(body.total_amount)) {
```

Replace in the lineItems map:
```typescript
    fee_type: body.fee_type,
```
With:
```typescript
    fee_type_id: body.fee_type_id,
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/(school)/admin/fees/ apps/web/app/api/fees/push-to-class/route.ts
git commit -m "feat(fees): replace free-text fee_type with FeeTypeSelect dropdown in admin push fee form"
```

---

## Task 6: Update Student Fees Client

**Files:**
- Modify: `apps/web/app/(school)/admin/students/[id]/student-fees-tab.tsx`
- Modify: `apps/web/app/(school)/admin/students/[id]/student-fees-client.tsx`

- [ ] **Step 1: Update `student-fees-tab.tsx`**

Replace the entire file:

```tsx
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { StudentFeesClient } from "./student-fees-client";
import type { FeeType } from "@/components/fee-type-select";

interface Props {
  studentId: string;
  studentName: string;
}

export async function StudentFeesTab({ studentId, studentName }: Props) {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  const [lineItemsRes, paymentsRes, feeTypesRes] = await Promise.all([
    supabase
      .from("fee_line_items")
      .select("id, fee_type:fee_types(name), total_amount, due_date, status, created_at, added_by_profile:profiles!added_by(full_name)")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false }),
    supabase
      .from("payments")
      .select("id, payment_date, total_amount, payment_method, mode, transaction_id, razorpay_payment_id, notes, paid_by_profile:profiles!paid_by_profile_id(full_name), line_item_payments(line_item_id, amount_applied, fee_line_items!line_item_id(fee_type:fee_types(name)))")
      .eq("student_id", studentId)
      .order("payment_date", { ascending: false }),
    supabase
      .from("fee_types")
      .select("id, name, category, is_predefined")
      .or(`school_id.eq.${schoolId},school_id.is.null`)
      .order("is_predefined", { ascending: false })
      .order("name"),
  ]);

  const lipByLineItem: Record<string, number> = {};
  for (const p of paymentsRes.data ?? []) {
    for (const lip of (p as any).line_item_payments ?? []) {
      lipByLineItem[lip.line_item_id] = (lipByLineItem[lip.line_item_id] ?? 0) + lip.amount_applied;
    }
  }

  const lineItems = (lineItemsRes.data ?? []).map((li: any) => ({
    id: li.id,
    fee_type: (li.fee_type as { name?: string } | null)?.name ?? "—",
    total_amount: Number(li.total_amount),
    amount_paid: lipByLineItem[li.id] ?? 0,
    due_date: li.due_date ?? null,
    status: li.status,
    created_at: li.created_at,
    added_by: (li.added_by_profile as { full_name?: string } | null)?.full_name ?? "—",
  }));

  const payments = (paymentsRes.data ?? []).map((p: any) => ({
    id: p.id,
    payment_date: p.payment_date,
    total_amount: Number(p.total_amount),
    payment_method: p.payment_method,
    mode: p.mode,
    transaction_id: p.transaction_id ?? null,
    razorpay_payment_id: p.razorpay_payment_id ?? null,
    notes: p.notes ?? null,
    paid_by: (p.paid_by_profile as { full_name?: string } | null)?.full_name ?? "—",
    line_items_covered: ((p.line_item_payments ?? []) as any[]).map((lip) => ({
      line_item_id: lip.line_item_id,
      fee_type: (lip.fee_line_items as { fee_type?: { name?: string } } | null)?.fee_type?.name ?? "—",
      amount_applied: lip.amount_applied,
    })),
  }));

  return (
    <StudentFeesClient
      lineItems={lineItems}
      payments={payments}
      schoolId={schoolId}
      studentId={studentId}
      studentName={studentName}
      feeTypes={(feeTypesRes.data ?? []) as FeeType[]}
    />
  );
}
```

- [ ] **Step 2: Update `student-fees-client.tsx`**

Add `feeTypes` to Props interface. Replace the `FeeTypeSelect` import and update the Add Fee form.

At the top of the file, add the import (after existing imports):
```tsx
import { FeeTypeSelect, type FeeType } from "@/components/fee-type-select";
```

Update the `Props` interface — add `feeTypes`:
```tsx
interface Props {
  lineItems: LineItem[];
  payments: PaymentRecord[];
  schoolId: string;
  studentId: string;
  studentName: string;
  feeTypes: FeeType[];
}
```

Update the function signature:
```tsx
export function StudentFeesClient({ lineItems, payments, schoolId, studentId, feeTypes }: Props) {
```

Update the feeForm state to use `fee_type_id`:
```tsx
  const [feeForm, setFeeForm] = useState({ fee_type_id: "", total_amount: "", due_date: "" });
```

In `handleAddFee`, replace the fee_type validation and insert:
```tsx
  async function handleAddFee() {
    const amount = parseFloat(feeForm.total_amount);
    if (!feeForm.fee_type_id) { toast.error("Fee type is required."); return; }
    if (isNaN(amount) || amount <= 0) { toast.error("Enter a valid amount."); return; }
    setFeeLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("fee_line_items").insert({
      school_id: schoolId,
      student_id: studentId,
      fee_type_id: feeForm.fee_type_id,
      total_amount: amount,
      due_date: feeForm.due_date || null,
      status: "pending",
    });
    setFeeLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Fee added.");
    setFeeForm({ fee_type_id: "", total_amount: "", due_date: "" });
    setAddingFee(false);
    router.refresh();
  }
```

In the Add Fee inline form, replace the Fee Type text input:
```tsx
              <div>
                <label className="text-xs text-muted-foreground">Fee Type *</label>
                <FeeTypeSelect
                  feeTypes={feeTypes}
                  value={feeForm.fee_type_id}
                  onChange={(v) => setFeeForm((f) => ({ ...f, fee_type_id: v }))}
                  required
                  className="mt-0.5 block w-56 rounded-md border border-input bg-white px-3 py-1.5 text-sm"
                />
              </div>
```

Also update the cancel/reset handler in the Add Fee button:
```tsx
            onClick={() => { setAddingFee(!addingFee); setFeeForm({ fee_type_id: "", total_amount: "", due_date: "" }); }}
```

- [ ] **Step 3: Commit**

```bash
git add "apps/web/app/(school)/admin/students/[id]/student-fees-tab.tsx" "apps/web/app/(school)/admin/students/[id]/student-fees-client.tsx"
git commit -m "feat(students): use FeeTypeSelect in student fees add-fee form; update join for fee_type_id"
```

---

## Task 7: Rewrite Teacher Fees Page

**Files:**
- Rewrite: `apps/web/app/(school)/teacher/fees/page.tsx`
- Rewrite: `apps/web/app/(school)/teacher/fees/fees-table.tsx`
- Rewrite: `apps/web/app/(school)/teacher/fees/record-payment-form.tsx`

- [ ] **Step 1: Rewrite `apps/web/app/(school)/teacher/fees/page.tsx`**

```tsx
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { getActiveSection } from "@/lib/section-context";
import { NoSectionPrompt } from "../no-section-prompt";
import { FeesTable, type FeeRow } from "./fees-table";

export default async function TeacherFeesPage() {
  const sectionId = await getActiveSection();
  if (!sectionId) return <NoSectionPrompt />;

  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  const { data: sectionRow } = await supabase
    .from("sections")
    .select("id, name, class_id, class:classes(name)")
    .eq("id", sectionId)
    .single();

  const sec = sectionRow as unknown as {
    name: string;
    class_id: string;
    class: { name: string } | null;
  } | null;
  const sectionLabel = sec ? `${sec.class?.name ?? ""} – Section ${sec.name}` : "";

  // Fetch students in this section
  const { data: students } = await supabase
    .from("student_profiles")
    .select("id, full_name")
    .eq("section_id", sectionId)
    .order("full_name");

  const studentIds = (students ?? []).map((s) => s.id);
  const studentMap = new Map((students ?? []).map((s) => [s.id, s.full_name ?? "—"]));

  // Fetch fee line items for all students in this section
  const { data: lineItems } = studentIds.length > 0
    ? await supabase
        .from("fee_line_items")
        .select("id, student_id, fee_type:fee_types(name), total_amount, due_date, status")
        .eq("school_id", schoolId)
        .in("student_id", studentIds)
    : { data: [] };

  // Compute amount_paid per line item from line_item_payments
  const lineItemIds = (lineItems ?? []).map((li) => li.id);
  const { data: lips } = lineItemIds.length > 0
    ? await supabase
        .from("line_item_payments")
        .select("line_item_id, amount_applied")
        .in("line_item_id", lineItemIds)
    : { data: [] };

  const paidMap = new Map<string, number>();
  for (const lip of lips ?? []) {
    paidMap.set(lip.line_item_id, (paidMap.get(lip.line_item_id) ?? 0) + (lip.amount_applied as number));
  }

  const rows: FeeRow[] = (lineItems ?? []).map((li) => ({
    lineItemId: li.id as string,
    studentId: li.student_id as string,
    studentName: studentMap.get(li.student_id as string) ?? "—",
    feeTypeName: (li.fee_type as { name?: string } | null)?.name ?? "—",
    totalAmount: Number(li.total_amount),
    amountPaid: paidMap.get(li.id as string) ?? 0,
    status: li.status as string,
    dueDate: (li.due_date as string | null) ?? null,
  }));

  rows.sort((a, b) =>
    a.studentName.localeCompare(b.studentName) || a.feeTypeName.localeCompare(b.feeTypeName)
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Fees</h1>
        {sectionLabel && <p className="mt-1 text-sm text-gray-500">{sectionLabel}</p>}
      </div>
      <FeesTable rows={rows} schoolId={schoolId} />
    </div>
  );
}
```

- [ ] **Step 2: Rewrite `apps/web/app/(school)/teacher/fees/fees-table.tsx`**

```tsx
"use client";

import { useState } from "react";
import { RecordPaymentForm } from "./record-payment-form";

export interface FeeRow {
  lineItemId: string;
  studentId: string;
  studentName: string;
  feeTypeName: string;
  totalAmount: number;
  amountPaid: number;
  status: string;
  dueDate: string | null;
}

function StatusBadge({ status }: { status: string }) {
  const classes =
    status === "paid"
      ? "bg-emerald-100 text-emerald-800"
      : status === "partial"
        ? "bg-amber-100 text-amber-800"
        : "bg-rose-100 text-rose-800";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${classes}`}>
      {status}
    </span>
  );
}

export function FeesTable({ rows, schoolId }: { rows: FeeRow[]; schoolId: string }) {
  const [payingFor, setPayingFor] = useState<FeeRow | null>(null);

  return (
    <div>
      {payingFor && (
        <RecordPaymentForm
          schoolId={schoolId}
          studentId={payingFor.studentId}
          studentName={payingFor.studentName}
          lineItemId={payingFor.lineItemId}
          feeTypeName={payingFor.feeTypeName}
          totalAmount={payingFor.totalAmount}
          amountPaid={payingFor.amountPaid}
          onClose={() => setPayingFor(null)}
        />
      )}
      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/50">
            <tr>
              {["Student", "Fee Type", "Due (₹)", "Paid (₹)", "Due Date", "Status", ""].map((h) => (
                <th key={h} className={`px-4 py-3 text-left text-xs font-medium text-muted-foreground`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No fee line items for this section yet.
                </td>
              </tr>
            ) : rows.map((row) => (
              <tr key={row.lineItemId} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium">{row.studentName}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.feeTypeName}</td>
                <td className="px-4 py-3 tabular-nums">{row.totalAmount.toLocaleString("en-IN")}</td>
                <td className="px-4 py-3 tabular-nums text-emerald-700">{row.amountPaid.toLocaleString("en-IN")}</td>
                <td className="px-4 py-3">{row.dueDate ? new Date(row.dueDate).toLocaleDateString("en-IN") : "—"}</td>
                <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                <td className="px-4 py-3">
                  {row.status !== "paid" && (
                    <button
                      onClick={() => setPayingFor(row)}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      Record Payment
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Rewrite `apps/web/app/(school)/teacher/fees/record-payment-form.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Props {
  schoolId: string;
  studentId: string;
  studentName: string;
  lineItemId: string;
  feeTypeName: string;
  totalAmount: number;
  amountPaid: number;
  onClose: () => void;
}

const PAYMENT_METHODS = ["cash", "upi", "bank_transfer", "cheque"] as const;
const METHOD_LABELS: Record<string, string> = {
  cash: "Cash", upi: "UPI", bank_transfer: "Bank Transfer", cheque: "Cheque",
};

export function RecordPaymentForm({
  studentId,
  studentName,
  lineItemId,
  feeTypeName,
  totalAmount,
  amountPaid,
  onClose,
}: Props) {
  const router = useRouter();
  const pending = totalAmount - amountPaid;
  const [amount, setAmount] = useState(String(pending));
  const [method, setMethod] = useState("cash");
  const [txId, setTxId] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) { toast.error("Enter a valid amount."); return; }
    if (amountNum > pending) { toast.error(`Amount cannot exceed outstanding ₹${pending.toLocaleString("en-IN")}.`); return; }

    setLoading(true);
    const res = await fetch("/api/fees/record-offline-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student_id: studentId,
        payment_method: method,
        transaction_id: txId || undefined,
        notes: notes || undefined,
        allocations: [{ line_item_id: lineItemId, amount_applied: amountNum }],
      }),
    });
    setLoading(false);
    const data = await res.json();
    if (!res.ok) { toast.error(data.error ?? "Failed to record payment."); return; }
    toast.success("Payment recorded.");
    router.refresh();
    onClose();
  }

  return (
    <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-blue-600">
        Record Payment — {studentName}
      </p>
      <p className="mb-3 text-xs text-muted-foreground">
        {feeTypeName} · Outstanding ₹{pending.toLocaleString("en-IN")}
      </p>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs text-muted-foreground">Amount (₹) *</label>
          <input
            type="number" min={1} max={pending}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-0.5 block w-28 rounded-md border border-input bg-white px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Method</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="mt-0.5 block rounded-md border border-input bg-white px-3 py-1.5 text-sm"
          >
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{METHOD_LABELS[m]}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Receipt / Txn ID</label>
          <input
            type="text"
            value={txId}
            onChange={(e) => setTxId(e.target.value)}
            placeholder="Optional"
            className="mt-0.5 block w-36 rounded-md border border-input bg-white px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Notes</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional"
            className="mt-0.5 block w-36 rounded-md border border-input bg-white px-3 py-1.5 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">
          Cancel
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add "apps/web/app/(school)/teacher/fees/"
git commit -m "feat(teacher): rewrite teacher fees page to use fee_line_items + fee_types; drop legacy fee_structures"
```

---

## Task 8: Update Mobile Fees Screen

**Files:**
- Modify: `apps/mobile/app/(parent)/fees.tsx`

- [ ] **Step 1: Find the fee_line_items query in `fees.tsx`**

Search for the supabase query that fetches from `fee_line_items`. It will look something like:
```typescript
supabase.from("fee_line_items").select("id, fee_type, total_amount, ...")
```

- [ ] **Step 2: Update the select to join fee_types**

Change the select string to use the FK relationship:
```typescript
supabase.from("fee_line_items").select("id, fee_type:fee_types(name), total_amount, due_date, status")
```

Then in the mapping where the result is processed, change any `li.fee_type` string reference to:
```typescript
fee_type: (li.fee_type as { name?: string } | null)?.name ?? "—",
```

This ensures `FeeLineItem.fee_type` stays as `string` type and all downstream display code (`FeeTypePieChart`, fee breakdown lists) works unchanged.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/(parent)/fees.tsx
git commit -m "feat(mobile): update parent fees screen to join fee_types for name display"
```

---

## Self-Review

**Spec coverage check:**
- ✅ 13 predefined fee types seeded (Task 1)
- ✅ Global predefined + school-specific custom types (Task 1 schema)
- ✅ 3 categories stored in DB (Task 1)
- ✅ `is_one_time`, `is_refundable`, `is_optional` flags stored but not enforced (Task 1)
- ✅ Sensitive types (`Capitation Fee`, `Building Fund`) seeded with `is_optional=true` (Task 1)
- ✅ `fee_type TEXT` replaced with `fee_type_id UUID FK` in fee_line_items (Task 1)
- ✅ `fee_structures` and `fee_payments` dropped (Task 1)
- ✅ `FeeTypeSelect` grouped dropdown (Task 2)
- ✅ Dropdown groups by category, predefined first, custom within category (Task 2)
- ✅ Fee Types settings screen under Admin → Settings → Fee Types (Task 4)
- ✅ Predefined types read-only, custom types CRUD (Task 4)
- ✅ Custom type creation requires category selection (Task 3 API + Task 4 UI)
- ✅ Push fee form uses dropdown (Task 5)
- ✅ Student add-fee form uses dropdown (Task 6)
- ✅ Teacher fees page migrated to new architecture (Task 7)
- ✅ Mobile fees screen updated (Task 8)

**Type consistency check:**
- `FeeType` interface exported from `fee-type-select.tsx` and imported everywhere — consistent.
- `feeTypeId`/`fee_type_id` — all forms send `fee_type_id` UUID, API receives `fee_type_id`. Consistent.
- `FeeRow.lineItemId` used in `fees-table.tsx` and `record-payment-form.tsx` Props. Consistent.
- `fee_type` display field is always a string (name) derived from join — consistent across admin, student, teacher, mobile.
