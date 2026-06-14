# Homework Lifecycle Rework — Plan 5: Web Teacher + Due-Date Reminder

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the teacher homework loop to the web app — attachments on the create form, a per-homework detail page with a status-grouped roster and inline review, and an "X/Y done" column on the list — then add the scheduled due-date reminder (pg_cron + `send-homework-reminders` edge function).

**Architecture:** A shared client module `apps/web/lib/homework.ts` holds web data access + signed-URL helper. The existing `teacher/homework/page.tsx` gains a done-count column linking each row to a new dynamic detail page `teacher/homework/[id]/page.tsx` (server component shell + client roster/review island). The create form gains a multi-file attachment uploader to the private bucket. Finally, a pg_cron job invokes a new edge function daily to remind parents of undone homework due that day — built via migration but **verified on deploy only** (cron doesn't run on the local stack).

**Tech Stack:** Next.js App Router (server + client components), Supabase JS (browser + server), Supabase Edge Functions (Deno), pg_cron + pg_net.

**Spec:** `docs/superpowers/specs/2026-06-14-homework-lifecycle-design.md` (UI → Teacher Web; Notifications #3).

**Depends on:** Plan 1 (RPCs/tables), Plan 2 (bucket + `send-homework-notification`). Independent of Plans 3–4.

---

## Context for the implementer

- **Web is staff-only.** The `(school)` route group serves `school_admin`, `principal`, `teacher`. **Parents have no web UI** — this plan is teacher-facing only.
- **Existing homework UI:** `app/(school)/teacher/homework/page.tsx` (server component: lists homework in a `DataTable` + renders `CreateHomeworkForm`) and `create-homework-form.tsx` (client form; inserts to `homework`; no attachments today).
- **Supabase clients:** `@/lib/supabase` exports `createClient()` (browser). `@/lib/supabase/server` exports `createServerSupabaseClient()` (server components, forwards `x-school-id`/`x-active-role` scope headers — RLS depends on these). Use the server client in server components, the browser client in `"use client"` islands.
- **Scope headers:** middleware sets `x-school-id` and `x-active-role`; the server client forwards them so `get_my_school_id()`/`get_my_role()` resolve. (See the web middleware fix from earlier in this project — school resolution is via service-role, role scope via headers.)
- **Active section:** `getActiveSection()` from `@/lib/section-context` returns the teacher's current `section_id` (cookie-driven). `getSchoolId()` from `@/lib/school`.
- **Components:** `@/components/ui/button`, `input`, `label`, `native-select`, `@/components/data-table` (props: `data`, `columns: {header, accessor}[]`, `emptyMessage`). Toaster via `sonner` (`toast`).
- **Private bucket caveat:** the existing syllabus form uploads to a `files` bucket using `getPublicUrl` — that bucket is public and isn't even migration-created. **Do NOT copy that.** Homework uses the private `homework-attachments` bucket (Plan 2) and `createSignedUrl` for reads.
- **pg_cron:** not installed in the repo. On Supabase, `pg_cron` + `pg_net` are available as extensions. A cron job uses `net.http_post(...)` to call the edge function. This only runs on the deployed project — `supabase db reset` locally will create the schedule but it won't fire. Verify the migration applies cleanly; functional verification is on deploy.
- Type-check: `npm run type-check` (runs `tsc --noEmit`) from `apps/web`. `npm run lint` is broken repo-wide — do not rely on it.
- **Local-only for app code.** The cron migration is committed but the edge function is NOT deployed in this plan (note the deploy step as a follow-up for the user to run with authorization).

---

## File Structure

- Create: `apps/web/lib/homework.ts` — client data access (`loadRoster`, `reviewStudent`, `getSignedUrl`, `notifyReviewed`).
- Modify: `apps/web/app/(school)/teacher/homework/page.tsx` — done-count column + row links.
- Modify: `apps/web/app/(school)/teacher/homework/create-homework-form.tsx` — attachment uploader + `notifyAssigned`.
- Create: `apps/web/app/(school)/teacher/homework/[id]/page.tsx` — server shell (loads homework + section).
- Create: `apps/web/app/(school)/teacher/homework/[id]/roster-review.tsx` — client roster + inline review island.
- Create: `supabase/functions/send-homework-reminders/index.ts` — finds undone homework due today, notifies parents.
- Create: `supabase/migrations/20240001000050_homework_reminder_cron.sql` — pg_cron schedule.

---

## Task 1: Web homework data module

**Files:**
- Create: `apps/web/lib/homework.ts`

- [ ] **Step 1: Write the module**

```typescript
"use client";

import { createClient } from "@/lib/supabase";

export type HomeworkRating = "good" | "satisfactory" | "needs_improvement";
export type RosterState = "not_started" | "viewed" | "done";

export interface RosterRow {
  studentId: string;
  fullName: string;
  state: RosterState;
  rating: HomeworkRating | null;
  teacherComment: string | null;
  reviewedAt: string | null;
}

export interface AttachmentRow {
  id: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
}

export async function loadRoster(homeworkId: string, sectionId: string): Promise<RosterRow[]> {
  const supabase = createClient();
  const { data: enrollments } = await supabase
    .from("student_enrollments")
    .select("student_profiles(id, full_name)")
    .eq("section_id", sectionId)
    .eq("is_active", true);

  const { data: statuses } = await supabase
    .from("homework_status")
    .select("student_id, state, rating, teacher_comment, reviewed_at")
    .eq("homework_id", homeworkId);

  const byStudent: Record<string, any> = {};
  for (const s of statuses ?? []) byStudent[(s as any).student_id] = s;

  return (enrollments ?? [])
    .map((e: any) => e.student_profiles)
    .filter(Boolean)
    .map((sp: any): RosterRow => {
      const s = byStudent[sp.id];
      return {
        studentId: sp.id,
        fullName: sp.full_name,
        state: (s?.state as RosterState) ?? "not_started",
        rating: s?.rating ?? null,
        teacherComment: s?.teacher_comment ?? null,
        reviewedAt: s?.reviewed_at ?? null,
      };
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}

export async function loadAttachments(homeworkId: string): Promise<AttachmentRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("homework_attachments")
    .select("id, file_name, file_type, file_url")
    .eq("homework_id", homeworkId);
  return (data ?? []).map((a: any) => ({
    id: a.id, fileName: a.file_name, fileType: a.file_type, fileUrl: a.file_url,
  }));
}

export async function getSignedUrl(path: string): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.storage.from("homework-attachments").createSignedUrl(path, 60);
  return data?.signedUrl ?? null;
}

export async function reviewStudent(
  homeworkId: string, studentId: string, rating: HomeworkRating, comment: string,
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.rpc("review_homework", {
    p_homework_id: homeworkId, p_student_id: studentId, p_rating: rating, p_comment: comment,
  });
  return { error: error?.message ?? null };
}

export async function uploadAttachment(
  schoolId: string, homeworkId: string, file: File,
): Promise<{ error: string | null }> {
  if (file.size > 2 * 1024 * 1024) return { error: "File exceeds 2MB" };
  const supabase = createClient();
  const path = `homework/${schoolId}/${homeworkId}/${Date.now()}-${file.name}`;
  const up = await supabase.storage.from("homework-attachments").upload(path, file, { contentType: file.type });
  if (up.error) return { error: up.error.message };
  const ins = await supabase.from("homework_attachments").insert({
    homework_id: homeworkId, school_id: schoolId, file_url: path,
    file_name: file.name, file_type: file.type, file_size: file.size,
  });
  return { error: ins.error?.message ?? null };
}

async function callNotify(payload: object): Promise<void> {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-homework-notification`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch { /* best-effort */ }
}

export const notifyAssigned = (homeworkId: string) => callNotify({ event: "assigned", homeworkId });
export const notifyReviewed = (homeworkId: string, studentId: string) =>
  callNotify({ event: "reviewed", homeworkId, studentId });
```

- [ ] **Step 2: Type-check**

Run (from `apps/web`): `npm run type-check`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/homework.ts
git commit -m "feat(web): add homework client data module (roster, review, attachments)"
```

---

## Task 2: Attachments on the create form + assigned notification

**Files:**
- Modify: `apps/web/app/(school)/teacher/homework/create-homework-form.tsx`

- [ ] **Step 1: Add file state and a file input**

In `create-homework-form.tsx`, import the helpers:
```tsx
import { uploadAttachment, notifyAssigned } from "@/lib/homework";
```
Add state near the others:
```tsx
const [files, setFiles] = useState<File[]>([]);
```
Add a file input block in the form (above the submit Button, inside a `col-span-2` div):
```tsx
<div className="col-span-2">
  <Label>Attachments (optional, ≤2MB each — DOC, PDF, images)</Label>
  <input
    type="file"
    multiple
    accept=".doc,.docx,.pdf,image/png,image/jpeg"
    onChange={(e) => {
      const picked = Array.from(e.target.files ?? []);
      const tooBig = picked.find((f) => f.size > 2 * 1024 * 1024);
      if (tooBig) { setError(`${tooBig.name} exceeds 2MB`); return; }
      setError(null);
      setFiles(picked);
    }}
    className="mt-1 block w-full text-sm"
  />
  {files.length > 0 && (
    <ul className="mt-2 text-sm text-gray-600">
      {files.map((f, i) => <li key={i}>{f.name}</li>)}
    </ul>
  )}
</div>
```

- [ ] **Step 2: Capture the new homework id, upload, and notify**

In `handleSubmit`, change the insert to return the id and then upload + notify. Replace the insert + reset block:
```tsx
const { data: created, error: err } = await supabase.from("homework").insert({
  school_id: schoolId,
  class_id: classId,
  teacher_id: teacherId,
  section_id: sectionId,
  subject_id: subjectId,
  title,
  description: description || null,
  due_date: dueDate || null,
}).select("id").single();
if (err || !created) {
  setError(err?.message ?? "Could not save");
  setLoading(false);
  return;
}

for (const f of files) {
  const up = await uploadAttachment(schoolId, created.id, f);
  if (up.error) setError(`${f.name}: ${up.error}`);
}
notifyAssigned(created.id);

setLoading(false);
setTitle(""); setDescription(""); setDueDate("");
setClassId(""); setSectionId(""); setSubjectId(""); setFiles([]);
router.refresh();
```
(Remove the previous `setLoading(false)` / reset lines this replaces.)

- [ ] **Step 3: Type-check**

Run (from `apps/web`): `npm run type-check`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "apps/web/app/(school)/teacher/homework/create-homework-form.tsx"
git commit -m "feat(web): homework create form uploads attachments + notifies parents"
```

---

## Task 3: Done-count column + row links on the list

**Files:**
- Modify: `apps/web/app/(school)/teacher/homework/page.tsx`

- [ ] **Step 1: Load done/total counts and add a linked column**

In `page.tsx`, after the existing `homework` fetch, compute counts. Add to the `Promise.all` (or as a follow-up query) — fetch enrollment total + done counts:
```tsx
const homeworkIds = (homework ?? []).map((h) => h.id);
const [{ count: totalStudents }, { data: doneStatuses }] = await Promise.all([
  supabase.from("student_enrollments").select("id", { count: "exact", head: true })
    .eq("section_id", sectionId).eq("is_active", true),
  homeworkIds.length > 0
    ? supabase.from("homework_status").select("homework_id, state")
        .in("homework_id", homeworkIds).eq("state", "done")
    : Promise.resolve({ data: [] as { homework_id: string; state: string }[] }),
]);
const doneByHw: Record<string, number> = {};
for (const s of (doneStatuses ?? []) as any[]) doneByHw[s.homework_id] = (doneByHw[s.homework_id] ?? 0) + 1;
```
Add a `done` field and an `id` to each row in the `rows` mapping:
```tsx
return {
  id: h.id,
  title: h.title ?? "—",
  subject: subject?.name ?? "—",
  section: section ? `${section.class?.name ?? ""} – ${section.name}` : "—",
  due_date: h.due_date ? new Date(h.due_date).toLocaleDateString() : "—",
  done: `${doneByHw[h.id] ?? 0}/${totalStudents ?? 0}`,
  description: h.description ?? "—",
};
```
Add a "Done" column and make the title link to the detail page. Replace the `columns` prop and add a custom title cell. Since `DataTable` takes `{header, accessor}`, render the title as a link via a `render`-style accessor if supported; otherwise add a dedicated "Open" column. Use this columns array (the title cell links):
```tsx
columns={[
  { header: "Title", accessor: "title", cell: (row: any) => (
      <a href={`/teacher/homework/${row.id}`} className="font-medium text-primary hover:underline">{row.title}</a>
  ) },
  { header: "Subject", accessor: "subject" },
  { header: "Section", accessor: "section" },
  { header: "Due Date", accessor: "due_date" },
  { header: "Done", accessor: "done" },
  { header: "Description", accessor: "description" },
]}
```

- [ ] **Step 2: Confirm DataTable supports a `cell` renderer; if not, add a plain link column**

Run: `grep -n "cell\|accessor\|render\|columns" apps/web/components/data-table.tsx | head`
Expected: shows the column type. If `DataTable` does NOT support a `cell`/`render` function (only string `accessor`), then instead of the linked title cell, drop the `cell` and add a trailing column:
```tsx
{ header: "", accessor: "open" }
```
and set `open: "View →"` won't link — so in that fallback, wrap each table row's navigation by adding an `id`-based link column rendered as plain text is insufficient. In the fallback case, render a small client component link list above the table, OR extend `DataTable` minimally to accept an optional `cell`. **Preferred:** extend `data-table.tsx` to support an optional `cell?: (row) => ReactNode` per column (small, backwards-compatible change). Make that change if needed and note it in the commit.

- [ ] **Step 3: Type-check**

Run (from `apps/web`): `npm run type-check`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "apps/web/app/(school)/teacher/homework/page.tsx" apps/web/components/data-table.tsx
git commit -m "feat(web): homework list shows done counts and links to detail"
```

---

## Task 4: Homework detail page (server shell + client roster/review)

**Files:**
- Create: `apps/web/app/(school)/teacher/homework/[id]/page.tsx`
- Create: `apps/web/app/(school)/teacher/homework/[id]/roster-review.tsx`

- [ ] **Step 1: Write the server shell**

Create `apps/web/app/(school)/teacher/homework/[id]/page.tsx`:
```tsx
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { RosterReview } from "./roster-review";
import { notFound } from "next/navigation";

export default async function HomeworkDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: hw } = await supabase
    .from("homework")
    .select("id, title, due_date, section_id, subject:subjects(name)")
    .eq("id", id)
    .maybeSingle();
  if (!hw) notFound();

  const subject = hw.subject as unknown as { name: string } | null;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-gray-900">{hw.title}</h1>
      <p className="mb-6 text-sm text-gray-500">
        {subject?.name ?? "—"} · due {hw.due_date ? new Date(hw.due_date).toLocaleDateString() : "—"}
      </p>
      <RosterReview homeworkId={hw.id} sectionId={hw.section_id} />
    </div>
  );
}
```

- [ ] **Step 2: Write the client roster + review island**

Create `apps/web/app/(school)/teacher/homework/[id]/roster-review.tsx`:
```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  loadRoster, loadAttachments, getSignedUrl, reviewStudent, notifyReviewed,
  RosterRow, AttachmentRow, HomeworkRating,
} from "@/lib/homework";

const RATINGS: { value: HomeworkRating; label: string }[] = [
  { value: "good", label: "Good" },
  { value: "satisfactory", label: "Satisfactory" },
  { value: "needs_improvement", label: "Needs Improvement" },
];
const ratingLabel = (r: HomeworkRating | null) => RATINGS.find((x) => x.value === r)?.label ?? "";

export function RosterReview({ homeworkId, sectionId }: { homeworkId: string; sectionId: string }) {
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [rating, setRating] = useState<HomeworkRating>("good");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [r, a] = await Promise.all([loadRoster(homeworkId, sectionId), loadAttachments(homeworkId)]);
    setRoster(r); setAttachments(a); setLoading(false);
  }, [homeworkId, sectionId]);

  useEffect(() => { load(); }, [load]);

  const done = roster.filter((r) => r.state === "done");
  const viewed = roster.filter((r) => r.state === "viewed");
  const notStarted = roster.filter((r) => r.state === "not_started");

  function openReview(row: RosterRow) {
    if (openId === row.studentId) { setOpenId(null); return; }
    setOpenId(row.studentId);
    setRating(row.rating ?? "good");
    setComment(row.teacherComment ?? "");
  }

  async function save(row: RosterRow) {
    setSaving(true);
    const { error } = await reviewStudent(homeworkId, row.studentId, rating, comment);
    setSaving(false);
    if (error) { toast.error(error); return; }
    notifyReviewed(homeworkId, row.studentId);
    setOpenId(null);
    load();
  }

  async function open(path: string) {
    const url = await getSignedUrl(path);
    if (url) window.open(url, "_blank"); else toast.error("Could not open attachment");
  }

  if (loading) return <p className="text-sm text-gray-500">Loading roster…</p>;

  return (
    <div className="space-y-6">
      <div className="flex gap-6 rounded-lg bg-white p-4 shadow-sm">
        <Stat label="Done" value={`${done.length}/${roster.length}`} />
        <Stat label="Viewed" value={`${viewed.length}`} />
        <Stat label="Not started" value={`${notStarted.length}`} />
      </div>

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((a) => (
            <button key={a.id} onClick={() => open(a.fileUrl)} className="rounded border px-3 py-1 text-sm text-primary hover:underline">
              {a.fileName}
            </button>
          ))}
        </div>
      )}

      <Group title={`Done — review (${done.length})`}>
        {done.map((r) => (
          <div key={r.studentId} className="rounded-lg bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">{r.fullName}</span>
              {r.reviewedAt
                ? <span className="text-sm font-semibold text-green-600">{ratingLabel(r.rating)}</span>
                : <Button variant="outline" size="sm" onClick={() => openReview(r)}>{openId === r.studentId ? "Close" : "Review"}</Button>}
            </div>
            {openId === r.studentId && !r.reviewedAt && (
              <div className="mt-3 space-y-2">
                <div className="flex gap-2">
                  {RATINGS.map((opt) => (
                    <button key={opt.value} onClick={() => setRating(opt.value)}
                      className={`rounded border px-3 py-1 text-sm ${rating === opt.value ? "bg-primary text-white" : "text-gray-600"}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2}
                  placeholder="Comment (optional)…"
                  className="w-full rounded-md border px-3 py-2 text-sm" />
                <Button size="sm" disabled={saving} onClick={() => save(r)}>{saving ? "Saving…" : "Save Review"}</Button>
              </div>
            )}
          </div>
        ))}
      </Group>

      <Group title={`Viewed (${viewed.length})`}>
        {viewed.map((r) => <Row key={r.studentId} name={r.fullName} />)}
      </Group>
      <Group title={`Not started (${notStarted.length})`}>
        {notStarted.map((r) => <Row key={r.studentId} name={r.fullName} />)}
      </Group>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div><div className="text-xl font-bold">{value}</div><div className="text-xs text-gray-500">{label}</div></div>;
}
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="space-y-2"><h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">{title}</h2>{children}</div>;
}
function Row({ name }: { name: string }) {
  return <div className="rounded-lg bg-white p-3 text-sm shadow-sm">{name}</div>;
}
```

- [ ] **Step 3: Type-check**

Run (from `apps/web`): `npm run type-check`
Expected: no errors. If `params` typing complains, confirm the Next.js version's `params` is a Promise (App Router in this repo awaits `params`, per the existing `[studentId]` pages — match their signature).

- [ ] **Step 4: Verify route protection — teachers reach it, others redirect**

Middleware already enforces `/teacher/*` access (teacher, or admin/principal with an active section). No new guard needed. Confirm by reading the route enforcement block:

Run: `grep -n "startsWith(\"/teacher\")" apps/web/middleware.ts`
Expected: the existing teacher-access block is present (no change required).

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/(school)/teacher/homework/[id]/page.tsx" "apps/web/app/(school)/teacher/homework/[id]/roster-review.tsx"
git commit -m "feat(web): homework detail page with grouped roster + inline review"
```

---

## Task 5: send-homework-reminders edge function

**Files:**
- Create: `supabase/functions/send-homework-reminders/index.ts`

- [ ] **Step 1: Write the function**

This is invoked by pg_cron (service-role, no user JWT). It guards with a shared secret header so it can't be triggered by anyone.

```typescript
import { createClient } from "jsr:@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  // Shared-secret guard (set CRON_SECRET in function env; cron sends it).
  const secret = Deno.env.get("CRON_SECRET");
  if (secret && req.headers.get("x-cron-secret") !== secret) {
    return json({ error: "unauthorized" }, 401);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const today = new Date().toISOString().split("T")[0];

  // Homework due today.
  const { data: dueHw } = await admin
    .from("homework")
    .select("id, school_id, section_id, title")
    .eq("due_date", today);

  let notified = 0;
  for (const hw of dueHw ?? []) {
    // Students enrolled in the section.
    const { data: enrollments } = await admin
      .from("student_enrollments")
      .select("student_profiles(id, full_name, parent_profile_id)")
      .eq("section_id", hw.section_id)
      .eq("is_active", true);

    // Students who already marked done for this homework.
    const { data: doneRows } = await admin
      .from("homework_status")
      .select("student_id")
      .eq("homework_id", hw.id)
      .eq("state", "done");
    const doneSet = new Set((doneRows ?? []).map((d: any) => d.student_id));

    const { data: school } = await admin.from("schools").select("name").eq("id", hw.school_id).maybeSingle();
    const schoolName = school?.name ?? "School";

    for (const row of enrollments ?? []) {
      const sp = (row as any).student_profiles;
      if (!sp?.parent_profile_id || doneSet.has(sp.id)) continue;

      const body = `Reminder: "${hw.title}" is due today.`;
      await admin.from("notifications").insert({
        school_id: hw.school_id, user_id: sp.parent_profile_id, student_id: sp.id,
        title: schoolName, body, type: "homework_due",
      });

      const { data: parent } = await admin.from("profiles").select("push_token").eq("id", sp.parent_profile_id).maybeSingle();
      if (parent?.push_token) {
        await fetch(EXPO_PUSH_URL, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: parent.push_token, title: schoolName, body, sound: "default" }),
        }).catch(() => {});
      }
      notified++;
    }
  }
  return json({ result: "ok", notified });
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });
}
```

- [ ] **Step 2: Restart the edge runtime and smoke-test locally (manual trigger)**

Run: `docker restart $(docker ps --filter name=supabase_edge_runtime --format '{{.Names}}')`
Then (no `CRON_SECRET` set locally, so the guard is skipped):
```bash
curl -s -X POST "http://127.0.0.1:54321/functions/v1/send-homework-reminders" -H "Content-Type: application/json" -d '{}'
```
Expected: `{"result":"ok","notified":N}`. To force a hit, temporarily set a seeded homework's `due_date` to today via psql, re-run, and confirm `notified` increments and a `homework_due` notification row appears:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "SELECT type, count(*) FROM public.notifications WHERE type='homework_due' GROUP BY type;"
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/send-homework-reminders/index.ts
git commit -m "feat(functions): add send-homework-reminders (due-today undone reminder)"
```

---

## Task 6: pg_cron schedule (deploy-verified)

**Files:**
- Create: `supabase/migrations/20240001000050_homework_reminder_cron.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Daily homework due-date reminder. Uses pg_cron to call the
-- send-homework-reminders edge function via pg_net. This runs ONLY on the
-- deployed Supabase project — pg_cron does not fire on the local CLI stack.
--
-- The function URL and CRON_SECRET are project-specific. They are read from
-- Postgres settings (app.settings.*) which must be configured on the deployed
-- project (see deploy note). If unset, the job no-ops safely.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Runs every day at 02:30 UTC (~08:00 IST). Adjust per deployment if needed.
SELECT cron.schedule(
  'homework-due-reminders',
  '30 2 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.functions_url', true) || '/send-homework-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', current_setting('app.settings.cron_secret', true)
    ),
    body := '{}'::jsonb
  )
  WHERE current_setting('app.settings.functions_url', true) IS NOT NULL;
  $$
);
```

- [ ] **Step 2: Apply via db reset (schema validity only)**

Run: `supabase db reset`
Expected: completes without error. The extensions create and `cron.schedule` registers. (The job will not actually fire locally — that's expected.)

- [ ] **Step 3: Probe the job is registered**

Run:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c \
"SELECT jobname, schedule FROM cron.job WHERE jobname='homework-due-reminders';"
```
Expected: one row `homework-due-reminders | 30 2 * * *`. (If `cron.job` is unavailable on the local image, note it — the migration still applied; functional verification is on deploy.)

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20240001000050_homework_reminder_cron.sql
git commit -m "feat(db): schedule daily homework due-date reminder via pg_cron"
```

---

## Final verification

- [ ] **Web type-check**

Run (from `apps/web`): `npm run type-check`
Expected: no errors.

- [ ] **Clean DB reset**

Run: `supabase db reset`
Expected: all migrations (46–50) + seed apply with no errors.

- [ ] **Manual web smoke (teacher loop)**

1. Log in to `school1.lvh.me:3000` as a teacher; go to Homework.
2. Create homework with an attachment; confirm it appears with a `0/N` Done count.
3. Click the title → detail page shows the grouped roster + the attachment (opens via signed URL in a new tab).
4. (After a parent marks done on mobile) refresh → student under "Done — review"; click Review, pick a rating, Save → shows the rating.

---

## Deploy note (for the user — NOT part of local execution)

The pg_cron job and `send-homework-reminders` function only work on the deployed project. When you're ready to deploy (with authorization), you'll need to:
1. `supabase functions deploy send-homework-notification send-homework-reminders`
2. Set the function secret: `supabase secrets set CRON_SECRET=<random>`
3. Set DB settings so the cron job can reach the function:
   `ALTER DATABASE postgres SET app.settings.functions_url = 'https://<ref>.supabase.co/functions/v1';`
   `ALTER DATABASE postgres SET app.settings.cron_secret = '<same random>';`

Do not run these in this local-only plan.

---

## Self-review notes (for the implementer)

- Web is teacher-only by design; there is no parent web screen — do not create one.
- The detail page is a server shell (loads the homework header with RLS-scoped server client) + a client island that does the interactive roster/review. This keeps the data fetch on the server and the mutations on the client where the user's session signs the RPC.
- `review_homework` (Plan 1) re-checks the teacher teaches the section, so the page cannot be abused by a crafted request.
- The reminder function guards with `x-cron-secret`; locally the secret is unset so the guard is skipped for testing. On deploy the secret is required.
- The cron migration no-ops if `app.settings.functions_url` is unset, so a fresh deploy without the settings configured won't error — it just won't send until configured.
