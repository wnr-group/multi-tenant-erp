# Attendance Rework + Parent Notifications — Design

**Date:** 2026-06-14
**Status:** Approved (brainstorming complete)

## Goal

Rework attendance capture across the ConnectMySkool ERP to support Full-Day vs FN/AN (forenoon/afternoon) sessions, give teachers clear "already marked?" status plus a recent-trend strip, and add a manual per-student push-notification path to parents of absentees — backed by the first real notification delivery pipeline in the product (Supabase Edge Function) and a parent-facing notifications feed.

## Scope

Everything: mobile teacher (primary), mobile parent, web teacher, web admin/principal dashboards, and a new parent notifications feed. Manual push-send is a mobile-teacher action only.

---

## 1. Database Schema

### 1.1 Session support on `attendance_records`

New migration (`20240001000042_attendance_sessions.sql`):

- New enum `attendance_session`: `FULL_DAY | FN | AN`.
- Add column `session attendance_session NOT NULL DEFAULT 'FULL_DAY'` (existing rows backfill to `FULL_DAY` via the default).
- Drop `UNIQUE(student_id, date)`; add `UNIQUE(student_id, date, session)`.
- Add column `notified_at timestamptz NULL` — stamped when a parent push/in-app notification is sent for that absence row.
- Index `(section_id, date, session)` to support overview counts and the stats strip.

`status` enum unchanged: `present | absent | late`.

### 1.2 Mutual exclusivity (enforced in app, documented invariant)

Per `(student_id, date)`, attendance is marked in **exactly one granularity**: either one `FULL_DAY` row, or up to two rows (`FN` and/or `AN`). The three never mix for the same student-day. This is enforced by the marking UI (mode-lock, §3.2), not a DB constraint — the unique key permits all three, so the UI is the guard and the documented invariant.

### 1.3 Announcement read-tracking

New migration (`20240001000043_announcements_seen.sql`):

- Add `announcements_seen_at timestamptz NULL` to `profiles`.
- Unread announcement count for a parent = announcements visible to them (school-wide or targeted to their scope) with `created_at > announcements_seen_at` (NULL `seen_at` ⇒ all count as unread).

### 1.4 `notifications` table

No schema change. Existing columns (`user_id`, `is_read`, `title`, `body`, `type`, `school_id`, `created_at`) are sufficient. New `type` value used: `attendance_absence`.

---

## 2. Notification Delivery Pipeline (new)

### 2.1 Supabase Edge Function `send-attendance-notification`

- **Location:** `supabase/functions/send-attendance-notification/`.
- **Auth model:** caller (mobile teacher) sends their user JWT in `Authorization`. Function verifies the JWT → teacher `user_id`.
- **Input:** a single `attendance_record` ID (one tap = one student).
- **Server-side validation (fail-closed):**
  1. Load the attendance row by ID with a service-role client.
  2. Re-check the teacher is class-teacher for that row's `section_id` for the active academic year (via `section_assignments`). Reject otherwise.
  3. Confirm `status = 'absent'` (never push for present/late).
  4. Resolve parent: `student_profiles.parent_profile_id` → `profiles`. If NULL → reject with "no parent linked".
- **Send + record:**
  - Always insert an in-app `notifications` row (`type = 'attendance_absence'`, `user_id` = parent profile id, `school_id`).
  - If parent has a `push_token`, call Expo Push API.
  - Stamp `notified_at` on the attendance row.
- **Stale token handling:** on Expo `DeviceNotRegistered` receipt, clear that `profiles.push_token` (set NULL). In-app row still written. No retry queue.
- **Payload:** title = school name; body = `"{StudentName} was marked absent for the {forenoon|afternoon|full day} session on {DD Mon}."`
- **Deployment note:** this is the **first edge function in the repo** (none exist today). Plan must cover: `supabase/functions/` scaffolding, local serving (`supabase functions serve`), the function URL exposed to mobile (e.g. `EXPO_PUBLIC_SUPABASE_URL` + `/functions/v1/...`, reachable via `10.0.2.2` on the Android emulator), and the Expo Push API call (no extra credentials needed — Expo accepts the push token directly).

### 2.2 Per-row outcome → three-state UI

The function returns one of: `sent` (push delivered), `recorded_no_app` (in-app saved, parent has no token), `error`. `notified_at` is stamped for both `sent` and `recorded_no_app`.

---

## 3. Mobile Teacher Flow

### 3.1 Class overview screen

- Lists **only sections the teacher is class-teacher for** (`section_assignments`), RLS as backstop.
- Top controls: a **Full-Day / FN / AN** session selector and a **date** picker. (The reference app's "Regular" type dropdown is dropped — YAGNI.)
- Each class row shows `marked / total` for the **selected session + date** (completion, not present-count):
  - `NA / N` when nothing marked for that session.
  - `K / N` partial, `N / N` complete.
  - If the section is already marked in the **other** granularity for that date, show a small mode tag (e.g. `FN·AN` or `Full-day`) instead of a misleading `NA`.

### 3.2 Class marking screen

- Header: session selector + date + **marked-status badge** ("Marked ✓" / "Not marked") + the **last-7-marked-days present% strip** for this section.
- **Mode-lock:** when opening a section+date:
  - Nothing marked → all three modes enabled; first submit fixes the mode.
  - `FULL_DAY` rows exist → FN/AN disabled (hint "Marked as full-day").
  - FN/AN rows exist → `FULL_DAY` disabled (hint "Marked by session").
- Per-student 3-state toggle: **present / absent / late** (unchanged statuses).
- **Submit** upserts all rows for the selected session+date (`onConflict (student_id, date, session)`).
- **Clear & re-mark:** confirm-then-delete all rows for that section+date in the marked mode (re-enables all modes). Same-mode edits are plain upserts — no clear needed. Already-sent notifications persist (a push can't be un-sent).
- **Send icon (post-submit, absent rows only):**
  - Hidden/disabled until the row is persisted ("Submit to save first").
  - For an `absent` row with a persisted record: tappable → calls the edge function with that record ID.
  - Disabled with "No parent linked" when `parent_profile_id` is NULL.
  - Reflects three states after tap: `sent ✓`, muted "recorded, app not installed", or error.
  - Not shown for `present` or `late`.

### 3.3 Stats strip metric

- Last **7 distinct dates that have any attendance row** for the section (no holiday calendar exists; this naturally skips non-school days).
- Per-day % = `(present + late) rows / total marked rows that day`. FN+AN days blend by counting all session rows. Late counts as present. Unmarked days render faint/empty (not 0%).

---

## 4. Mobile Parent Flow

### 4.1 Attendance calendar (`(parent)/attendance.tsx`)

- Monthly calendar retained.
- Full-day-marked day → single solid color.
- FN/AN day → split cell (FN color + AN color); tap shows "FN: Present, AN: Absent".
- Monthly % = `(present + late) sessions / total marked sessions` (consistent with teacher strip; no half-day semantics).

### 4.2 Notifications feed (new, in parent "More" menu)

- `(parent)/more.tsx` is a section state-machine. Add a `"notifications"` section: new `ListItem` (icon `notifications-outline`, placed above Discipline), a `loadNotifications()`, and a render block.
- Lists `notifications` rows for `user_id = me`, newest first; unread (`is_read = false`) styled distinctly.
- Opening the section marks rows read (`is_read = true`).
- This is where pushes recorded while the app was uninstalled appear after (re)install.

### 4.3 Unread badges

- **Notifications unread** = `count(*) where user_id = me and is_read = false`.
- **Announcements unseen** = announcements with `created_at > profiles.announcements_seen_at` (cleared by setting `announcements_seen_at = now()` when the Announcements section opens).
- Both badges shown on their respective rows inside More.
- **Combined badge on the "More" bottom tab** = notifications-unread + announcements-unseen (Expo Router `tabBarBadge`).
- Counts fetched in a shared parent-layout location and passed down; refreshed on tab/screen focus (no realtime subscription for now).

---

## 5. Web

### 5.1 Web teacher attendance (parity)

- Bring the full new marking model to `apps/web/app/(school)/teacher/attendance/`: FN/AN session selector, marked-status clarity, mode-lock, clear/edit, and the 7-day strip.
- **No push-send UI on web** (mobile-teacher action only).

### 5.2 Admin/principal dashboards (session-correctness only)

- Update existing read-only aggregates (`admin/dashboard/attendance-chart.tsx`, `principal/dashboard/class-attendance-chart.tsx`, `admin/students/[id]/student-attendance-tab.tsx`) to be **session-aware** so FN+AN is not double-counted as two days. Metric: `(present + late) sessions / total marked sessions`.
- No new marking features for admin/principal.

---

## 6. Out of Scope (YAGNI)

- Web bell-icon wiring; teacher notifications feed.
- Push deep-linking (tapping a system push opens the app to home; the message is already in the feed).
- Auto-notify-all / batch notifications (manual per-student only).
- Per-announcement read tracking (timestamp-based unread count instead).
- Attendance type dropdown ("Regular/Exam/Event").
- Notification retry queue.
- Holiday/working-day calendar.

---

## 7. Key Invariants & Trade-offs

- **One granularity per student-day** — UI-enforced, documented invariant; keeps reporting unambiguous.
- **Server derives recipients** — client sends record IDs, never parent IDs; edge function re-validates section authorization fail-closed.
- **Notifications are append-only truth** — in-app row always written even with no push token, so messages survive app reinstall; pushes are never un-sent on clear/edit.
- **Pragmatic "school days"** — defined by presence of attendance rows, avoiding a holiday-calendar dependency.
