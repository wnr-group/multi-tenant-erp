# Design: Fee Payments, Razorpay Integration & Testing Checklist

**Date:** 2026-04-19
**Status:** Approved
**Scope:** Fills gaps between completed Plans 1-4 and upcoming Plan 5. Executed as "Plan 3.5".

---

## Problem

The MSA (Section 3.2) requires a Fee Management System, and Section 8 lists Razorpay credentials as a client responsibility — implying online payment is expected. Currently:

1. **Admin can create fee structures** but has no way to **record a payment** for a student.
2. **No online payment flow** exists — parents cannot pay fees through the app.
3. **No testing strategy** — MSA Phase 4 lists "Testing" as a deliverable.

## Decisions

| Question | Decision |
|----------|----------|
| Online payment scope | Razorpay on mobile app only (v1). Web payment links are post-launch. |
| Manual fee recording | Per-student recording by admin. No bulk recording for v1. |
| Testing approach | Manual testing checklist. No automated tests for this timeline. |
| Report card templates | No admin UI. Ship default template, swap via DB if needed. |

---

## Task 1: Admin Fee Payment Recording (Web)

**Location:** Enhance existing `/admin/fees` page.

**UI Changes:**
- Add two tabs to the fees page: "Fee Structures" (existing content) and "Record Payment" (new).
- "Record Payment" tab contains a form:
  - **Student** — searchable dropdown of all students in this school (from `student_profiles` joined with `profiles`)
  - **Fee Structure** — dropdown filtered by the selected student's `class_id`
  - **Amount Paid** — numeric input, supports partial payments
  - **Payment Method** — select: Cash / UPI / Bank Transfer / Cheque
  - **Receipt Number** — optional text field
  - Submit button

**Status auto-calculation on submit:**
- `amount_paid >= fee_structure.amount` → status = `paid`
- `0 < amount_paid < fee_structure.amount` → status = `partial`
- `amount_paid == 0` → status = `overdue`

**Data:** Creates a record in `fee_payments` table. No schema changes needed for this task.

**Files:**
- Create: `apps/web/app/(school)/admin/fees/record-payment-form.tsx`
- Modify: `apps/web/app/(school)/admin/fees/page.tsx` — add tab layout, integrate new form

---

## Task 2: Razorpay Order Creation Edge Function

**Function:** `create-razorpay-order`

**Flow:**
1. Mobile app calls this function with `{ feeStructureId, studentId }`
2. Function fetches the fee structure to get the amount
3. Function checks for existing partial payments to calculate remaining amount
4. Function calls Razorpay Orders API (`POST https://api.razorpay.com/v1/orders`) with:
   - `amount` (in paise — INR * 100)
   - `currency: "INR"`
   - `receipt: fee_structure_id`
5. Function creates a `fee_payments` record with status `overdue` and `razorpay_order_id` set
6. Returns `{ orderId, amount, currency, feePaymentId }` to the client

**Secrets (stored as Supabase Edge Function secrets):**
- `RAZORPAY_KEY_ID` — provided by client (Balaji)
- `RAZORPAY_KEY_SECRET` — provided by client (Balaji)

**File:** `packages/supabase/functions/create-razorpay-order/index.ts`

---

## Task 3: Razorpay Webhook Edge Function + Schema Migration

### Schema Migration

Add column to `fee_payments`:
```sql
ALTER TABLE public.fee_payments ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT;
```

### Webhook Function: `razorpay-webhook`

**Flow:**
1. Razorpay sends POST to this function on payment completion
2. Function reads `X-Razorpay-Signature` header
3. Verifies signature using HMAC SHA256 with `RAZORPAY_WEBHOOK_SECRET`
4. On `payment.captured` event:
   - Extract `order_id` and `amount` from payload
   - Find `fee_payments` record by `razorpay_order_id = order_id`
   - Update: `amount_paid`, `payment_date = today`, `payment_method = "razorpay"`, `status = paid/partial`
   - `receipt_number = razorpay_payment_id`
5. Returns 200 OK

**Secrets:**
- `RAZORPAY_WEBHOOK_SECRET` — configured in Razorpay Dashboard → Webhooks

**Files:**
- Create: `packages/supabase/migrations/20240001000011_razorpay.sql`
- Create: `packages/supabase/functions/razorpay-webhook/index.ts`

---

## Task 4: Parent Mobile Fees — Razorpay Checkout

**Location:** Enhance `apps/mobile/app/(parent)/fees.tsx` (currently planned in Plan 5 Task 2, but the Razorpay-specific parts are designed here).

**Dependencies:** `react-native-razorpay` npm package.

**UI Flow:**
1. Parent sees list of fees with status badges (paid/partial/overdue)
2. Unpaid/partial fees show a **"Pay Now"** button with remaining amount
3. On tap:
   - Call `create-razorpay-order` edge function → get `orderId` + `amount`
   - Open Razorpay checkout with:
     - `key: EXPO_PUBLIC_RAZORPAY_KEY_ID` (public key, safe for client)
     - `order_id: orderId`
     - `amount` (in paise)
     - `name: school name`
     - `prefill: { email, contact }` from student profile
   - On success callback: show success screen, refresh fee list
   - On failure: show error, allow retry
4. Webhook handles the actual `fee_payments` update server-side (Task 3)

**Env var:** `EXPO_PUBLIC_RAZORPAY_KEY_ID` — the Razorpay public key (safe for client-side, NOT the secret). This is a single key shared across all schools (Balaji's Razorpay account), so it goes in the mobile app's env config, not per-school configs.

**Files:**
- Modify: `apps/mobile/app/(parent)/fees.tsx` (Plan 5 Task 2 creates this file; this task adds Razorpay to it)
- Add `react-native-razorpay` to `apps/mobile/package.json`

**Note:** This task modifies the same file as Plan 5 Task 2. During implementation, either:
- Execute Plan 3.5 Task 4 after Plan 5 Task 2 (preferred — build the basic screen first, then add Razorpay), or
- Merge both into a single implementation step

---

## Task 5: Manual Testing Checklist

**Location:** `docs/testing-checklist.md`

**Structure — test by role:**

### Platform Admin (Super Admin)
- [ ] Login on admin domain → lands on dashboard with correct stats
- [ ] Create school with domain + primary color → school appears in list
- [ ] Invite school admin → verify invite email sent
- [ ] Toggle school active → verify badge changes
- [ ] Toggle school inactive → verify school domain returns 404
- [ ] Context switch into school as School Admin → banner appears
- [ ] Context switch into school as Principal → banner appears
- [ ] Context switch into school as Teacher → banner appears
- [ ] Exit context switch → returns to platform admin dashboard
- [ ] Audit log records context switch entries

### School Admin
- [ ] Login on school domain → branded login page (school name + primary color)
- [ ] Dashboard shows teacher + student counts
- [ ] Add class → appears in class list
- [ ] Add section to class → appears in class detail
- [ ] Add subject to class → appears in subject list
- [ ] Create timetable slot → appears in timetable
- [ ] Create academic year → appears in academics page
- [ ] Create exam → appears in academics page
- [ ] Create fee structure → appears in fee structures list
- [ ] Record manual fee payment → record appears with correct status (paid/partial)
- [ ] Invite teacher → invite email sent, teacher appears after accepting
- [ ] Add student → student appears in student list
- [ ] Upload syllabus PDF → file accessible via download link
- [ ] Post announcement → appears in announcements list
- [ ] Update school settings (name, email) → changes persist

### Principal
- [ ] Dashboard shows today's attendance stats (present/absent/total)
- [ ] Discipline page lists all school discipline records
- [ ] Reports page lists all exams
- [ ] Post announcement → appears in list
- [ ] Context switch to Teacher view → teacher sidebar appears

### Teacher (Web)
- [ ] Dashboard shows today's timetable (or "no classes" if none)
- [ ] Attendance: select section + date → see student list
- [ ] Attendance: mark statuses + save → records persist
- [ ] Attendance: re-open same date → previous marks pre-filled (upsert works)
- [ ] Homework: create with class/section/subject/due date → appears in list
- [ ] Results: select exam → see students → enter marks → save
- [ ] Results: re-open same exam → previous marks pre-filled
- [ ] Discipline: record incident with student/category/severity → appears in list
- [ ] Feedback: see parent feedback → respond → status changes to "responded"

### Teacher (Mobile)
- [ ] Dashboard shows today's timetable
- [ ] Attendance: select section → mark students → save → success alert
- [ ] Homework: list shows assigned homework
- [ ] Results: list shows exams
- [ ] Discipline: list shows recorded incidents
- [ ] Profile: shows name/email, sign out works

### Parent/Student (Mobile)
- [ ] Dashboard shows attendance %, pending fees count
- [ ] Attendance: see date-wise history with status colors
- [ ] Results: see exam results (marks/max per subject)
- [ ] Fees: see fee list with paid/partial/overdue badges
- [ ] Fees: tap "Pay Now" → Razorpay checkout opens → complete payment → status updates
- [ ] Homework: see homework for their section
- [ ] Announcements: see school announcements, new ones appear in real-time
- [ ] Feedback: submit feedback → success alert
- [ ] Discipline: see discipline records (if any)
- [ ] Profile: shows name/email, sign out works

### Cross-Cutting
- [ ] RLS isolation: login as School A user → cannot query School B data
- [ ] Push notification: app registers token → test notification received on device
- [ ] Report card PDF: edge function returns correct HTML with student data
- [ ] Invite flow: new user receives email → clicks link → sets password → can login
- [ ] Auth: unauthenticated user redirected to /login on all protected routes
- [ ] Context switch: all actions logged under real user identity in audit_log

---

## Execution Order

```
Plan 3.5 Task 1 (admin fee recording)
    ↓
Plan 3.5 Tasks 2+3 (Razorpay edge functions + migration — parallel)
    ↓
Plan 5 Task 1 (teacher mobile screens)
Plan 5 Task 2 (parent mobile screens — includes basic fees tab)
    ↓
Plan 3.5 Task 4 (add Razorpay checkout to parent fees tab)
    ↓
Plan 5 Tasks 3-6 (push, PDF, deploy, APK)
    ↓
Plan 3.5 Task 5 (run testing checklist)
```

Task 1 can start immediately (web, no dependencies).
Tasks 2+3 can start in parallel after Task 1 (or alongside it).
Task 4 depends on Plan 5 Task 2 (the parent fees screen must exist first).
Task 5 is done last, after everything is built.

---

## Out of Scope (v1)

- Web-based payment page for parents (mobile only for v1)
- Bulk fee recording by admin
- Report card template admin UI (swap via DB)
- Automated tests (manual checklist only)
- Online payment receipts / PDF invoices
- Fee reminders / overdue notifications (can be a post-launch CR)
