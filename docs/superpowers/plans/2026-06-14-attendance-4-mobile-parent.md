# Attendance Rework — Plan 4: Mobile Parent Flow

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the parent attendance calendar session-aware (split FN/AN day cells + tap detail), add a Notifications feed inside the parent "More" menu (the home for absence pushes, survives reinstall), and surface unread badges for notifications and announcements — combined onto the parent "More" bottom-tab.

**Architecture:** A small shared counts provider in the parent layout fetches unread notifications + unseen announcements and exposes a refresh; the More-tab badge and the in-menu row badges read from it. The Notifications feed and Announcements seen-tracking are added to the existing `(parent)/more.tsx` section state-machine. The calendar gains per-session aggregation keyed on `(date, session)`.

**Tech Stack:** React Native (Expo SDK 55), expo-router, `@supabase/supabase-js`.

**Spec:** `docs/superpowers/specs/2026-06-14-attendance-rework-design.md` §4.

**Depends on:** Plan 1 (session column, `announcements_seen_at`, `notifications_update` RLS).

---

## Context for the implementer

- Parent tabs are defined in `apps/mobile/app/(parent)/_layout.tsx` (Home, Attendance, Academics, Fees, More). It already imports `useSafeAreaInsets`. `Tabs.Screen` accepts `options={{ tabBarBadge: <number|string> }}`.
- `apps/mobile/app/(parent)/more.tsx` is a **section state-machine**: a `Section` union type (`"menu" | "announcements" | "discipline" | "feedback-teacher" | "feedback-management" | "profile"`), a `section` state, `navigate(s)`, a `sectionTitle` map, and inline render blocks. Add `"notifications"` to this pattern — do NOT create a new route.
- The More menu rows are `<ListItem icon title subtitle onPress />` (see more.tsx:399-403).
- `useActiveContext()` (`apps/mobile/lib/active-context.tsx`) gives `studentId` (a `student_profiles.id`) and the parent's `students`. The logged-in parent's `auth.uid()` is the `notifications.user_id`.
- `notifications` rows: `id, user_id, title, body, type, is_read, created_at`. Plan 1 added the UPDATE policy so a parent can set `is_read`.
- Announcements: `announcements` (`id, title, content, created_at`, school-scoped via RLS). Unread = `created_at > profiles.announcements_seen_at` (NULL ⇒ all unread). Clearing = set `announcements_seen_at = now()` on the parent's `profiles` row when the Announcements section opens.
- Parent attendance calendar: `apps/mobile/app/(parent)/attendance.tsx` currently selects `date, status` and keys a `statusMap` by `date`. It must now also select `session` and aggregate per day.
- Theme keys: `background, border, danger, primary, primaryLight, success, surface, textMuted, textPrimary, textSecondary, warning`.
- No test framework: verify via `npx tsc --noEmit` and emulator.

---

## File Structure

- Create: `apps/mobile/lib/parent-counts.tsx` — context provider exposing `{ unreadNotifications, unseenAnnouncements, refresh }`.
- Modify: `apps/mobile/app/(parent)/_layout.tsx` — wrap in provider, add combined `tabBarBadge` on More, refresh on focus.
- Modify: `apps/mobile/app/(parent)/more.tsx` — add Notifications section + row badge, Announcements row badge + seen-tracking.
- Modify: `apps/mobile/app/(parent)/attendance.tsx` — session-aware calendar.

---

## Task 1: Parent counts provider

**Files:**
- Create: `apps/mobile/lib/parent-counts.tsx`

- [ ] **Step 1: Write the provider**

```tsx
import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { supabase } from "./supabase";

interface ParentCounts {
  unreadNotifications: number;
  unseenAnnouncements: number;
  refresh: () => Promise<void>;
}

const Ctx = createContext<ParentCounts>({
  unreadNotifications: 0,
  unseenAnnouncements: 0,
  refresh: async () => {},
});

export function ParentCountsProvider({ children }: { children: ReactNode }) {
  const [unreadNotifications, setUnread] = useState(0);
  const [unseenAnnouncements, setUnseen] = useState(0);

  const refresh = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUnread(0); setUnseen(0); return; }

    const [notifRes, profRes] = await Promise.all([
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false),
      supabase
        .from("profiles")
        .select("announcements_seen_at")
        .eq("id", user.id)
        .maybeSingle(),
    ]);
    setUnread(notifRes.count ?? 0);

    let annQuery = supabase
      .from("announcements")
      .select("id", { count: "exact", head: true });
    const seenAt = profRes.data?.announcements_seen_at;
    if (seenAt) annQuery = annQuery.gt("created_at", seenAt);
    const { count: annCount } = await annQuery;
    setUnseen(annCount ?? 0);
  }, []);

  return (
    <Ctx.Provider value={{ unreadNotifications, unseenAnnouncements, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useParentCounts() {
  return useContext(Ctx);
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/lib/parent-counts.tsx
git commit -m "feat(mobile): parent unread-counts provider"
```

---

## Task 2: Wire provider + combined More-tab badge

**Files:**
- Modify: `apps/mobile/app/(parent)/_layout.tsx`

- [ ] **Step 1: Read the current layout**

Run: `cat "apps/mobile/app/(parent)/_layout.tsx"`
Note the existing imports, `useSafeAreaInsets`, and the `<Tabs>` with five `<Tabs.Screen>` entries.

- [ ] **Step 2: Wrap the Tabs in the provider and add the badge**

Edit `(parent)/_layout.tsx`:
1. Add imports:
```tsx
import { useEffect } from "react";
import { useFocusEffect } from "expo-router";
import { ParentCountsProvider, useParentCounts } from "../../lib/parent-counts";
```
2. Rename the existing default export function body into an inner `ParentTabs` component, and make the default export wrap it:
```tsx
export default function ParentLayout() {
  return (
    <ParentCountsProvider>
      <ParentTabs />
    </ParentCountsProvider>
  );
}
```
3. In `ParentTabs` (the former layout body), pull counts and refresh on mount:
```tsx
const { unreadNotifications, unseenAnnouncements, refresh } = useParentCounts();
const totalBadge = unreadNotifications + unseenAnnouncements;
useEffect(() => { refresh(); }, [refresh]);
```
4. On the **More** `<Tabs.Screen>`, add to its `options`:
```tsx
tabBarBadge: totalBadge > 0 ? totalBadge : undefined,
```

- [ ] **Step 3: Typecheck**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "apps/mobile/app/(parent)/_layout.tsx"
git commit -m "feat(mobile): combined unread badge on parent More tab"
```

---

## Task 3: Notifications feed + Announcements seen-tracking in More

**Files:**
- Modify: `apps/mobile/app/(parent)/more.tsx`

- [ ] **Step 1: Extend the Section type and state**

In `more.tsx`:
1. Add `"notifications"` to the `Section` union (line 15):
```tsx
type Section = "menu" | "notifications" | "announcements" | "discipline" | "feedback-teacher" | "feedback-management" | "profile";
```
2. Add imports near the top:
```tsx
import { useParentCounts } from "../../lib/parent-counts";
```
3. Add state + counts inside the component:
```tsx
const { unreadNotifications, unseenAnnouncements, refresh: refreshCounts } = useParentCounts();
const [notifications, setNotifications] = useState<{ id: string; title: string; body: string; created_at: string; is_read: boolean }[]>([]);
```

- [ ] **Step 2: Add load + read-marking functions**

Add these functions in the component body:
```tsx
async function loadNotifications() {
  setLoading(true);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { setNotifications([]); setLoading(false); return; }
  const { data } = await supabase
    .from("notifications")
    .select("id, title, body, created_at, is_read")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  setNotifications(data ?? []);
  // Mark all unread as read.
  const unreadIds = (data ?? []).filter((n) => !n.is_read).map((n) => n.id);
  if (unreadIds.length > 0) {
    await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
    await refreshCounts();
  }
  setLoading(false);
}

async function markAnnouncementsSeen() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("profiles").update({ announcements_seen_at: new Date().toISOString() }).eq("id", user.id);
  await refreshCounts();
}
```

- [ ] **Step 3: Hook the navigation + title map**

1. In `navigate(s)`, add:
```tsx
if (s === "notifications") loadNotifications();
if (s === "announcements") { loadAnnouncements(); markAnnouncementsSeen(); }
```
(The existing `if (s === "announcements") loadAnnouncements();` line should be replaced by the combined line above.)
2. In `sectionTitle`, add: `notifications: "Notifications",`.

- [ ] **Step 4: Add the menu rows with badges**

In the menu render (the `<View style={{ gap: 8 }}>` block, ~line 398), add a Notifications row first and a badge to Announcements. `ListItem` may not support a badge prop — render the count as part of the `subtitle` to avoid changing the component:
```tsx
<ListItem
  icon="notifications-outline"
  title="Notifications"
  subtitle={unreadNotifications > 0 ? `${unreadNotifications} unread` : "Alerts & updates"}
  onPress={() => navigate("notifications")}
/>
<ListItem
  icon="megaphone-outline"
  title="Announcements"
  subtitle={unseenAnnouncements > 0 ? `${unseenAnnouncements} new` : "School news & updates"}
  onPress={() => navigate("announcements")}
/>
```
(Remove the old standalone Announcements `<ListItem>` so it isn't duplicated.)

- [ ] **Step 5: Add the notifications render block**

In the `section !== "menu"` detail view, add alongside the other section blocks:
```tsx
{section === "notifications" && (
  loading ? [0,1,2].map(i => <SkeletonCard key={i} />) :
  notifications.length === 0 ? (
    <Text style={{ textAlign: "center", color: theme.textMuted, fontFamily: "Inter_400Regular", paddingVertical: 32 }}>No notifications yet</Text>
  ) : notifications.map((n) => (
    <View key={n.id} style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 16, gap: 6, borderLeftWidth: n.is_read ? 0 : 3, borderLeftColor: theme.primary }}>
      <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: theme.textPrimary }}>{n.title}</Text>
      <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: theme.textSecondary }}>{n.body}</Text>
      <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: theme.textMuted }}>{new Date(n.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</Text>
    </View>
  ))
)}
```
(Ensure `SkeletonCard` is imported — the file already imports `SkeletonCard`.)

- [ ] **Step 6: Add notifications to the onRefresh handler**

In `onRefresh`, add: `if (section === "notifications") await loadNotifications();`

- [ ] **Step 7: Typecheck**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add "apps/mobile/app/(parent)/more.tsx"
git commit -m "feat(mobile): parent notifications feed + announcement seen-tracking"
```

---

## Task 4: Session-aware parent calendar

**Files:**
- Modify: `apps/mobile/app/(parent)/attendance.tsx`

- [ ] **Step 1: Update the record type and query**

1. Change the interface:
```tsx
interface AttendanceRecord { date: string; status: "present" | "absent" | "late"; session: "FULL_DAY" | "FN" | "AN" }
```
2. In `loadAttendance`, select `session` too:
```tsx
const { data } = await supabase.from("attendance_records").select("date, status, session").eq("student_id", studentId).order("date");
```

- [ ] **Step 2: Aggregate per day and compute session-based %**

Replace the `present/absent/total/pct/statusMap` block (lines ~48-52) with:
```tsx
const isPresent = (s: string) => s === "present" || s === "late";
const presentSessions = monthRecords.filter((r) => isPresent(r.status)).length;
const totalSessions = monthRecords.length;
const pct = totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 0;

// Group sessions by date for the calendar cell rendering.
const dayMap: Record<string, AttendanceRecord[]> = {};
monthRecords.forEach((r) => { (dayMap[r.date] ??= []).push(r); });
```

- [ ] **Step 3: Render split cells for FN/AN days**

Replace `getCellColor` and the calendar cell render with a session-aware version. Add a helper:
```tsx
function statusColor(status: string): string {
  if (status === "present") return theme.success;
  if (status === "absent") return theme.danger;
  if (status === "late") return theme.warning;
  return theme.border;
}

function cellSessions(day: number | null): AttendanceRecord[] {
  if (!day) return [];
  const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return dayMap[dateStr] ?? [];
}
```
Then in the calendar cell map, replace the single-color `<View>` with:
```tsx
{day ? (() => {
  const sessions = cellSessions(day);
  const fullDay = sessions.find((s) => s.session === "FULL_DAY");
  const fn = sessions.find((s) => s.session === "FN");
  const an = sessions.find((s) => s.session === "AN");
  if (sessions.length === 0) {
    return (
      <View style={{ flex: 1, borderRadius: 6, backgroundColor: theme.border, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 11, color: theme.textMuted }}>{day}</Text>
      </View>
    );
  }
  if (fullDay) {
    return (
      <View style={{ flex: 1, borderRadius: 6, backgroundColor: statusColor(fullDay.status), alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 11, color: "#fff" }}>{day}</Text>
      </View>
    );
  }
  // FN/AN split: left half FN, right half AN.
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => alert(`FN: ${fn?.status ?? "—"}\nAN: ${an?.status ?? "—"}`)}
      style={{ flex: 1, borderRadius: 6, overflow: "hidden", flexDirection: "row" }}
    >
      <View style={{ flex: 1, backgroundColor: fn ? statusColor(fn.status) : theme.border }} />
      <View style={{ flex: 1, backgroundColor: an ? statusColor(an.status) : theme.border }} />
      <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 11, color: "#fff" }}>{day}</Text>
      </View>
    </TouchableOpacity>
  );
})() : null}
```
(The summary line under the % can stay; update its text to use the new session counts: `{presentSessions} present · {totalSessions - presentSessions} other · {totalSessions} sessions`.)

- [ ] **Step 4: Typecheck**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: no errors. (`alert` is available in React Native via the global; if tsc complains, use `Alert.alert("Attendance", \`FN: ...\`)` and import `Alert` from `react-native`.)

- [ ] **Step 5: Commit**

```bash
git add "apps/mobile/app/(parent)/attendance.tsx"
git commit -m "feat(mobile): session-aware parent attendance calendar"
```

---

## Task 5: Manual emulator verification

**Files:** none (verification task)

- [ ] **Step 1: Exercise the parent flow**

With the emulator running (`npx expo start -c`), logged in as a parent:
- More tab shows a numeric badge = unread notifications + unseen announcements.
- Open More → Notifications: absence messages appear (including any written while the app was uninstalled). Opening clears the unread count and the badge drops.
- Open More → Announcements: badge clears after viewing (seen timestamp set).
- Attendance: a full-day-marked day shows a solid color; an FN/AN day shows a split cell; tapping a split day shows "FN: …, AN: …". The monthly % reflects present sessions / total sessions.

- [ ] **Step 2: Fix any issues and re-verify, or note emulator was unavailable**

---

## Self-review notes (for the implementer)

- The combined tab badge intentionally sums both counts; the per-row subtitles inside More disambiguate which is which (spec §4.3).
- Announcements use a "seen timestamp" (not per-row reads) — opening the list marks everything seen; a newly posted announcement reappears in the count correctly.
- `ListItem` badge is rendered via `subtitle` text to avoid modifying the shared component (YAGNI).
- The calendar's split-cell only triggers for FN/AN days; full-day days keep the original single-color look, so existing data renders unchanged.
