# Homework Lifecycle Rework — Plan 2: Storage + Notifications

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the private `homework-attachments` storage bucket with RLS, and build the notification pipeline that closes the loop: parents are notified when homework is published (`homework_assigned`) and when their child's homework is reviewed (`homework_reviewed`).

**Architecture:** One storage-bucket migration. One Supabase Edge Function (`send-homework-notification`) modeled on the existing `send-attendance-notification`, event-discriminated by an `event` field. The "reviewed" notification is fired by the same edge function, called from the app right after `review_homework` succeeds (Plan 3/5). The "assigned" notification fans out to all parents of the section. Signed-URL generation for attachments is done client-side from the private bucket (covered in Plans 3–5); this plan only creates the bucket + policies it relies on.

**Tech Stack:** Supabase Storage, Supabase Edge Functions (Deno), Expo Push API.

**Spec:** `docs/superpowers/specs/2026-06-14-homework-lifecycle-design.md` (Storage, Notifications sections).

**Depends on:** Plan 1 (tables, enums, RPCs).

---

## Context for the implementer

- **Edge functions** live in `supabase/functions/<name>/index.ts` (Deno). Existing ones: `send-attendance-notification` (the model to copy), `send-push-notification`, `generate-report-card`, etc.
- Local functions are served at `http://127.0.0.1:54321/functions/v1/<name>`. The bundled `supabase_edge_runtime` Docker container does **not** hot-reload reliably — after editing function code, run `docker restart $(docker ps --filter name=supabase_edge_runtime --format '{{.Names}}')` before testing.
- **`send-attendance-notification/index.ts`** is the canonical pattern: it (1) reads the caller JWT, (2) verifies the caller via an anon client, (3) uses a service-role client for trusted reads/writes, (4) inserts into `notifications`, (5) sends an Expo push if the recipient has a `push_token`. Reuse this structure.
- **`notifications` table:** `id, school_id, user_id, student_id, title, body, type, is_read, created_at`. `student_id` (added migration 45) scopes a multi-child parent's feed.
- **`profiles.push_token`** holds a parent's Expo push token (nullable). Clear it on `DeviceNotRegistered`.
- **Local env for functions:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` are injected automatically.
- **Local JWT minting** for tests: HMAC-SHA256 with secret `super-secret-jwt-token-with-at-least-32-characters-long`, payload `{ sub, role: "authenticated", exp }`. (Same approach the attendance tests used.)
- Buckets are created with `INSERT INTO storage.buckets (id, name, public) VALUES (...)`; storage RLS policies live on `storage.objects` keyed by `bucket_id`. See `20240001000023_school_gallery.sql` for the template — but note we want **private** (`public = false`), unlike gallery.
- `get_my_role()` / `get_my_school_id()` are available inside storage policies (they read the request GUCs, set for web by `scope_pre_request`, and for mobile by the client's headers).
- **All work is local-only.** Do NOT deploy functions to the remote project (`supabase functions deploy`) in this plan.

---

## File Structure

- Create: `supabase/migrations/20240001000049_homework_attachments_bucket.sql` — private bucket + storage RLS.
- Create: `supabase/functions/send-homework-notification/index.ts` — event-discriminated notifier (`assigned` | `reviewed`).

---

## Task 1: Private homework-attachments bucket + storage RLS

**Files:**
- Create: `supabase/migrations/20240001000049_homework_attachments_bucket.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Private bucket for homework attachments. Unlike the existing public buckets
-- (school-gallery, student-photos), this is NOT public: files are served via
-- short-lived signed URLs to authorized users only. Path convention:
--   homework/{schoolId}/{homeworkId}/{timestamp}-{filename}

INSERT INTO storage.buckets (id, name, public)
VALUES ('homework-attachments', 'homework-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Upload/update/delete: staff + teachers of a school (mirrors homework_write).
CREATE POLICY "homework_attachments_upload" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'homework-attachments'
    AND public.get_my_role() IN ('super_admin', 'school_admin', 'teacher')
  );

CREATE POLICY "homework_attachments_modify" ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'homework-attachments'
    AND public.get_my_role() IN ('super_admin', 'school_admin', 'teacher')
  );

CREATE POLICY "homework_attachments_remove" ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'homework-attachments'
    AND public.get_my_role() IN ('super_admin', 'school_admin', 'teacher')
  );

-- Read: any authenticated member of a school. The bucket is private, so a
-- signed URL is still required to fetch bytes; this policy lets the signing
-- request (and direct authenticated reads) succeed for school members.
-- Parents hold a school role, so they qualify.
CREATE POLICY "homework_attachments_read" ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'homework-attachments'
    AND public.get_my_school_id() IS NOT NULL
  );
```

- [ ] **Step 2: Apply via db reset**

Run: `supabase db reset`
Expected: completes without error.

- [ ] **Step 3: Probe the bucket is private and policies exist**

Run:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c \
"SELECT id, public FROM storage.buckets WHERE id='homework-attachments';" -c \
"SELECT policyname, cmd FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname LIKE 'homework_attachments%' ORDER BY policyname;"
```
Expected: bucket row with `public = f`; four policies (`homework_attachments_modify` UPDATE, `homework_attachments_read` SELECT, `homework_attachments_remove` DELETE, `homework_attachments_upload` INSERT).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20240001000049_homework_attachments_bucket.sql
git commit -m "feat(storage): add private homework-attachments bucket with RLS"
```

---

## Task 2: send-homework-notification edge function

**Files:**
- Create: `supabase/functions/send-homework-notification/index.ts`

- [ ] **Step 1: Write the function**

```typescript
import { createClient } from "jsr:@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

// Two events:
//  - "assigned": fan out to ALL parents of students enrolled in the homework's
//    section. Called once when a teacher publishes homework.
//  - "reviewed": notify the ONE parent of the reviewed student. Called right
//    after review_homework() succeeds.
type Event = "assigned" | "reviewed";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace("Bearer ", "").trim();
  if (!jwt) return json({ error: "unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: userData, error: userErr } = await authClient.auth.getUser();
  if (userErr || !userData.user) return json({ error: "unauthorized" }, 401);
  const callerId = userData.user.id;

  let body: { event?: Event; homeworkId?: string; studentId?: string };
  try { body = await req.json(); } catch { return json({ error: "bad_request" }, 400); }
  const { event, homeworkId, studentId } = body;
  if (!event || !homeworkId) return json({ error: "missing_fields" }, 400);

  const admin = createClient(supabaseUrl, serviceKey);

  // Load homework + class/section/subject context.
  const { data: hw } = await admin
    .from("homework")
    .select("id, school_id, section_id, title, due_date")
    .eq("id", homeworkId)
    .maybeSingle();
  if (!hw) return json({ result: "error", reason: "not_found" }, 404);

  // Authorize: caller must teach this section (homeroom or timetable, active year).
  // NOTE: we do this with explicit admin queries using callerId rather than the
  // teaches_homework_section RPC — that RPC relies on auth.uid(), which is NULL
  // when invoked through the service-role `admin` client, so it would always
  // deny. (This mirrors how send-attendance-notification authorizes.)
  const { data: yearId } = await admin.rpc("get_active_academic_year", {
    p_school_id: hw.school_id,
  });
  const { data: assignment } = await admin
    .from("section_assignments").select("id")
    .eq("section_id", hw.section_id)
    .eq("class_teacher_id", callerId)
    .eq("academic_year_id", yearId)
    .maybeSingle();
  let authorized = !!assignment;
  if (!authorized) {
    const { data: tt } = await admin
      .from("timetable").select("id")
      .eq("section_id", hw.section_id)
      .eq("teacher_id", callerId)
      .eq("academic_year_id", yearId)
      .limit(1).maybeSingle();
    authorized = !!tt;
  }
  if (!authorized) return json({ result: "error", reason: "not_authorized" }, 403);

  const { data: school } = await admin
    .from("schools").select("name").eq("id", hw.school_id).maybeSingle();
  const schoolName = school?.name ?? "School";

  if (event === "assigned") {
    return await notifyAssigned(admin, hw, schoolName);
  }
  if (event === "reviewed") {
    if (!studentId) return json({ error: "missing_student" }, 400);
    return await notifyReviewed(admin, hw, schoolName, studentId);
  }
  return json({ error: "bad_event" }, 400);
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status, headers: { "Content-Type": "application/json" },
  });
}

// deno-lint-ignore no-explicit-any
async function notifyAssigned(admin: any, hw: any, schoolName: string): Promise<Response> {
  // All active students enrolled in the section → their parents.
  const { data: enrollments } = await admin
    .from("student_enrollments")
    .select("student_profile_id, student_profiles(id, full_name, parent_profile_id)")
    .eq("section_id", hw.section_id)
    .eq("is_active", true);

  const dateLabel = new Date(hw.due_date + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric", month: "short",
  });
  const title = schoolName;
  const messageBody = `New homework: ${hw.title} (due ${dateLabel}).`;

  let sent = 0;
  for (const row of enrollments ?? []) {
    const sp = row.student_profiles;
    if (!sp?.parent_profile_id) continue;

    await admin.from("notifications").insert({
      school_id: hw.school_id,
      user_id: sp.parent_profile_id,
      student_id: sp.id,
      title,
      body: messageBody,
      type: "homework_assigned",
    });

    const { data: parent } = await admin
      .from("profiles").select("push_token").eq("id", sp.parent_profile_id).maybeSingle();
    if (parent?.push_token) {
      const r = await sendExpoPush(parent.push_token, title, messageBody);
      if (r === "device_not_registered") {
        await admin.from("profiles").update({ push_token: null }).eq("id", sp.parent_profile_id);
      } else if (r === "ok") sent++;
    }
  }
  return json({ result: "ok", pushed: sent });
}

// deno-lint-ignore no-explicit-any
async function notifyReviewed(admin: any, hw: any, schoolName: string, studentId: string): Promise<Response> {
  const { data: sp } = await admin
    .from("student_profiles")
    .select("id, full_name, parent_profile_id")
    .eq("id", studentId)
    .maybeSingle();
  if (!sp?.parent_profile_id) return json({ result: "error", reason: "no_parent_linked" }, 422);

  const title = schoolName;
  const messageBody = `Your child's homework "${hw.title}" has been reviewed by the teacher.`;

  await admin.from("notifications").insert({
    school_id: hw.school_id,
    user_id: sp.parent_profile_id,
    student_id: sp.id,
    title,
    body: messageBody,
    type: "homework_reviewed",
  });

  const { data: parent } = await admin
    .from("profiles").select("push_token").eq("id", sp.parent_profile_id).maybeSingle();
  let result = "recorded_no_app";
  if (parent?.push_token) {
    const r = await sendExpoPush(parent.push_token, title, messageBody);
    if (r === "device_not_registered") {
      await admin.from("profiles").update({ push_token: null }).eq("id", sp.parent_profile_id);
    } else if (r === "ok") result = "sent";
  }
  return json({ result });
}

async function sendExpoPush(
  token: string, title: string, body: string,
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
  } catch { return "failed"; }
}
```

- [ ] **Step 2: Restart the edge runtime so it picks up the new function**

Run: `docker restart $(docker ps --filter name=supabase_edge_runtime --format '{{.Names}}')`
Expected: prints the container name. (The bundled runtime does not hot-reload reliably.)

- [ ] **Step 3: Mint a teacher JWT and call the "assigned" event**

Create a throwaway Node script to mint a JWT for a teacher who teaches a seeded homework's section. First find a teacher + homework:

Run:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c \
"SELECT h.id AS homework_id, h.teacher_id FROM public.homework h LIMIT 1;"
```
Then mint a JWT for that `teacher_id` (replace `<TEACHER_ID>`):
```bash
node -e '
const c=require("crypto");
const secret="super-secret-jwt-token-with-at-least-32-characters-long";
const b64=o=>Buffer.from(JSON.stringify(o)).toString("base64url");
const h=b64({alg:"HS256",typ:"JWT"});
const p=b64({sub:"<TEACHER_ID>",role:"authenticated",exp:Math.floor(Date.now()/1000)+3600});
const s=c.createHmac("sha256",secret).update(h+"."+p).digest("base64url");
console.log(h+"."+p+"."+s);
'
```
Save the printed token, then call (replace `<JWT>` and `<HOMEWORK_ID>`):
```bash
curl -s -X POST "http://127.0.0.1:54321/functions/v1/send-homework-notification" \
  -H "Authorization: Bearer <JWT>" -H "Content-Type: application/json" \
  -d '{"event":"assigned","homeworkId":"<HOMEWORK_ID>"}'
```
Expected: JSON `{"result":"ok","pushed":N}` (N is 0 if no seeded parent has a push_token — that's fine).

- [ ] **Step 4: Verify notifications were inserted for the section's parents**

Run:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c \
"SELECT type, count(*) FROM public.notifications WHERE type='homework_assigned' GROUP BY type;"
```
Expected: one row `homework_assigned | N` where N ≥ 1 (one per enrolled student with a linked parent in the homework's section).

- [ ] **Step 5: Negative — a non-teacher caller is rejected**

Mint a JWT for a parent (any `student_profiles.parent_profile_id`) and call the same endpoint:
```bash
curl -s -X POST "http://127.0.0.1:54321/functions/v1/send-homework-notification" \
  -H "Authorization: Bearer <PARENT_JWT>" -H "Content-Type: application/json" \
  -d '{"event":"assigned","homeworkId":"<HOMEWORK_ID>"}'
```
Expected: `{"result":"error","reason":"not_authorized"}` with HTTP 403.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/send-homework-notification/index.ts
git commit -m "feat(functions): add send-homework-notification (assigned + reviewed events)"
```

---

## Final verification

- [ ] **Reset + re-run the assigned probe once more to confirm idempotent setup**

Run: `supabase db reset && docker restart $(docker ps --filter name=supabase_edge_runtime --format '{{.Names}}')`
Expected: clean reset; function still reachable.

- [ ] **Confirm the function is NOT scheduled/deployed remotely**

Run: `grep -rn "homework" supabase/config.toml`
Expected: zero matches (no schedule wiring here — the cron reminder is Plan 5). This function is invoked on-demand by the app.

---

## Self-review notes (for the implementer)

- The function authorizes by querying `section_assignments`/`timetable` with `callerId` directly (NOT the `teaches_homework_section` RPC), because that RPC depends on `auth.uid()` which is NULL under the service-role client. Same authorization logic as the RPC, just evaluated with the caller id explicitly.
- `assigned` is a fan-out (one notification per enrolled student's parent, each scoped by `student_id`). `reviewed` is a single targeted notification.
- The app calls this function: (a) right after inserting homework (Plans 3/5, `event:"assigned"`), and (b) right after `review_homework` returns (Plans 3/5, `event:"reviewed"`). The RPC does the DB write; the function does the notification — they are separate calls by design so a notification failure never rolls back the grade.
- Do NOT deploy to remote in this plan. Local verification only.
- The `due_date` reminder (a third notification type, `homework_due`) is intentionally NOT here — it needs pg_cron and is built in Plan 5.
