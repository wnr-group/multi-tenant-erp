# Payment System Rework — Plan B

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat `fee_structures + fee_payments` model with a proper `fee_line_items + payments + line_item_payments` three-table model, add Razorpay online payment from the parent mobile app, and surface detailed click-through history on the admin student profile fees tab.

**Architecture:** New schema migration adds three tables and preserves existing data. Admin pushes fees at class level → a new API route fans out into per-student `fee_line_items`. Parent selects pending line items → mobile calls a Next.js API route to create a Razorpay order → Razorpay SDK completes payment → Supabase Edge Function webhook confirms and writes the `payments` + `line_item_payments` records. Admin student profile shows a line item history table and a payment transaction table, both with clickable detail modals.

**Tech Stack:** Next.js 15 API Routes, Supabase (server + service role + Edge Functions), Razorpay Node.js SDK (`razorpay` npm package), `react-native-razorpay` (already in mobile package.json), Deno (Supabase Edge Function), recharts (pie chart already in Plan A).

---

## Data Model

```
fee_line_items
──────────────
id                UUID PK
school_id         UUID FK schools
student_id        UUID FK student_profiles
fee_type          TEXT
total_amount      NUMERIC
due_date          DATE
added_by          UUID FK profiles (admin who pushed this fee)
class_id          UUID FK classes (for reference/filtering)
academic_year_id  UUID FK academic_years
status            TEXT ('pending' | 'partial' | 'paid')
created_at        TIMESTAMPTZ

payments
────────
id                    UUID PK
school_id             UUID FK schools
student_id            UUID FK student_profiles
paid_by_profile_id    UUID FK profiles (parent who paid)
payment_date          TIMESTAMPTZ
total_amount          NUMERIC
payment_method        TEXT ('online' | 'cash' | 'upi' | 'bank_transfer' | 'cheque')
mode                  TEXT ('online' | 'offline')
transaction_id        TEXT (receipt no for offline; razorpay_payment_id for online)
razorpay_order_id     TEXT nullable
razorpay_payment_id   TEXT nullable
notes                 TEXT nullable
created_at            TIMESTAMPTZ

line_item_payments
──────────────────
id              UUID PK
payment_id      UUID FK payments
line_item_id    UUID FK fee_line_items
amount_applied  NUMERIC
created_at      TIMESTAMPTZ
```

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `supabase/migrations/20240001000026_payment_rework.sql` | Create | New tables, RLS, indexes |
| `apps/web/app/api/fees/push-to-class/route.ts` | Create | Fan out fee_line_items to all students in a class |
| `apps/web/app/api/fees/record-offline-payment/route.ts` | Create | Admin records cash/cheque/UPI payment offline |
| `apps/web/app/api/fees/create-razorpay-order/route.ts` | Create | Create Razorpay order for parent payment |
| `supabase/functions/razorpay-webhook/index.ts` | Create | Verify webhook signature + write payments record |
| `apps/web/app/(school)/admin/fees/page.tsx` | Modify | Replace fee structure form with "Push Fee to Class" form |
| `apps/web/app/(school)/admin/students/[id]/student-fees-tab.tsx` | Modify | Query fee_line_items + payments for this student |
| `apps/web/app/(school)/admin/students/[id]/student-fees-client.tsx` | Modify (rewrite) | Line items table + payment transactions table + detail modals + offline payment form |
| `apps/mobile/app/(parent)/fees.tsx` | Modify (rewrite) | Show line items, selectable checkboxes, pay selected via Razorpay |

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20240001000026_payment_rework.sql`

- [ ] **Step 1: Write the migration**

```sql
-- fee_line_items: one row per student per fee type
CREATE TABLE public.fee_line_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id        UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id       UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  fee_type         TEXT NOT NULL,
  total_amount     NUMERIC(12,2) NOT NULL CHECK (total_amount > 0),
  due_date         DATE,
  added_by         UUID REFERENCES public.profiles(id),
  class_id         UUID REFERENCES public.classes(id),
  academic_year_id UUID REFERENCES public.academic_years(id),
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','partial','paid')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fee_line_items_student ON public.fee_line_items(student_id);
CREATE INDEX idx_fee_line_items_school ON public.fee_line_items(school_id);

-- payments: one row per payment transaction (can cover multiple line items)
CREATE TABLE public.payments (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id            UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id           UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  paid_by_profile_id   UUID REFERENCES public.profiles(id),
  payment_date         TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_amount         NUMERIC(12,2) NOT NULL CHECK (total_amount > 0),
  payment_method       TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('online','cash','upi','bank_transfer','cheque')),
  mode                 TEXT NOT NULL DEFAULT 'offline' CHECK (mode IN ('online','offline')),
  transaction_id       TEXT,
  razorpay_order_id    TEXT,
  razorpay_payment_id  TEXT,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_student ON public.payments(student_id);
CREATE INDEX idx_payments_school ON public.payments(school_id);
CREATE UNIQUE INDEX idx_payments_razorpay ON public.payments(razorpay_payment_id) WHERE razorpay_payment_id IS NOT NULL;

-- line_item_payments: junction — how much of a payment went to each line item
CREATE TABLE public.line_item_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id      UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  line_item_id    UUID NOT NULL REFERENCES public.fee_line_items(id) ON DELETE CASCADE,
  amount_applied  NUMERIC(12,2) NOT NULL CHECK (amount_applied > 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lip_payment ON public.line_item_payments(payment_id);
CREATE INDEX idx_lip_line_item ON public.line_item_payments(line_item_id);

-- RLS
ALTER TABLE public.fee_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_item_payments ENABLE ROW LEVEL SECURITY;

-- fee_line_items: admins/principal/teachers of same school can read; admins can write
CREATE POLICY "fli_read" ON public.fee_line_items FOR SELECT
  USING (
    public.get_my_role() IN ('school_admin', 'principal', 'teacher', 'super_admin')
    AND school_id = public.get_my_school_id()
    OR EXISTS (
      SELECT 1 FROM public.student_profiles sp
      WHERE sp.id = fee_line_items.student_id
      AND sp.parent_profile_id = auth.uid()
    )
  );

CREATE POLICY "fli_write" ON public.fee_line_items FOR INSERT
  WITH CHECK (
    public.get_my_role() IN ('school_admin', 'super_admin')
    AND school_id = public.get_my_school_id()
  );

CREATE POLICY "fli_update" ON public.fee_line_items FOR UPDATE
  USING (
    public.get_my_role() IN ('school_admin', 'super_admin')
    AND school_id = public.get_my_school_id()
  );

-- payments: admins can read/write; parents can read their student's payments
CREATE POLICY "payments_read" ON public.payments FOR SELECT
  USING (
    public.get_my_role() IN ('school_admin', 'principal', 'super_admin')
    AND school_id = public.get_my_school_id()
    OR EXISTS (
      SELECT 1 FROM public.student_profiles sp
      WHERE sp.id = payments.student_id
      AND sp.parent_profile_id = auth.uid()
    )
  );

CREATE POLICY "payments_write" ON public.payments FOR INSERT
  WITH CHECK (
    public.get_my_role() IN ('school_admin', 'super_admin')
    AND school_id = public.get_my_school_id()
  );

-- line_item_payments: same as payments
CREATE POLICY "lip_read" ON public.line_item_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.payments p
      WHERE p.id = line_item_payments.payment_id
      AND (
        (public.get_my_role() IN ('school_admin', 'principal', 'super_admin') AND p.school_id = public.get_my_school_id())
        OR EXISTS (
          SELECT 1 FROM public.student_profiles sp
          WHERE sp.id = p.student_id AND sp.parent_profile_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "lip_write" ON public.line_item_payments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.payments p
      WHERE p.id = line_item_payments.payment_id
      AND public.get_my_role() IN ('school_admin', 'super_admin')
      AND p.school_id = public.get_my_school_id()
    )
  );
```

- [ ] **Step 2: Apply the migration**

```bash
cd /path/to/erp && supabase db push
```

Expected: migration applies without error. Tables `fee_line_items`, `payments`, `line_item_payments` visible in Supabase dashboard.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20240001000026_payment_rework.sql
git commit -m "feat(db): add fee_line_items, payments, line_item_payments tables with RLS"
```

---

## Task 2: Push Fee to Class API Route

**Files:**
- Create: `apps/web/app/api/fees/push-to-class/route.ts`

This replaces inserting into `fee_structures`. Admin submits a fee → API fans out `fee_line_items` to every student in the specified class.

- [ ] **Step 1: Create the route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
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

  const body = await request.json() as {
    class_id: string;
    academic_year_id: string;
    fee_type: string;
    total_amount: number;
    due_date?: string;
  };

  if (!body.class_id || !body.fee_type || !body.total_amount) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch all students in this class
  const { data: students, error: studentsError } = await adminClient
    .from("student_profiles")
    .select("id")
    .eq("school_id", schoolId)
    .eq("class_id", body.class_id);

  if (studentsError) {
    return NextResponse.json({ error: studentsError.message }, { status: 500 });
  }

  if (!students || students.length === 0) {
    return NextResponse.json({ created: 0, message: "No students in this class." });
  }

  const lineItems = students.map((s) => ({
    school_id: schoolId,
    student_id: s.id,
    fee_type: body.fee_type,
    total_amount: body.total_amount,
    due_date: body.due_date ?? null,
    added_by: user.id,
    class_id: body.class_id,
    academic_year_id: body.academic_year_id ?? null,
    status: "pending",
  }));

  const { data: inserted, error: insertError } = await adminClient
    .from("fee_line_items")
    .insert(lineItems)
    .select("id");

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ created: inserted?.length ?? 0 });
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/api/fees/push-to-class/route.ts
git commit -m "feat(fees): add push-to-class API that fans out fee_line_items per student"
```

---

## Task 3: Record Offline Payment API Route

**Files:**
- Create: `apps/web/app/api/fees/record-offline-payment/route.ts`

Replaces the old `RecordPaymentForm` flow. Admin submits: student, selected line items with amounts, payment method, transaction ID. API writes one `payments` row + multiple `line_item_payments` rows, then recomputes `fee_line_items.status`.

- [ ] **Step 1: Create the route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";

interface LineItemAllocation {
  line_item_id: string;
  amount_applied: number;
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!roleRow || !["school_admin", "teacher"].includes(roleRow.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const schoolId = await getSchoolId();
  if (!schoolId) return NextResponse.json({ error: "No school context" }, { status: 400 });

  const body = await request.json() as {
    student_id: string;
    payment_method: string;
    transaction_id?: string;
    notes?: string;
    allocations: LineItemAllocation[];
  };

  if (!body.student_id || !body.allocations?.length) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const totalAmount = body.allocations.reduce((s, a) => s + a.amount_applied, 0);

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Insert payment record
  const { data: payment, error: paymentError } = await adminClient
    .from("payments")
    .insert({
      school_id: schoolId,
      student_id: body.student_id,
      paid_by_profile_id: user.id,
      total_amount: totalAmount,
      payment_method: body.payment_method,
      mode: "offline",
      transaction_id: body.transaction_id ?? null,
      notes: body.notes ?? null,
    })
    .select("id")
    .single();

  if (paymentError || !payment) {
    return NextResponse.json({ error: paymentError?.message ?? "Payment insert failed" }, { status: 500 });
  }

  // Insert line_item_payments
  const lipRows = body.allocations.map((a) => ({
    payment_id: payment.id,
    line_item_id: a.line_item_id,
    amount_applied: a.amount_applied,
  }));

  const { error: lipError } = await adminClient
    .from("line_item_payments")
    .insert(lipRows);

  if (lipError) {
    return NextResponse.json({ error: lipError.message }, { status: 500 });
  }

  // Recompute status for each affected line item
  for (const a of body.allocations) {
    const { data: li } = await adminClient
      .from("fee_line_items")
      .select("total_amount, id")
      .eq("id", a.line_item_id)
      .single();

    if (!li) continue;

    const { data: allLip } = await adminClient
      .from("line_item_payments")
      .select("amount_applied")
      .eq("line_item_id", a.line_item_id);

    const totalPaid = (allLip ?? []).reduce((s: number, r: any) => s + (r.amount_applied ?? 0), 0);
    const status = totalPaid >= li.total_amount ? "paid" : totalPaid > 0 ? "partial" : "pending";

    await adminClient
      .from("fee_line_items")
      .update({ status })
      .eq("id", a.line_item_id);
  }

  return NextResponse.json({ payment_id: payment.id });
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/api/fees/record-offline-payment/route.ts
git commit -m "feat(fees): add record-offline-payment API with line_item_payments and status recompute"
```

---

## Task 4: Razorpay Order Creation API Route

**Files:**
- Create: `apps/web/app/api/fees/create-razorpay-order/route.ts`

- [ ] **Step 1: Install Razorpay SDK**

```bash
cd apps/web && pnpm add razorpay
```

- [ ] **Step 2: Create the route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as {
    amount_paise: number; // total in paise (₹1 = 100 paise)
    student_id: string;
    line_item_ids: string[];
    receipt?: string;
  };

  if (!body.amount_paise || !body.student_id || !body.line_item_ids?.length) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });

  const order = await razorpay.orders.create({
    amount: body.amount_paise,
    currency: "INR",
    receipt: body.receipt ?? `rcpt_${Date.now()}`,
    notes: {
      student_id: body.student_id,
      line_item_ids: body.line_item_ids.join(","),
    },
  });

  return NextResponse.json({
    order_id: order.id,
    amount: order.amount,
    currency: order.currency,
  });
}
```

- [ ] **Step 3: Add environment variables**

Add to `apps/web/.env.local` (and in Vercel environment variables):

```
RAZORPAY_KEY_ID=rzp_live_xxxx
RAZORPAY_KEY_SECRET=xxxx
RAZORPAY_WEBHOOK_SECRET=xxxx
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxxx
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/fees/create-razorpay-order/route.ts
git commit -m "feat(fees): add Razorpay order creation API route"
```

---

## Task 5: Razorpay Webhook — Supabase Edge Function

**Files:**
- Create: `supabase/functions/razorpay-webhook/index.ts`

This function receives Razorpay's `payment.captured` event, verifies the HMAC signature, then writes a `payments` row + `line_item_payments` rows and updates `fee_line_items.status`.

- [ ] **Step 1: Create the edge function**

```typescript
// supabase/functions/razorpay-webhook/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hmac } from "https://deno.land/x/hmac@v2.0.1/mod.ts";

const RAZORPAY_WEBHOOK_SECRET = Deno.env.get("RAZORPAY_WEBHOOK_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const rawBody = await req.text();

  // Verify Razorpay webhook signature
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  const expectedSig = hmac("sha256", RAZORPAY_WEBHOOK_SECRET, rawBody, "utf8", "hex");

  if (signature !== expectedSig) {
    return new Response("Invalid signature", { status: 401 });
  }

  const event = JSON.parse(rawBody);

  // Only handle payment.captured
  if (event.event !== "payment.captured") {
    return new Response("Ignored", { status: 200 });
  }

  const payment = event.payload?.payment?.entity;
  if (!payment) return new Response("Bad payload", { status: 400 });

  const orderId: string = payment.order_id;
  const paymentId: string = payment.id;
  const amountPaise: number = payment.amount;
  const notes: Record<string, string> = payment.notes ?? {};

  const studentId: string = notes.student_id ?? "";
  const lineItemIds: string[] = (notes.line_item_ids ?? "").split(",").filter(Boolean);

  if (!studentId || lineItemIds.length === 0) {
    return new Response("Missing notes", { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Idempotency: skip if this razorpay_payment_id was already recorded
  const { data: existing } = await supabase
    .from("payments")
    .select("id")
    .eq("razorpay_payment_id", paymentId)
    .maybeSingle();

  if (existing) {
    return new Response("Already processed", { status: 200 });
  }

  // Get student's school_id
  const { data: sp } = await supabase
    .from("student_profiles")
    .select("school_id, parent_profile_id")
    .eq("id", studentId)
    .single();

  if (!sp) return new Response("Student not found", { status: 404 });

  const totalAmount = amountPaise / 100;

  // Insert payment
  const { data: paymentRow, error: payErr } = await supabase
    .from("payments")
    .insert({
      school_id: sp.school_id,
      student_id: studentId,
      paid_by_profile_id: sp.parent_profile_id,
      total_amount: totalAmount,
      payment_method: "online",
      mode: "online",
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      transaction_id: paymentId,
    })
    .select("id")
    .single();

  if (payErr || !paymentRow) {
    console.error("Payment insert error:", payErr);
    return new Response("Payment insert failed", { status: 500 });
  }

  // Distribute amount equally across selected line items
  // (Each line item pays its own outstanding balance)
  const { data: lineItems } = await supabase
    .from("fee_line_items")
    .select("id, total_amount")
    .in("id", lineItemIds);

  const amountPerItem: Record<string, number> = {};
  for (const li of lineItems ?? []) {
    // Get already paid for this line item
    const { data: existingLip } = await supabase
      .from("line_item_payments")
      .select("amount_applied")
      .eq("line_item_id", li.id);

    const alreadyPaid = (existingLip ?? []).reduce((s: number, r: any) => s + (r.amount_applied ?? 0), 0);
    amountPerItem[li.id] = Math.min(li.total_amount - alreadyPaid, li.total_amount);
  }

  const lipRows = lineItemIds
    .filter((id) => (amountPerItem[id] ?? 0) > 0)
    .map((id) => ({
      payment_id: paymentRow.id,
      line_item_id: id,
      amount_applied: amountPerItem[id],
    }));

  await supabase.from("line_item_payments").insert(lipRows);

  // Update status for each line item
  for (const id of lineItemIds) {
    const { data: li } = await supabase
      .from("fee_line_items")
      .select("total_amount")
      .eq("id", id)
      .single();

    if (!li) continue;

    const { data: allLip } = await supabase
      .from("line_item_payments")
      .select("amount_applied")
      .eq("line_item_id", id);

    const totalPaid = (allLip ?? []).reduce((s: number, r: any) => s + (r.amount_applied ?? 0), 0);
    const status = totalPaid >= li.total_amount ? "paid" : totalPaid > 0 ? "partial" : "pending";

    await supabase.from("fee_line_items").update({ status }).eq("id", id);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});
```

- [ ] **Step 2: Deploy the edge function**

```bash
supabase functions deploy razorpay-webhook --no-verify-jwt
```

Set the webhook secret:
```bash
supabase secrets set RAZORPAY_WEBHOOK_SECRET=xxxx
```

- [ ] **Step 3: Register webhook URL in Razorpay Dashboard**

URL format: `https://<project-ref>.supabase.co/functions/v1/razorpay-webhook`

In Razorpay Dashboard → Webhooks → Add new webhook:
- URL: the Edge Function URL above
- Events: `payment.captured`
- Secret: the same value as `RAZORPAY_WEBHOOK_SECRET`

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/razorpay-webhook/
git commit -m "feat(fees): add Razorpay webhook edge function with HMAC verification and idempotency"
```

---

## Task 6: Admin Fees Page — Push Fee to Class Form

**Files:**
- Modify: `apps/web/app/(school)/admin/fees/page.tsx`

Replace the `AddFeeStructureForm` + `RecordPaymentForm` UI with a "Push Fee to Class" form that calls the new API.

- [ ] **Step 1: Create push-fee-form.tsx**

Create `apps/web/app/(school)/admin/fees/push-fee-form.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

interface Props {
  classes: { id: string; name: string }[];
  academicYears: { id: string; name: string }[];
}

export function PushFeeForm({ classes, academicYears }: Props) {
  const router = useRouter();
  const [feeType, setFeeType] = useState("");
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
    if (!feeType.trim()) { setError("Fee type is required."); return; }
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
          fee_type: feeType.trim(),
          total_amount: amountNum,
          due_date: dueDate || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to push fees."); return; }
      setResult({ created: data.created });
      setFeeType(""); setAmount(""); setClassId(""); setAcademicYearId(""); setDueDate("");
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
        <div className="flex-1 min-w-36">
          <Label>Fee Type</Label>
          <Input value={feeType} onChange={(e) => setFeeType(e.target.value)} placeholder="e.g., Tuition Fee" required />
        </div>
        <div className="w-36">
          <Label>Amount (₹)</Label>
          <Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="5000" required />
        </div>
        <div className="w-40">
          <Label>Class</Label>
          <NativeSelect
            options={classes.map((c) => ({ value: c.id, label: c.name }))}
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            placeholder="Select class"
          />
        </div>
        <div className="w-44">
          <Label>Academic Year</Label>
          <NativeSelect
            options={academicYears.map((y) => ({ value: y.id, label: y.name }))}
            value={academicYearId}
            onChange={(e) => setAcademicYearId(e.target.value)}
            placeholder="Select year"
          />
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

- [ ] **Step 2: Update fees/page.tsx to use the new form**

In `apps/web/app/(school)/admin/fees/page.tsx`, replace:
- The import of `AddFeeStructureForm` with `PushFeeForm`
- The `RecordPaymentForm` section (remove it — recording payment is now done per-student on the student profile page)
- The fee structures DataTable with a line items DataTable that queries `fee_line_items`

Updated `fees/page.tsx`:

```typescript
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { PushFeeForm } from "./push-fee-form";

export default async function FeesPage() {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  const [classesRes, academicYearsRes, lineItemsRes] = await Promise.all([
    supabase.from("classes").select("id, name").eq("school_id", schoolId).order("order"),
    supabase.from("academic_years").select("id, name").eq("school_id", schoolId).order("start_date", { ascending: false }),
    supabase
      .from("fee_line_items")
      .select("id, fee_type, total_amount, due_date, status, student:student_profiles(full_name), class:classes(name), academic_year:academic_years(name)")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const lineItemRows = (lineItemsRes.data ?? []).map((li: any) => ({
    id: li.id,
    student: li.student?.full_name ?? "—",
    fee_type: li.fee_type,
    amount: `₹${Number(li.total_amount).toLocaleString("en-IN")}`,
    class_name: li.class?.name ?? "—",
    academic_year: li.academic_year?.name ?? "—",
    due_date: li.due_date ?? "—",
    status: li.status,
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
                {row.status}
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

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(school\)/admin/fees/
git commit -m "feat(fees): replace fee structures form with push-to-class; show line items table"
```

---

## Task 7: Admin Student Profile — New Fees Tab

**Files:**
- Modify: `apps/web/app/(school)/admin/students/[id]/student-fees-tab.tsx`
- Modify: `apps/web/app/(school)/admin/students/[id]/student-fees-client.tsx` (full rewrite)

- [ ] **Step 1: Rewrite student-fees-tab.tsx to query new tables**

```typescript
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { StudentFeesClient } from "./student-fees-client";

interface Props {
  studentId: string;
  studentName: string;
}

export async function StudentFeesTab({ studentId, studentName }: Props) {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  const [lineItemsRes, paymentsRes] = await Promise.all([
    supabase
      .from("fee_line_items")
      .select("id, fee_type, total_amount, due_date, status, created_at, added_by_profile:profiles!added_by(full_name)")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false }),
    supabase
      .from("payments")
      .select("id, payment_date, total_amount, payment_method, mode, transaction_id, razorpay_payment_id, notes, paid_by_profile:profiles!paid_by_profile_id(full_name), line_item_payments(line_item_id, amount_applied, fee_line_items!line_item_id(fee_type))")
      .eq("student_id", studentId)
      .order("payment_date", { ascending: false }),
  ]);

  // Compute amount paid per line item from line_item_payments
  const lipByLineItem: Record<string, number> = {};
  for (const p of paymentsRes.data ?? []) {
    for (const lip of (p as any).line_item_payments ?? []) {
      lipByLineItem[lip.line_item_id] = (lipByLineItem[lip.line_item_id] ?? 0) + lip.amount_applied;
    }
  }

  const lineItems = (lineItemsRes.data ?? []).map((li: any) => ({
    id: li.id,
    fee_type: li.fee_type,
    total_amount: Number(li.total_amount),
    amount_paid: lipByLineItem[li.id] ?? 0,
    due_date: li.due_date ?? null,
    status: li.status,
    created_at: li.created_at,
    added_by: li.added_by_profile?.full_name ?? "—",
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
    paid_by: p.paid_by_profile?.full_name ?? "—",
    line_items_covered: (p.line_item_payments ?? []).map((lip: any) => ({
      line_item_id: lip.line_item_id,
      fee_type: lip.fee_line_items?.fee_type ?? "—",
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
    />
  );
}
```

- [ ] **Step 2: Rewrite student-fees-client.tsx**

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FeesPieChart } from "./student-fees-pie-chart";

interface LineItem {
  id: string;
  fee_type: string;
  total_amount: number;
  amount_paid: number;
  due_date: string | null;
  status: string;
  created_at: string;
  added_by: string;
}

interface PaymentRecord {
  id: string;
  payment_date: string;
  total_amount: number;
  payment_method: string;
  mode: string;
  transaction_id: string | null;
  razorpay_payment_id: string | null;
  notes: string | null;
  paid_by: string;
  line_items_covered: { line_item_id: string; fee_type: string; amount_applied: number }[];
}

interface Props {
  lineItems: LineItem[];
  payments: PaymentRecord[];
  schoolId: string;
  studentId: string;
  studentName: string;
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "paid" ? "bg-emerald-100 text-emerald-800" :
    status === "partial" ? "bg-amber-100 text-amber-800" :
    "bg-rose-100 text-rose-800";
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${cls}`}>{status}</span>;
}

export function StudentFeesClient({ lineItems, payments, schoolId, studentId, studentName }: Props) {
  const router = useRouter();
  const [selectedLineItem, setSelectedLineItem] = useState<LineItem | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [recordingFor, setRecordingFor] = useState<LineItem | null>(null);
  const [offlineForm, setOfflineForm] = useState({
    amount: "",
    payment_method: "cash",
    transaction_id: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const totalDue = lineItems.reduce((s, li) => s + li.total_amount, 0);
  const totalPaid = lineItems.reduce((s, li) => s + li.amount_paid, 0);
  const outstanding = Math.max(0, totalDue - totalPaid);

  async function handleRecordOffline(lineItem: LineItem) {
    setSaveError("");
    const amountNum = parseFloat(offlineForm.amount);
    if (isNaN(amountNum) || amountNum <= 0) { setSaveError("Enter a valid amount."); return; }
    const pending = lineItem.total_amount - lineItem.amount_paid;
    if (amountNum > pending) { setSaveError(`Amount cannot exceed outstanding ₹${pending.toLocaleString("en-IN")}.`); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/fees/record-offline-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          payment_method: offlineForm.payment_method,
          transaction_id: offlineForm.transaction_id || undefined,
          notes: offlineForm.notes || undefined,
          allocations: [{ line_item_id: lineItem.id, amount_applied: amountNum }],
        }),
      });
      const data = await res.json();
      if (!res.ok) { setSaveError(data.error ?? "Failed to record payment."); return; }
      setRecordingFor(null);
      setOfflineForm({ amount: "", payment_method: "cash", transaction_id: "", notes: "" });
      router.refresh();
    } catch {
      setSaveError("Unexpected error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary + Pie */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Due", value: `₹${totalDue.toLocaleString("en-IN")}`, color: "text-foreground" },
          { label: "Paid", value: `₹${totalPaid.toLocaleString("en-IN")}`, color: "text-emerald-600" },
          { label: "Outstanding", value: `₹${outstanding.toLocaleString("en-IN")}`, color: outstanding > 0 ? "text-rose-600" : "text-emerald-600" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border bg-card p-4 text-center shadow-sm">
            <p className={`text-xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
        <FeesPieChart totalPaid={totalPaid} outstanding={outstanding} />
      </div>

      {/* Line Items Table */}
      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Fee Line Items</h3>
        <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["Fee Type", "Total (₹)", "Paid (₹)", "Due Date", "Status", "Added By", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lineItems.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No fee line items yet.</td></tr>
              ) : lineItems.map((li) => (
                <>
                  <tr key={li.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <button
                        className="font-medium text-indigo-600 hover:underline"
                        onClick={() => setSelectedLineItem(selectedLineItem?.id === li.id ? null : li)}
                      >
                        {li.fee_type}
                      </button>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{li.total_amount.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 tabular-nums text-emerald-700">{li.amount_paid.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3">{li.due_date ? new Date(li.due_date).toLocaleDateString("en-IN") : "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={li.status} /></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{li.added_by}</td>
                    <td className="px-4 py-3">
                      {li.status !== "paid" && (
                        <button
                          onClick={() => { setRecordingFor(recordingFor?.id === li.id ? null : li); setSaveError(""); }}
                          className="text-sm font-medium text-blue-600 hover:underline"
                        >
                          Record Payment
                        </button>
                      )}
                    </td>
                  </tr>

                  {/* Inline detail for selected line item */}
                  {selectedLineItem?.id === li.id && (
                    <tr key={`${li.id}-detail`}>
                      <td colSpan={7} className="bg-indigo-50 px-6 py-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-2">Line Item Details</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><span className="text-muted-foreground">Fee Type:</span> {li.fee_type}</div>
                          <div><span className="text-muted-foreground">Total Amount:</span> ₹{li.total_amount.toLocaleString("en-IN")}</div>
                          <div><span className="text-muted-foreground">Amount Paid:</span> ₹{li.amount_paid.toLocaleString("en-IN")}</div>
                          <div><span className="text-muted-foreground">Pending:</span> ₹{(li.total_amount - li.amount_paid).toLocaleString("en-IN")}</div>
                          <div><span className="text-muted-foreground">Due Date:</span> {li.due_date ?? "—"}</div>
                          <div><span className="text-muted-foreground">Status:</span> {li.status}</div>
                          <div><span className="text-muted-foreground">Added By:</span> {li.added_by}</div>
                          <div><span className="text-muted-foreground">Created:</span> {new Date(li.created_at).toLocaleDateString("en-IN")}</div>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Inline offline payment form */}
                  {recordingFor?.id === li.id && (
                    <tr key={`${li.id}-record`}>
                      <td colSpan={7} className="bg-blue-50 px-6 py-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 mb-3">Record Offline Payment</p>
                        <div className="flex flex-wrap items-end gap-3">
                          <div>
                            <label className="text-xs text-muted-foreground">Amount (₹)</label>
                            <input
                              type="number" min={1} max={li.total_amount - li.amount_paid}
                              value={offlineForm.amount}
                              onChange={(e) => setOfflineForm((f) => ({ ...f, amount: e.target.value }))}
                              className="mt-0.5 block w-28 rounded-md border border-input bg-white px-3 py-1.5 text-sm"
                              placeholder={String(li.total_amount - li.amount_paid)}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Method</label>
                            <select
                              value={offlineForm.payment_method}
                              onChange={(e) => setOfflineForm((f) => ({ ...f, payment_method: e.target.value }))}
                              className="mt-0.5 block rounded-md border border-input bg-white px-3 py-1.5 text-sm"
                            >
                              {["cash", "upi", "bank_transfer", "cheque"].map((m) => (
                                <option key={m} value={m}>{m.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Transaction / Receipt ID</label>
                            <input
                              type="text"
                              value={offlineForm.transaction_id}
                              onChange={(e) => setOfflineForm((f) => ({ ...f, transaction_id: e.target.value }))}
                              className="mt-0.5 block w-36 rounded-md border border-input bg-white px-3 py-1.5 text-sm"
                              placeholder="Optional"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Notes</label>
                            <input
                              type="text"
                              value={offlineForm.notes}
                              onChange={(e) => setOfflineForm((f) => ({ ...f, notes: e.target.value }))}
                              className="mt-0.5 block w-36 rounded-md border border-input bg-white px-3 py-1.5 text-sm"
                              placeholder="Optional"
                            />
                          </div>
                          <button
                            onClick={() => handleRecordOffline(li)}
                            disabled={saving}
                            className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            {saving ? "Saving…" : "Save"}
                          </button>
                          <button
                            onClick={() => setRecordingFor(null)}
                            className="text-sm text-muted-foreground hover:text-foreground"
                          >
                            Cancel
                          </button>
                        </div>
                        {saveError && <p className="mt-2 text-xs text-red-600">{saveError}</p>}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Transactions Table */}
      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Payment Transactions</h3>
        <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["Date", "Amount (₹)", "Method", "Mode", "Paid By", "Transaction ID", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payments.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No payment transactions yet.</td></tr>
              ) : payments.map((p) => (
                <>
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">{new Date(p.payment_date).toLocaleDateString("en-IN")}</td>
                    <td className="px-4 py-3 tabular-nums font-medium text-emerald-700">₹{p.total_amount.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 capitalize">{p.payment_method.replace("_", " ")}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.mode === "online" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-700"}`}>
                        {p.mode}
                      </span>
                    </td>
                    <td className="px-4 py-3">{p.paid_by}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.transaction_id ?? p.razorpay_payment_id ?? "—"}</td>
                    <td className="px-4 py-3">
                      <button
                        className="text-sm font-medium text-indigo-600 hover:underline"
                        onClick={() => setSelectedPayment(selectedPayment?.id === p.id ? null : p)}
                      >
                        Details
                      </button>
                    </td>
                  </tr>

                  {/* Inline payment detail */}
                  {selectedPayment?.id === p.id && (
                    <tr key={`${p.id}-detail`}>
                      <td colSpan={7} className="bg-indigo-50 px-6 py-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-2">Payment Details</p>
                        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                          <div><span className="text-muted-foreground">Date:</span> {new Date(p.payment_date).toLocaleString("en-IN")}</div>
                          <div><span className="text-muted-foreground">Total Amount:</span> ₹{p.total_amount.toLocaleString("en-IN")}</div>
                          <div><span className="text-muted-foreground">Method:</span> {p.payment_method.replace("_", " ")}</div>
                          <div><span className="text-muted-foreground">Mode:</span> {p.mode}</div>
                          <div><span className="text-muted-foreground">Paid By:</span> {p.paid_by}</div>
                          <div><span className="text-muted-foreground">Transaction ID:</span> {p.transaction_id ?? "—"}</div>
                          {p.razorpay_payment_id && (
                            <div><span className="text-muted-foreground">Razorpay ID:</span> {p.razorpay_payment_id}</div>
                          )}
                          {p.notes && <div className="col-span-2"><span className="text-muted-foreground">Notes:</span> {p.notes}</div>}
                        </div>
                        {p.line_items_covered.length > 0 && (
                          <>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Applied to:</p>
                            <ul className="space-y-0.5">
                              {p.line_items_covered.map((lic, i) => (
                                <li key={i} className="text-sm flex justify-between max-w-xs">
                                  <span>{lic.fee_type}</span>
                                  <span className="font-medium text-emerald-700">₹{lic.amount_applied.toLocaleString("en-IN")}</span>
                                </li>
                              ))}
                            </ul>
                          </>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(school\)/admin/students/\[id\]/student-fees-tab.tsx \
        apps/web/app/\(school\)/admin/students/\[id\]/student-fees-client.tsx
git commit -m "feat(fees): rewrite student fees tab with line items, payment history, and detail modals"
```

---

## Task 8: Mobile Parent Fees Screen — Selectable Line Items + Razorpay

**Files:**
- Modify: `apps/mobile/app/(parent)/fees.tsx` (full rewrite of data model, keep UI style)

- [ ] **Step 1: Replace data loading to query fee_line_items**

Replace the `loadFees` function with one that queries the new tables:

```typescript
async function loadFees() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { setLoading(false); return; }

  const { data: sp } = await supabase
    .from("student_profiles")
    .select("id, school_id")
    .eq("parent_profile_id", user.id)
    .single();

  if (!sp) { setLoading(false); return; }

  const [{ data: lineItemsData }, { data: paymentsData }] = await Promise.all([
    supabase
      .from("fee_line_items")
      .select("id, fee_type, total_amount, due_date, status")
      .eq("student_id", sp.id)
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("payments")
      .select("id, payment_date, total_amount, payment_method, mode, transaction_id, razorpay_payment_id, line_item_payments(amount_applied, fee_line_items!line_item_id(fee_type))")
      .eq("student_id", sp.id)
      .order("payment_date", { ascending: false }),
  ]);

  // Compute per-line-item paid amounts from line_item_payments
  const paidMap: Record<string, number> = {};
  for (const p of paymentsData ?? []) {
    for (const lip of (p as any).line_item_payments ?? []) {
      const liId: string = lip.line_item_id ?? "";
      paidMap[liId] = (paidMap[liId] ?? 0) + (lip.amount_applied ?? 0);
    }
  }

  const items: FeeLineItem[] = (lineItemsData ?? []).map((li: any) => {
    const paid = paidMap[li.id] ?? 0;
    const outstanding = Math.max(0, li.total_amount - paid);
    return {
      id: li.id,
      fee_type: li.fee_type ?? "",
      total_amount: li.total_amount ?? 0,
      amount_paid: paid,
      outstanding,
      due_date: li.due_date ?? "",
      status: li.status ?? "pending",
    };
  });

  setLineItems(items);
  setHistory(
    (paymentsData ?? []).map((p: any) => ({
      id: p.id,
      total_amount: p.total_amount ?? 0,
      paid_at: p.payment_date ?? null,
      payment_method: p.payment_method ?? "",
      mode: p.mode ?? "",
      transaction_id: p.transaction_id ?? p.razorpay_payment_id ?? null,
      line_items_covered: (p.line_item_payments ?? []).map((lip: any) => ({
        fee_type: lip.fee_line_items?.fee_type ?? "—",
        amount_applied: lip.amount_applied ?? 0,
      })),
    }))
  );
  setLoading(false);
}
```

- [ ] **Step 2: Update state types in fees.tsx**

Replace the old interfaces with:

```typescript
interface FeeLineItem {
  id: string;
  fee_type: string;
  total_amount: number;
  amount_paid: number;
  outstanding: number;
  due_date: string;
  status: "paid" | "pending" | "partial";
}

interface PaymentHistoryRow {
  id: string;
  total_amount: number;
  paid_at: string | null;
  payment_method: string;
  mode: string;
  transaction_id: string | null;
  line_items_covered: { fee_type: string; amount_applied: number }[];
}
```

Update state declarations:
```typescript
const [lineItems, setLineItems] = useState<FeeLineItem[]>([]);
const [history, setHistory] = useState<PaymentHistoryRow[]>([]);
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
```

- [ ] **Step 3: Replace Pay Now logic with multi-select + Razorpay order**

Replace the `handlePayNow` function:

```typescript
function toggleSelect(id: string) {
  setSelectedIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
}

async function handlePaySelected() {
  const selected = lineItems.filter((li) => selectedIds.has(li.id) && li.status !== "paid");
  if (selected.length === 0) return;

  const totalOutstanding = selected.reduce((s, li) => s + li.outstanding, 0);
  const amountPaise = Math.round(totalOutstanding * 100);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: sp } = await supabase
    .from("student_profiles")
    .select("id")
    .eq("parent_profile_id", user.id)
    .single();
  if (!sp) return;

  setPayingId("selected");
  try {
    // Get API base URL from env
    const apiBase = process.env.EXPO_PUBLIC_WEB_API_URL ?? "";

    const orderRes = await fetch(`${apiBase}/api/fees/create-razorpay-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount_paise: amountPaise,
        student_id: sp.id,
        line_item_ids: selected.map((li) => li.id),
      }),
    });
    const orderData = await orderRes.json();
    if (!orderRes.ok) throw new Error(orderData.error ?? "Order creation failed");

    const options = {
      description: selected.map((li) => li.fee_type).join(", "),
      currency: "INR",
      key: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ?? "",
      amount: amountPaise,
      name: "School Fees",
      order_id: orderData.order_id,
      prefill: { email: user.email ?? "", contact: "", name: "" },
      theme: { color: theme.primary },
    };

    await RazorpayCheckout.open(options as any);
    // Webhook will handle the DB write; just refresh after a short delay
    await new Promise((r) => setTimeout(r, 2000));
    setSelectedIds(new Set());
    await loadFees();
  } catch (e: any) {
    if (e?.code !== "PAYMENT_CANCELLED") Alert.alert("Payment failed", e?.description ?? "Try again");
  } finally {
    setPayingId(null);
  }
}
```

- [ ] **Step 4: Update the fee breakdown UI to show checkboxes**

Replace the fee breakdown section with a selectable list:

```tsx
{/* Fee breakdown */}
<View>
  <SectionHeader title="Fee Breakdown" />
  {loading ? (
    <View style={{ gap: 8 }}><SkeletonCard /><SkeletonCard /></View>
  ) : lineItems.filter((li) => li.status !== "paid").length === 0 ? (
    <Text style={{ textAlign: "center", color: theme.textMuted, fontFamily: "Inter_400Regular", paddingVertical: 20 }}>All fees paid!</Text>
  ) : lineItems.filter((li) => li.status !== "paid").map((li) => (
    <TouchableOpacity
      key={li.id}
      onPress={() => toggleSelect(li.id)}
      activeOpacity={0.7}
      style={{ backgroundColor: selectedIds.has(li.id) ? `${theme.primary}18` : theme.surface, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8, borderWidth: 1.5, borderColor: selectedIds.has(li.id) ? theme.primary : "transparent" }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: selectedIds.has(li.id) ? theme.primary : theme.border, backgroundColor: selectedIds.has(li.id) ? theme.primary : "transparent", alignItems: "center", justifyContent: "center" }}>
          {selectedIds.has(li.id) && <Ionicons name="checkmark" size={13} color="#fff" />}
        </View>
        <View>
          <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: theme.textPrimary }}>{li.fee_type}</Text>
          <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: theme.textSecondary, marginTop: 2 }}>
            Due {li.due_date ? new Date(li.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}
          </Text>
        </View>
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: theme.textPrimary }}>₹{li.outstanding.toLocaleString("en-IN")}</Text>
        <StatusBadge variant={li.status} />
      </View>
    </TouchableOpacity>
  ))}

  {selectedIds.size > 0 && (
    <TouchableOpacity
      onPress={handlePaySelected}
      disabled={payingId === "selected"}
      style={{ backgroundColor: theme.primary, borderRadius: 16, paddingVertical: 16, alignItems: "center", marginTop: 8 }}
      activeOpacity={0.8}
    >
      <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" }}>
        {payingId === "selected" ? "Processing…" : `Pay ₹${lineItems.filter((li) => selectedIds.has(li.id)).reduce((s, li) => s + li.outstanding, 0).toLocaleString("en-IN")}`}
      </Text>
    </TouchableOpacity>
  )}
</View>
```

- [ ] **Step 5: Update payment history to show detail on tap**

Update the receipt modal to show `line_items_covered`:

In the existing receipt modal, add after the Status row:

```tsx
{receipt.line_items_covered?.length > 0 && (
  <>
    <View style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border }}>
      <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: theme.textSecondary, marginBottom: 4 }}>Applied to</Text>
      {receipt.line_items_covered.map((lic: any, i: number) => (
        <View key={i} style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: theme.textSecondary }}>{lic.fee_type}</Text>
          <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: theme.textPrimary }}>₹{lic.amount_applied.toLocaleString("en-IN")}</Text>
        </View>
      ))}
    </View>
  </>
)}
```

Also add `EXPO_PUBLIC_WEB_API_URL` to `apps/mobile/.env`:
```
EXPO_PUBLIC_WEB_API_URL=https://your-web-app.vercel.app
```

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/app/\(parent\)/fees.tsx
git commit -m "feat(mobile/fees): rewrite with fee_line_items, selectable multi-pay, Razorpay order flow"
```

---

## Self-Review

**Spec coverage:**
- [x] New schema: `fee_line_items` + `payments` + `line_item_payments` — Task 1
- [x] Admin pushes fees at class level → auto-creates per-student line items — Task 2
- [x] Admin records offline payment from student profile — Task 7
- [x] Parent selects line items, pays via Razorpay — Task 8
- [x] Razorpay webhook via Supabase Edge Function with HMAC verification + idempotency — Task 5
- [x] Admin student profile: line item detail + payment transaction detail (clickable inline) — Task 7
- [x] Line item detail: who added, when, total, paid, pending — student-fees-client.tsx
- [x] Payment detail: date, paid by, method, mode, transaction ID, Razorpay ID, which line items covered — student-fees-client.tsx
- [x] Mobile payment history row clickable for receipt/detail — Task 8 step 5
- [x] Pie chart already handled in Plan A Task 5 using `totalPaid` / `outstanding` computed from new model

**Notes for implementer:**
- The old `fee_structures` and `fee_payments` tables are NOT dropped. They remain in place for historical data. The admin fees page simply stops using them for new entries.
- `EXPO_PUBLIC_WEB_API_URL` must be set in mobile `.env` so the Razorpay order creation call reaches the Next.js API route.
- Razorpay webhook secret must be set in both Vercel env vars and Supabase secrets.
- The 2-second delay after Razorpay success is intentional: it allows the webhook to fire before the mobile app refreshes fee data.
