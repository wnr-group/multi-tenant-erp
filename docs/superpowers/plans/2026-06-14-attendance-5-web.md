# Attendance Rework — Plan 5: Web (Teacher Parity + Session-Aware Dashboards)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the FN/AN session model to the web teacher attendance flow (session selector, mode-lock, marked-status clarity, clear/edit) and make the admin/principal/student read-only attendance aggregates session-aware so FN+AN are not mis-counted as two days. No push-send UI on web.

**Architecture:** Next.js App Router (server components fetch + client form for marking). The teacher mark page/form gain a `session` query param and write `onConflict: "student_id,date,session"`. Read aggregates switch from `statusMap[date]` (which collapses two sessions) to per-`(date,session)` keys, and count `late` as present where they currently ignore it.

**Tech Stack:** Next.js 16, React 19, `@supabase/supabase-js` (browser + SSR), Tailwind, recharts.

**Spec:** `docs/superpowers/specs/2026-06-14-attendance-rework-design.md` §5.

**Depends on:** Plan 1 (session column). Independent of Plans 2-4.

---

## Context for the implementer

- Web teacher attendance files: `app/(school)/teacher/attendance/page.tsx` (landing/status), `app/(school)/teacher/attendance/mark/page.tsx` (server fetch), `app/(school)/teacher/attendance/mark/attendance-mark-form.tsx` (client form).
- The client form currently has a 4th status `half_day` in `STATUS_OPTIONS` — keep statuses as `present|absent|late` for the rework; **drop `half_day`** (it predates the session model and isn't in the DB enum `attendance_status` which is `present|absent|late`). Confirm: the DB enum has no `half_day`, so saving it would error — removing it is a correctness fix.
- Upsert today uses `onConflict: "student_id,date"`; the new unique key is `student_id,date,session`.
- The active section comes from `getActiveSection()` (`@/lib/section-context`); school id from `getSchoolId()` (`@/lib/school`).
- **Read aggregates to fix:**
  - `app/(school)/admin/dashboard/page.tsx` (~line 100): counts present vs absent rows for today via two `count` queries. With sessions, a full-day = 1 row, FN/AN = up to 2 rows. The percentage `present/(present+absent)` stays directionally correct but **ignores `late`**. Fix: count `late` as present.
  - `app/(school)/principal/dashboard/page.tsx` (~line 66, ~line 110): same present/absent today counts + a class aggregate (`present/total`). Count `late` as present; the per-row aggregate is already session-safe (it counts rows, not days).
  - `app/(school)/admin/students/[id]/student-attendance-tab.tsx` (~line 20-33): **the real bug** — `statusMap[r.date] = r.status` overwrites when a date has both FN and AN. Switch to counting all session rows: present+late sessions / total sessions. Calendar cell coloring also keys by date and must handle multi-session days.
- No test framework: verify via `cd apps/web && npm run type-check` (tsc) and `npm run lint`, plus a dev-server walkthrough where feasible.

---

## File Structure

- Modify: `app/(school)/teacher/attendance/mark/attendance-mark-form.tsx` — session prop, drop half_day, new conflict target.
- Modify: `app/(school)/teacher/attendance/mark/page.tsx` — read `session` param, filter existing by session, pass through.
- Modify: `app/(school)/teacher/attendance/page.tsx` — session selector links + session-aware marked status.
- Modify: `app/(school)/admin/dashboard/page.tsx` — count late as present.
- Modify: `app/(school)/principal/dashboard/page.tsx` — count late as present.
- Modify: `app/(school)/admin/students/[id]/student-attendance-tab.tsx` — per-session aggregation + multi-session cell.

---

## Task 1: Teacher mark form — session + drop half_day + new conflict

**Files:**
- Modify: `app/(school)/teacher/attendance/mark/attendance-mark-form.tsx`

- [ ] **Step 1: Change the status type and options**

Replace lines 9-23 (the type + `STATUS_OPTIONS`) with:

```tsx
type AttendanceStatus = "present" | "absent" | "late";
type AttendanceSession = "FULL_DAY" | "FN" | "AN";

interface StudentRow {
  id: string;
  roll_number: string;
  full_name: string;
  status: string;
}

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; colors: string }[] = [
  { value: "present", label: "Present", colors: "bg-green-100 text-green-800 border-green-300" },
  { value: "absent", label: "Absent", colors: "bg-red-100 text-red-800 border-red-300" },
  { value: "late", label: "Late", colors: "bg-yellow-100 text-yellow-800 border-yellow-300" },
];
```

- [ ] **Step 2: Accept the session prop and use the new conflict target**

1. Add `session` to the component props (the `}: {...}` block ~line 36):
```tsx
}: {
  students: StudentRow[];
  sectionId: string;
  date: string;
  session: AttendanceSession;
  schoolId: string;
  markedBy: string;
}) {
```
2. In `handleSave`, add `session` to each record and change the conflict target (lines 67-78):
```tsx
const records = students.map((s) => ({
  school_id: schoolId,
  student_id: s.id,
  section_id: sectionId,
  date,
  session,
  status: statuses[s.id] ?? "present",
  marked_by: markedBy,
}));

const { error: err } = await supabase
  .from("attendance_records")
  .upsert(records, { onConflict: "student_id,date,session" });
```

- [ ] **Step 3: Typecheck + lint**

Run: `cd apps/web && npm run type-check && npm run lint`
Expected: no type errors; lint clean. (Type error in `mark/page.tsx` for the missing `session` prop is expected until Task 2 — if running standalone, complete Task 2 before this check, or expect that single error.)

- [ ] **Step 4: Commit**

```bash
git add "apps/web/app/(school)/teacher/attendance/mark/attendance-mark-form.tsx"
git commit -m "feat(web): session-aware teacher mark form, drop half_day"
```

---

## Task 2: Teacher mark page — session param + mode-lock data

**Files:**
- Modify: `app/(school)/teacher/attendance/mark/page.tsx`

- [ ] **Step 1: Read and resolve the session param**

1. Widen `searchParams` (line 8-10):
```tsx
searchParams: Promise<{ sectionId?: string; date?: string; session?: string }>;
```
2. Resolve it (after line 11):
```tsx
const { sectionId: paramSectionId, date, session: paramSession } = await searchParams;
const session = (paramSession === "FN" || paramSession === "AN" ? paramSession : "FULL_DAY") as "FULL_DAY" | "FN" | "AN";
```

- [ ] **Step 2: Fetch existing rows for ALL sessions to compute mode-lock + filter the current session for statuses**

Replace the `existing` query (lines 39-48) with:

```tsx
const { data: existingAll } = await supabase
  .from("attendance_records")
  .select("student_id, status, session")
  .eq("section_id", sectionId)
  .eq("date", date);

const hasFullDay = (existingAll ?? []).some((r) => r.session === "FULL_DAY");
const hasSession = (existingAll ?? []).some((r) => r.session === "FN" || r.session === "AN");

const existingMap: Record<string, string> = {};
for (const rec of existingAll ?? []) {
  if (rec.session === session) existingMap[rec.student_id] = rec.status ?? "present";
}
```

- [ ] **Step 3: Add a session switcher (links) + mode-lock hint, pass session to the form**

Replace the header `<p>` and form render (lines 70-84) with a session switcher and a locked-mode notice:

```tsx
const sessions: { key: "FULL_DAY" | "FN" | "AN"; label: string }[] = [
  { key: "FULL_DAY", label: "Full Day" },
  { key: "FN", label: "Forenoon" },
  { key: "AN", label: "Afternoon" },
];
const lockedToSession = hasSession; // FN/AN exist → full-day disabled
const lockedToFullDay = hasFullDay; // full-day exists → FN/AN disabled

return (
  <div>
    <h1 className="mb-1 text-2xl font-bold text-gray-900">Mark Attendance</h1>
    <p className="mb-4 text-sm text-gray-500">{sectionLabel} &nbsp;·&nbsp; {date}</p>

    <div className="mb-4 flex gap-2">
      {sessions.map((s) => {
        const disabled =
          (s.key === "FULL_DAY" && lockedToSession) ||
          (s.key !== "FULL_DAY" && lockedToFullDay);
        const active = s.key === session;
        const href = `/teacher/attendance/mark?sectionId=${sectionId}&date=${date}&session=${s.key}`;
        return disabled ? (
          <span key={s.key} className="cursor-not-allowed rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-300">
            {s.label}
          </span>
        ) : (
          <a
            key={s.key}
            href={href}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${active ? "border-indigo-600 bg-indigo-600 text-white" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
          >
            {s.label}
          </a>
        );
      })}
    </div>
    {(lockedToSession || lockedToFullDay) && (
      <p className="mb-4 text-xs text-amber-600">
        {lockedToFullDay ? "Marked as full-day for this date." : "Marked by session (FN/AN) for this date."}
      </p>
    )}

    <div className="rounded-lg bg-white p-6 shadow-sm">
      <AttendanceMarkForm
        students={studentRows}
        sectionId={sectionId}
        date={date}
        session={session}
        schoolId={schoolId}
        markedBy={user!.id}
      />
    </div>
  </div>
);
```

- [ ] **Step 4: Typecheck + lint**

Run: `cd apps/web && npm run type-check && npm run lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/(school)/teacher/attendance/mark/page.tsx"
git commit -m "feat(web): session switcher + mode-lock on teacher mark page"
```

---

## Task 3: Teacher attendance landing — session-aware marked status

**Files:**
- Modify: `app/(school)/teacher/attendance/page.tsx`

- [ ] **Step 1: Fetch sessions and show per-session marked status**

1. Change the `existing` query (lines 28-32) to include `session`:
```tsx
supabase
  .from("attendance_records")
  .select("student_id, status, session")
  .eq("section_id", sectionId)
  .eq("date", today),
```
2. Replace the `isMarked` + `existingMap` block (lines 58-63) with a per-mode summary:
```tsx
const fullDayRows = (existing ?? []).filter((r) => r.session === "FULL_DAY");
const fnRows = (existing ?? []).filter((r) => r.session === "FN");
const anRows = (existing ?? []).filter((r) => r.session === "AN");
const isMarked = (existing?.length ?? 0) > 0;

// For the table, prefer full-day; else show forenoon as the representative view.
const displayRows = fullDayRows.length > 0 ? fullDayRows : fnRows.length > 0 ? fnRows : anRows;
const existingMap: Record<string, string> = {};
for (const rec of displayRows) existingMap[rec.student_id] = rec.status ?? "present";

const markedSummary = fullDayRows.length > 0
  ? "Full day marked"
  : [fnRows.length > 0 ? "Forenoon" : null, anRows.length > 0 ? "Afternoon" : null].filter(Boolean).join(" + ") + " marked";
```
3. Default the mark link to full-day, and show the summary. Change `markHref` (line 65):
```tsx
const markHref = `/teacher/attendance/mark?sectionId=${sectionId}&date=${today}&session=FULL_DAY`;
```
4. Under the header `<p>` (after line 81), surface the summary when marked:
```tsx
{isMarked && <p className="mt-1 text-xs font-medium text-emerald-600">{markedSummary}</p>}
```

- [ ] **Step 2: Typecheck + lint**

Run: `cd apps/web && npm run type-check && npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/app/(school)/teacher/attendance/page.tsx"
git commit -m "feat(web): session-aware marked status on teacher attendance landing"
```

---

## Task 4: Admin + principal dashboards — count late as present

**Files:**
- Modify: `app/(school)/admin/dashboard/page.tsx`
- Modify: `app/(school)/principal/dashboard/page.tsx`

- [ ] **Step 1: Admin dashboard — include late in present count**

In `app/(school)/admin/dashboard/page.tsx`, the present-count query (~line 100-101) currently ends with `.eq("status", "present")`. Change only that one filter to `.in("status", ["present", "late"])` so late students count as present. Leave the absent query, the variable names (`presentToday`, `absentToday`), and the derivation (lines 105-107) exactly as they are. The resulting block reads:

```tsx
    supabase.from("attendance_records").select("*", { count: "exact", head: true })
      .eq("school_id", schoolId!).eq("date", today).in("status", ["present", "late"]),
    supabase.from("attendance_records").select("*", { count: "exact", head: true })
      .eq("school_id", schoolId!).eq("date", today).eq("status", "absent"),
  ]);
  const totalToday = (presentToday ?? 0) + (absentToday ?? 0);
  const presentPct = totalToday > 0 ? Math.round(((presentToday ?? 0) / totalToday) * 100) : 0;
  const attendanceData: AttendanceData = { present: presentPct, absent: 100 - presentPct };
```

- [ ] **Step 2: Principal dashboard — same change**

In `app/(school)/principal/dashboard/page.tsx`, the present-count query (~line 66-67) uses `.eq("status", "present")`. Change it to `.in("status", ["present", "late"])`. Leave the absent query and the class-aggregate query untouched (the class aggregate counts rows present/total — to also count late as present there, see Step 3).

- [ ] **Step 3: Principal class aggregate — count late as present**

In `app/(school)/principal/dashboard/page.tsx`, the class aggregate loop (~line 115-122) increments `present` only for `status === "present"` (verify the exact condition). Update the increment to treat `late` as present:
```tsx
    if (r.status === "present" || r.status === "late") entry.present++;
    entry.total++;
```
(If the existing code already has an explicit `present` increment guarded by a status check, change that check to include `"late"`. Read the surrounding lines to match exactly.)

- [ ] **Step 4: Typecheck + lint**

Run: `cd apps/web && npm run type-check && npm run lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/(school)/admin/dashboard/page.tsx" "apps/web/app/(school)/principal/dashboard/page.tsx"
git commit -m "fix(web): count late as present in admin + principal attendance aggregates"
```

---

## Task 5: Student attendance tab — per-session aggregation (the real bug)

**Files:**
- Modify: `app/(school)/admin/students/[id]/student-attendance-tab.tsx`

- [ ] **Step 1: Fetch session and aggregate by (date, session), not by date**

Replace the query + stats block (lines ~20-33) with:

```tsx
    .from("attendance_records")
    .select("date, status, session")
    .eq("student_id", studentId)
    .gte("date", from)
    .lte("date", to);

  type Rec = { date: string; status: string; session: string };
  const rows = (records ?? []) as Rec[];

  const isPresent = (s: string) => s === "present" || s === "late";
  const present = rows.filter((r) => r.status === "present").length;
  const absent = rows.filter((r) => r.status === "absent").length;
  const late = rows.filter((r) => r.status === "late").length;
  const total = rows.length; // total sessions, not days
  const pct = total > 0 ? Math.round((rows.filter((r) => isPresent(r.status)).length / total) * 100) : 0;

  // Per-day grouping for the calendar (a day may hold FN + AN).
  const dayMap: Record<string, Rec[]> = {};
  for (const r of rows) (dayMap[r.date] ??= []).push(r);
```

- [ ] **Step 2: Update calendar cell coloring for multi-session days**

Replace the `getCellColor`-style function (lines ~40-46, which reads `statusMap[dateStr]`) with logic that uses `dayMap`:

```tsx
  function cellClass(dateStr: string): string {
    const recs = dayMap[dateStr];
    if (!recs || recs.length === 0) return "bg-muted text-muted-foreground";
    const full = recs.find((r) => r.session === "FULL_DAY");
    const status = full ? full.status : recs.every((r) => isPresent(r.status))
      ? "present"
      : recs.some((r) => r.status === "absent")
      ? "absent"
      : "late";
    if (status === "present") return "bg-emerald-500 text-white";
    if (status === "absent") return "bg-rose-500 text-white";
    if (status === "late") return "bg-amber-400 text-white";
    return "bg-muted text-muted-foreground";
  }
```
Update the cell render to call `cellClass(dateStr)` where it previously called the old function. (For a mixed FN-present/AN-absent day this shows the "absent" color as a conservative signal; the per-session detail lives in the mobile parent view.)

- [ ] **Step 3: Typecheck + lint**

Run: `cd apps/web && npm run type-check && npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "apps/web/app/(school)/admin/students/[id]/student-attendance-tab.tsx"
git commit -m "fix(web): session-aware student attendance tab (no date collapse)"
```

---

## Task 6: Verification

**Files:** none (verification task)

- [ ] **Step 1: Full web typecheck + lint + build**

Run: `cd apps/web && npm run type-check && npm run lint`
Expected: clean.

- [ ] **Step 2: Dev-server walkthrough (if feasible)**

Start `pnpm dev` (or `npm run dev` in apps/web) and, on a school subdomain logged in as a teacher:
- Mark attendance full-day → landing shows "Full day marked".
- Switch to Forenoon, mark → full-day link becomes disabled with the hint; landing shows "Forenoon marked".
- As admin/principal, confirm dashboards render a present% that includes late students.
- Open a student's attendance tab for a date with both FN+AN and confirm the day isn't dropped and totals count sessions.
If the dev server / subdomain isn't available, state that verification was typecheck/lint only.

---

## Self-review notes (for the implementer)

- `half_day` is removed from the web form because the DB enum `attendance_status` only has `present|absent|late` — the session model replaces the half-day concept. Saving `half_day` would have errored.
- The student tab bug (date-keyed map collapsing FN+AN) is the highest-value fix here; the dashboard changes are smaller correctness tweaks (count `late` as present, consistent with the mobile metric in §3.3/§4.1).
- No push-send UI on web — that stays a mobile-teacher action (spec §5.1, §6).
- Web teacher marking has no "clear" button in this plan; editing is re-submit (upsert) within the same session, and switching granularity is gated by the mode-lock. A full clear/delete affordance was kept mobile-only to limit scope; if the user wants it on web later, it's a small follow-up.
