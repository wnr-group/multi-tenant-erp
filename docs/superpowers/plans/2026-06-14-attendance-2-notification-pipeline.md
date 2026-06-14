# Attendance Rework — Plan 2: Notification Pipeline

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first push-notification delivery path in the product: a Supabase Edge Function that a teacher's app calls with a single `attendance_records` ID to notify the absent student's parent (Expo push + in-app `notifications` row), plus the mobile client helper that calls it.

**Architecture:** A Deno edge function under `supabase/functions/send-attendance-notification/`. It verifies the caller's JWT, re-validates (fail-closed) that the caller is the class teacher for the row's section in the active academic year, confirms the row is `absent`, resolves the parent via `student_profiles.parent_profile_id`, sends an Expo push if a token exists, always inserts an in-app notification, and stamps `notified_at`. The mobile client calls it via `supabase.functions.invoke`.

**Tech Stack:** Supabase Edge Functions (Deno), `@supabase/supabase-js` service-role client inside the function, Expo Push API (`https://exp.host/--/api/v2/push/send`), React Native client.

**Spec:** `docs/superpowers/specs/2026-06-14-attendance-rework-design.md` §2.

**Depends on:** Plan 1 (needs `notified_at`, `get_active_academic_year()`).

---

## Context for the implementer

- **No edge function exists in this repo yet.** `supabase/functions/` may not exist — create it. Local serving: `supabase functions serve send-attendance-notification --no-verify-jwt=false`. The CLI is v2.90.
- Local function URL: `http://127.0.0.1:54321/functions/v1/send-attendance-notification`. From the Android emulator the host is reachable at `http://10.0.2.2:54321` (the mobile `.env` already uses `EXPO_PUBLIC_SUPABASE_URL=http://10.0.2.2:54321`). `supabase.functions.invoke` derives the function URL from the client's base URL automatically — no separate env var needed.
- **Parent resolution path:** `attendance_records.student_id` stores a `student_profiles.id` (despite the FK naming). So: `attendance_records` → `student_profiles WHERE id = attendance.student_id` → `parent_profile_id` → `profiles` row (has `full_name`, `push_token`). If `parent_profile_id` is NULL the function rejects with `no_parent_linked`.
- **Teacher authorization:** `section_assignments` has `(section_id, academic_year_id, class_teacher_id, school_id)`, unique on `(section_id, academic_year_id)`. The caller is authorized if a row exists with `section_id = attendance.section_id`, `class_teacher_id = caller`, `academic_year_id = get_active_academic_year(attendance.school_id)`.
- **Expo token format:** `ExponentPushToken[...]` stored in `profiles.push_token`. Send code does not exist yet — this plan creates it.
- Env available to edge functions by default: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` (injected by the CLI/runtime).
- There is no automated test framework. Verify edge functions by `curl` against the local server with a real JWT, and by `psql` probes confirming `notified_at` and the `notifications` row.

---

## File Structure

- Create: `supabase/functions/send-attendance-notification/index.ts` — the function.
- Create: `supabase/functions/send-attendance-notification/deno.json` — Deno config / import map (if the repo convention needs it; otherwise inline imports).
- Modify: `apps/mobile/lib/notifications.ts` — add `sendAbsenceNotification(recordId)` client helper.

---

## Task 1: Edge function skeleton + JWT auth

**Files:**
- Create: `supabase/functions/send-attendance-notification/index.ts`

- [ ] **Step 1: Create the function with JWT verification and input parsing**

```ts
import { createClient } from "jsr:@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

type SendResult = "sent" | "recorded_no_app" | "error";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace("Bearer ", "").trim();
  if (!jwt) return json({ error: "unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Identify the caller from their JWT (anon client + the user's token).
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: userData, error: userErr } = await authClient.auth.getUser();
  if (userErr || !userData.user) return json({ error: "unauthorized" }, 401);
  const callerId = userData.user.id;

  let body: { recordId?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const recordId = body.recordId;
  if (!recordId) return json({ error: "missing_record_id" }, 400);

  // Service-role client for trusted reads/writes.
  const admin = createClient(supabaseUrl, serviceKey);

  return await handle(admin, callerId, recordId);
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Filled in by later tasks.
async function handle(
  admin: ReturnType<typeof createClient>,
  callerId: string,
  recordId: string,
): Promise<Response> {
  return json({ result: "error", reason: "not_implemented" as const }, 501);
}
```

- [ ] **Step 2: Serve locally and confirm auth gating**

Run (in one terminal): `supabase functions serve send-attendance-notification`
Then (another terminal):
```bash
curl -s -X POST "http://127.0.0.1:54321/functions/v1/send-attendance-notification" \
  -H "Content-Type: application/json" -d '{"recordId":"x"}'
```
Expected: `{"error":"unauthorized"}` with HTTP 401 (no Authorization header).

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/send-attendance-notification/index.ts
git commit -m "feat(edge): scaffold send-attendance-notification with JWT auth"
```

---

## Task 2: Load + authorize the attendance row (fail-closed)

**Files:**
- Modify: `supabase/functions/send-attendance-notification/index.ts`

- [ ] **Step 1: Implement `handle` up to authorization**

Replace the placeholder `handle` with:

```ts
async function handle(
  admin: ReturnType<typeof createClient>,
  callerId: string,
  recordId: string,
): Promise<Response> {
  // 1. Load the attendance row.
  const { data: rec, error: recErr } = await admin
    .from("attendance_records")
    .select("id, school_id, student_id, section_id, date, status, session")
    .eq("id", recordId)
    .maybeSingle();
  if (recErr) return json({ result: "error", reason: "load_failed" }, 500);
  if (!rec) return json({ result: "error", reason: "not_found" }, 404);

  // 2. Only absences are notifiable.
  if (rec.status !== "absent") {
    return json({ result: "error", reason: "not_absent" }, 422);
  }

  // 3. Re-validate the caller is the class teacher for this section/year.
  const { data: yearId } = await admin.rpc("get_active_academic_year", {
    p_school_id: rec.school_id,
  });
  const { data: assignment } = await admin
    .from("section_assignments")
    .select("id")
    .eq("section_id", rec.section_id)
    .eq("class_teacher_id", callerId)
    .eq("academic_year_id", yearId)
    .maybeSingle();
  if (!assignment) {
    return json({ result: "error", reason: "not_authorized" }, 403);
  }

  return await deliver(admin, rec);
}

// Filled in by Task 3.
async function deliver(
  admin: ReturnType<typeof createClient>,
  rec: {
    id: string; school_id: string; student_id: string;
    date: string; status: string; session: string;
  },
): Promise<Response> {
  return json({ result: "error", reason: "not_implemented" }, 501);
}
```

- [ ] **Step 2: Test authorization rejection with a real teacher JWT**

Get a teacher JWT by logging in via the local Supabase auth (or reuse a token from the mobile app's session). Then call with a `recordId` that belongs to a section the teacher does NOT teach:
```bash
curl -s -X POST "http://127.0.0.1:54321/functions/v1/send-attendance-notification" \
  -H "Authorization: Bearer <TEACHER_JWT>" -H "Content-Type: application/json" \
  -d '{"recordId":"<OTHER_SECTION_ABSENT_RECORD_ID>"}'
```
Expected: `{"result":"error","reason":"not_authorized"}` HTTP 403.

To find a usable record id: `psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "SELECT id, section_id, status FROM attendance_records WHERE status='absent' LIMIT 5;"` (mark one absent first if none exist).

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/send-attendance-notification/index.ts
git commit -m "feat(edge): load + fail-closed authorize attendance row"
```

---

## Task 3: Resolve parent, send push, record in-app, stamp notified_at

**Files:**
- Modify: `supabase/functions/send-attendance-notification/index.ts`

- [ ] **Step 1: Implement `deliver`**

Replace the `deliver` placeholder with:

```ts
async function deliver(
  admin: ReturnType<typeof createClient>,
  rec: {
    id: string; school_id: string; student_id: string;
    date: string; status: string; session: string;
  },
): Promise<Response> {
  // Resolve student + parent. attendance.student_id holds a student_profiles.id.
  const { data: sp } = await admin
    .from("student_profiles")
    .select("full_name, parent_profile_id")
    .eq("id", rec.student_id)
    .maybeSingle();
  if (!sp || !sp.parent_profile_id) {
    return json({ result: "error", reason: "no_parent_linked" }, 422);
  }

  const { data: parent } = await admin
    .from("profiles")
    .select("id, push_token")
    .eq("id", sp.parent_profile_id)
    .maybeSingle();
  if (!parent) {
    return json({ result: "error", reason: "no_parent_linked" }, 422);
  }

  const { data: school } = await admin
    .from("schools")
    .select("name")
    .eq("id", rec.school_id)
    .maybeSingle();
  const schoolName = school?.name ?? "School";

  const sessionLabel =
    rec.session === "FN" ? "forenoon" :
    rec.session === "AN" ? "afternoon" : "full day";
  const dateLabel = new Date(rec.date + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric", month: "short",
  });
  const title = schoolName;
  const messageBody =
    `${sp.full_name} was marked absent for the ${sessionLabel} session on ${dateLabel}.`;

  // Always write the in-app notification (survives app reinstall).
  await admin.from("notifications").insert({
    school_id: rec.school_id,
    user_id: parent.id,
    title,
    body: messageBody,
    type: "attendance_absence",
  });

  let result: SendResult = "recorded_no_app";

  if (parent.push_token) {
    const pushRes = await sendExpoPush(parent.push_token, title, messageBody);
    if (pushRes === "device_not_registered") {
      // Stale token: clear it so the "uninstalled" view stays accurate.
      await admin.from("profiles").update({ push_token: null }).eq("id", parent.id);
      result = "recorded_no_app";
    } else if (pushRes === "ok") {
      result = "sent";
    } else {
      result = "recorded_no_app";
    }
  }

  // Stamp notified_at for both sent and recorded_no_app.
  await admin
    .from("attendance_records")
    .update({ notified_at: new Date().toISOString() })
    .eq("id", rec.id);

  return json({ result });
}

async function sendExpoPush(
  token: string,
  title: string,
  body: string,
): Promise<"ok" | "device_not_registered" | "failed"> {
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: token, title, body, sound: "default" }),
    });
    const data = await res.json();
    const status = data?.data?.status;
    const errType = data?.data?.details?.error;
    if (status === "ok") return "ok";
    if (errType === "DeviceNotRegistered") return "device_not_registered";
    return "failed";
  } catch {
    return "failed";
  }
}
```

- [ ] **Step 2: Test the no-parent-linked path**

Find an absent record whose student has no parent:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c \
"SELECT ar.id FROM attendance_records ar JOIN student_profiles sp ON sp.id=ar.student_id WHERE ar.status='absent' AND sp.parent_profile_id IS NULL LIMIT 1;"
```
Call the function with a teacher JWT authorized for that section.
Expected: `{"result":"error","reason":"no_parent_linked"}` HTTP 422.

- [ ] **Step 3: Test the recorded_no_app path (parent exists, no token)**

Pick an absent record whose student's parent has `push_token IS NULL`. Call with the authorized teacher JWT.
Expected: `{"result":"recorded_no_app"}`. Then verify:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c \
"SELECT notified_at FROM attendance_records WHERE id='<RECORD_ID>';" -c \
"SELECT title, body, type FROM notifications WHERE type='attendance_absence' ORDER BY created_at DESC LIMIT 1;"
```
Expected: `notified_at` is non-NULL; a `notifications` row exists with `type='attendance_absence'` and the body naming the student + session + date.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/send-attendance-notification/index.ts
git commit -m "feat(edge): deliver absence push + in-app record + notified_at stamp"
```

---

## Task 4: Mobile client helper

**Files:**
- Modify: `apps/mobile/lib/notifications.ts`

- [ ] **Step 1: Add `sendAbsenceNotification`**

Append to `apps/mobile/lib/notifications.ts`:

```ts
export type AbsenceNotifyResult = "sent" | "recorded_no_app" | "error";

export async function sendAbsenceNotification(
  recordId: string,
): Promise<AbsenceNotifyResult> {
  const { data, error } = await supabase.functions.invoke(
    "send-attendance-notification",
    { body: { recordId } },
  );
  if (error) return "error";
  const result = (data as { result?: string } | null)?.result;
  if (result === "sent") return "sent";
  if (result === "recorded_no_app") return "recorded_no_app";
  return "error";
}
```

(`supabase.functions.invoke` automatically attaches the current session's JWT as the Authorization header and targets `<EXPO_PUBLIC_SUPABASE_URL>/functions/v1/...`.)

- [ ] **Step 2: Typecheck the mobile app**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: no errors (`TSC_DONE`, exit 0).

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/lib/notifications.ts
git commit -m "feat(mobile): add sendAbsenceNotification edge-function client"
```

---

## Final verification

- [ ] **End-to-end happy path with a real Expo token (if a dev build is available)**

If a parent profile has a valid `ExponentPushToken[...]`, mark their child absent, call the function with the teacher JWT, and confirm `{"result":"sent"}` plus an actual push received on the device. If no dev build / token is available, document that the happy "sent" path was verified only at the API level (response + DB writes), not on a physical push.

- [ ] **Confirm the function is in source control and serves cleanly**

Run: `supabase functions serve send-attendance-notification` then re-run the curl auth check from Task 1 Step 2.
Expected: 401 unauthorized — function still serves.

---

## Self-review notes (for the implementer)

- The client never sends parent or student IDs — only a `recordId`. The server derives the recipient and re-checks authorization. Do not "optimize" by passing recipient info from the client.
- `notified_at` is stamped for BOTH `sent` and `recorded_no_app` — the teacher did their part either way.
- The in-app `notifications` row is written even with no push token, so the message appears in the parent feed (Plan 4) after they install.
- Clearing a stale `push_token` on `DeviceNotRegistered` keeps the admin "uninstalled" page accurate; no retry queue (YAGNI).
