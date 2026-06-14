# Attendance Rework — Plan 3: Mobile Teacher Flow

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the homeroom-only mobile teacher attendance screen with a two-level flow: (1) an overview listing the teacher's assigned sections with marked/total counts for a selected date + session, and (2) a per-class marking screen with a Full-Day/FN/AN selector (mode-locked to whatever's already marked), present/absent/late toggles, a marked-status badge, a last-7-marked-days present% strip, a clear-and-re-mark action, and (after submit) a per-absent-student send icon that calls the notification edge function.

**Architecture:** Expo Router. A shared data helper centralizes session-aware queries (marked counts, existing rows, stats strip). The `(teacher)/attendance.tsx` route becomes the overview; a new `(teacher)/attendance/[sectionId].tsx` route is the marking screen. Reuses `useTeacherContext` (sections the teacher is class-teacher for) and `sendAbsenceNotification` from Plan 2.

**Tech Stack:** React Native (Expo SDK 55), expo-router, `@supabase/supabase-js`, expo-haptics.

**Spec:** `docs/superpowers/specs/2026-06-14-attendance-rework-design.md` §3.

**Depends on:** Plan 1 (session column, `get_active_academic_year`) and Plan 2 (`sendAbsenceNotification`).

---

## Context for the implementer

- The current screen `apps/mobile/app/(teacher)/attendance.tsx` marks only the homeroom section, writes `onConflict: "student_id,date"`, and has no session/date selector. It is being substantially rewritten; read it first to reuse its student-loading and toggle patterns.
- `useTeacherContext()` (`apps/mobile/lib/teacherContext.tsx`) provides `sections: SectionInfo[]` (each `{ id, label, shortLabel, classId, isHomeroom }`), `userId`, `schoolId`, `ready`. **For this rework, "my sections" = sections where `isHomeroom` is true** (i.e. the teacher is class-teacher via `section_assignments`). Filter `sections.filter(s => s.isHomeroom)`; if none, show empty state.
- Students per section: `student_enrollments` joined to `student_profiles`, filtered `section_id` + `is_active=true`, ordered by `roll_number` (see current `loadStudents`).
- `attendance_records` now has `session` (`FULL_DAY|FN|AN`), `notified_at`. Upsert conflict target is now `"student_id,date,session"`.
- Theme keys available: `background, border, danger, primary, primaryLight, success, surface, textMuted, textPrimary, textSecondary, warning`. Color-with-alpha pattern used in the codebase: `theme.success + "1A"`.
- `StatusBadge` component (`components/StatusBadge.tsx`) supports `present|absent|late` variants.
- `PrimaryButton`, `Avatar`, `SkeletonCard`, `SafeAreaView` (from `react-native-safe-area-context`) are the existing building blocks.
- Date handling: the current screen uses `new Date().toISOString().split("T")[0]` for "today" (YYYY-MM-DD). Keep that format as the canonical date string.
- No test framework. Verify via `npx tsc --noEmit` and manual emulator checks (the user runs the emulator).

---

## File Structure

- Create: `apps/mobile/lib/attendance.ts` — session type, session labels, and data helpers (`fetchMarkedCounts`, `fetchSectionAttendance`, `fetchRecentStats`, `clearAttendance`).
- Rewrite: `apps/mobile/app/(teacher)/attendance.tsx` — overview (section list with marked/total + session/date selectors).
- Create: `apps/mobile/app/(teacher)/attendance/[sectionId].tsx` — marking screen.
- Create: `apps/mobile/components/SessionSelector.tsx` — Full-Day/FN/AN segmented control with disabled states.

---

## Task 1: Attendance data helpers

**Files:**
- Create: `apps/mobile/lib/attendance.ts`

- [ ] **Step 1: Write the helper module**

```ts
import { supabase } from "./supabase";

export type AttendanceSession = "FULL_DAY" | "FN" | "AN";
export type AttendanceStatus = "present" | "absent" | "late";

export const SESSION_LABELS: Record<AttendanceSession, string> = {
  FULL_DAY: "Full Day",
  FN: "Forenoon",
  AN: "Afternoon",
};

export interface MarkedCount {
  sectionId: string;
  total: number;
  marked: number;
  /** The granularity actually present for this section+date, if any. */
  existingMode: "FULL_DAY" | "SESSION" | null;
}

export interface SectionAttendanceRow {
  recordId: string | null;
  studentId: string;
  fullName: string;
  rollNumber: string;
  status: AttendanceStatus;
  notifiedAt: string | null;
  hasParent: boolean;
}

/** Count active enrolled students vs. marked rows for a section/date/session. */
export async function fetchMarkedCount(
  sectionId: string,
  date: string,
  session: AttendanceSession,
): Promise<MarkedCount> {
  const [enrollRes, recRes] = await Promise.all([
    supabase
      .from("student_enrollments")
      .select("student_profile_id", { count: "exact", head: false })
      .eq("section_id", sectionId)
      .eq("is_active", true),
    supabase
      .from("attendance_records")
      .select("session")
      .eq("section_id", sectionId)
      .eq("date", date),
  ]);

  const total = (enrollRes.data ?? []).length;
  const rows = recRes.data ?? [];
  const marked = rows.filter((r: any) => r.session === session).length;
  const hasFullDay = rows.some((r: any) => r.session === "FULL_DAY");
  const hasSession = rows.some((r: any) => r.session === "FN" || r.session === "AN");
  const existingMode: MarkedCount["existingMode"] =
    hasFullDay ? "FULL_DAY" : hasSession ? "SESSION" : null;

  return { sectionId, total, marked, existingMode };
}

/** Load the roster for a section with any existing marks for date+session. */
export async function fetchSectionAttendance(
  sectionId: string,
  date: string,
  session: AttendanceSession,
): Promise<SectionAttendanceRow[]> {
  const [studentRes, recRes] = await Promise.all([
    supabase
      .from("student_enrollments")
      .select("roll_number, student_profile_id, student_profiles(id, full_name, admission_number, parent_profile_id)")
      .eq("section_id", sectionId)
      .eq("is_active", true)
      .order("roll_number"),
    supabase
      .from("attendance_records")
      .select("id, student_id, status, notified_at")
      .eq("section_id", sectionId)
      .eq("date", date)
      .eq("session", session),
  ]);

  const recMap = new Map<string, { id: string; status: AttendanceStatus; notified_at: string | null }>();
  (recRes.data ?? []).forEach((r: any) =>
    recMap.set(r.student_id, { id: r.id, status: r.status, notified_at: r.notified_at }),
  );

  return (studentRes.data ?? []).map((s: any, idx: number) => {
    const p = s.student_profiles;
    const sid = p?.id ?? s.student_profile_id;
    const existing = recMap.get(sid);
    return {
      recordId: existing?.id ?? null,
      studentId: sid,
      fullName: p?.full_name ?? "Student",
      rollNumber: s.roll_number || p?.admission_number || String(idx + 1),
      status: existing?.status ?? "present",
      notifiedAt: existing?.notified_at ?? null,
      hasParent: !!p?.parent_profile_id,
    };
  });
}

/** Per-day present% for the last N distinct marked dates of a section. */
export interface DayStat { date: string; pct: number }

export async function fetchRecentStats(
  sectionId: string,
  days = 7,
): Promise<DayStat[]> {
  const { data } = await supabase
    .from("attendance_records")
    .select("date, status")
    .eq("section_id", sectionId)
    .order("date", { ascending: false });

  const byDate = new Map<string, { present: number; total: number }>();
  (data ?? []).forEach((r: any) => {
    const agg = byDate.get(r.date) ?? { present: 0, total: 0 };
    agg.total += 1;
    if (r.status === "present" || r.status === "late") agg.present += 1;
    byDate.set(r.date, agg);
  });

  return [...byDate.entries()]
    .slice(0, days)
    .map(([date, a]) => ({ date, pct: a.total ? Math.round((a.present / a.total) * 100) : 0 }))
    .reverse();
}

/** Delete all rows for a section+date in the given granularity. */
export async function clearAttendance(
  sectionId: string,
  date: string,
  mode: "FULL_DAY" | "SESSION",
): Promise<{ error: string | null }> {
  const sessions = mode === "FULL_DAY" ? ["FULL_DAY"] : ["FN", "AN"];
  const { error } = await supabase
    .from("attendance_records")
    .delete()
    .eq("section_id", sectionId)
    .eq("date", date)
    .in("session", sessions);
  return { error: error?.message ?? null };
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/lib/attendance.ts
git commit -m "feat(mobile): add session-aware attendance data helpers"
```

---

## Task 2: SessionSelector component

**Files:**
- Create: `apps/mobile/components/SessionSelector.tsx`

- [ ] **Step 1: Write the segmented control**

```tsx
import { View, Text, TouchableOpacity } from "react-native";
import { useTheme } from "../lib/theme";
import { AttendanceSession, SESSION_LABELS } from "../lib/attendance";

interface Props {
  value: AttendanceSession;
  onChange: (s: AttendanceSession) => void;
  /** Sessions that cannot be selected (mode-lock), with an optional hint. */
  disabled?: Partial<Record<AttendanceSession, string>>;
}

const ORDER: AttendanceSession[] = ["FULL_DAY", "FN", "AN"];

export function SessionSelector({ value, onChange, disabled = {} }: Props) {
  const theme = useTheme();
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: "row", backgroundColor: theme.surface, borderRadius: 12, padding: 4, gap: 4 }}>
        {ORDER.map((s) => {
          const isDisabled = !!disabled[s];
          const active = value === s;
          return (
            <TouchableOpacity
              key={s}
              disabled={isDisabled}
              onPress={() => onChange(s)}
              style={{
                flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: "center",
                backgroundColor: active ? theme.primary : "transparent",
                opacity: isDisabled ? 0.4 : 1,
              }}
            >
              <Text style={{
                fontSize: 13, fontFamily: "Inter_600SemiBold",
                color: active ? "#fff" : theme.textSecondary,
              }}>
                {SESSION_LABELS[s]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {ORDER.filter((s) => disabled[s]).slice(0, 1).map((s) => (
        <Text key={s} style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: theme.textMuted, paddingHorizontal: 4 }}>
          {disabled[s]}
        </Text>
      ))}
    </View>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/components/SessionSelector.tsx
git commit -m "feat(mobile): add SessionSelector segmented control"
```

---

## Task 3: Overview screen (section list with marked/total)

**Files:**
- Rewrite: `apps/mobile/app/(teacher)/attendance.tsx`

- [ ] **Step 1: Replace the file**

```tsx
import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../lib/theme";
import { useTeacherContext } from "../../lib/teacherContext";
import { SessionSelector } from "../../components/SessionSelector";
import { SkeletonCard } from "../../components/Skeleton";
import {
  AttendanceSession, fetchMarkedCount, MarkedCount,
} from "../../lib/attendance";

export default function TeacherAttendanceOverview() {
  const theme = useTheme();
  const router = useRouter();
  const { sections, ready } = useTeacherContext();
  const mySections = sections.filter((s) => s.isHomeroom);
  const [session, setSession] = useState<AttendanceSession>("FULL_DAY");
  const [counts, setCounts] = useState<Record<string, MarkedCount>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const today = new Date().toISOString().split("T")[0];

  const load = useCallback(async () => {
    if (!ready) return;
    setLoading(true);
    const entries = await Promise.all(
      mySections.map((s) => fetchMarkedCount(s.id, today, session)),
    );
    setCounts(Object.fromEntries(entries.map((c) => [c.sectionId, c])));
    setLoading(false);
  }, [ready, session, mySections.map((s) => s.id).join(","), today]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  function badge(c: MarkedCount | undefined): string {
    if (!c) return "—";
    // If marked in the other granularity, show a mode tag instead of false NA.
    if (session === "FULL_DAY" && c.existingMode === "SESSION") return "FN·AN";
    if (session !== "FULL_DAY" && c.existingMode === "FULL_DAY") return "Full-day";
    return c.marked === 0 ? `NA / ${c.total}` : `${c.marked} / ${c.total}`;
  }

  return (
    <SafeAreaView edges={["bottom"]} style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 14 }}>
        <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: theme.textPrimary }}>Attendance</Text>
        <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: theme.textSecondary }}>
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
        </Text>
        <SessionSelector value={session} onChange={setSession} />
      </View>
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 8 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >
        {loading ? (
          [0, 1, 2].map((i) => <SkeletonCard key={i} />)
        ) : mySections.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 56 }}>
            <Text style={{ fontFamily: "Inter_500Medium", color: theme.textMuted, fontSize: 14 }}>
              No classes assigned to you
            </Text>
          </View>
        ) : mySections.map((s) => {
          const c = counts[s.id];
          const complete = c && c.marked === c.total && c.total > 0;
          return (
            <TouchableOpacity
              key={s.id}
              onPress={() => router.push(`/(teacher)/attendance/${s.id}?session=${session}&date=${today}`)}
              style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 }}
              activeOpacity={0.7}
            >
              <Ionicons name="people-outline" size={22} color={theme.primary} />
              <Text style={{ flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold", color: theme.textPrimary }}>{s.label}</Text>
              <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: complete ? theme.success : theme.textSecondary }}>
                {badge(c)}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: no errors. (The route `/(teacher)/attendance/[sectionId]` is created in Task 4; the `router.push` string is fine to typecheck.)

- [ ] **Step 3: Commit**

```bash
git add "apps/mobile/app/(teacher)/attendance.tsx"
git commit -m "feat(mobile): teacher attendance overview with session-aware counts"
```

---

## Task 4: Marking screen (mode-lock, toggle, submit, strip, clear, send)

**Files:**
- Create: `apps/mobile/app/(teacher)/attendance/[sectionId].tsx`

- [ ] **Step 1: Write the marking screen**

```tsx
import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { supabase } from "../../../lib/supabase";
import { useTheme } from "../../../lib/theme";
import { useTeacherContext } from "../../../lib/teacherContext";
import { Avatar } from "../../../components/Avatar";
import { PrimaryButton } from "../../../components/PrimaryButton";
import { StatusBadge } from "../../../components/StatusBadge";
import { SkeletonCard } from "../../../components/Skeleton";
import { SessionSelector } from "../../../components/SessionSelector";
import {
  AttendanceSession, AttendanceStatus, SectionAttendanceRow, DayStat,
  fetchSectionAttendance, fetchRecentStats, fetchMarkedCount, clearAttendance,
} from "../../../lib/attendance";
import { sendAbsenceNotification } from "../../../lib/notifications";

export default function MarkAttendance() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ sectionId: string; session?: string; date?: string }>();
  const sectionId = params.sectionId;
  const date = params.date ?? new Date().toISOString().split("T")[0];
  const { sections, userId, schoolId } = useTeacherContext();
  const section = sections.find((s) => s.id === sectionId) ?? null;

  const [session, setSession] = useState<AttendanceSession>((params.session as AttendanceSession) ?? "FULL_DAY");
  const [rows, setRows] = useState<SectionAttendanceRow[]>([]);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [existingMode, setExistingMode] = useState<"FULL_DAY" | "SESSION" | null>(null);
  const [stats, setStats] = useState<DayStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notifying, setNotifying] = useState<Record<string, boolean>>({});

  const marked = rows.some((r) => r.recordId !== null);

  const load = useCallback(async () => {
    setLoading(true);
    const [roster, count, recent] = await Promise.all([
      fetchSectionAttendance(sectionId, date, session),
      fetchMarkedCount(sectionId, date, session),
      fetchRecentStats(sectionId, 7),
    ]);
    setRows(roster);
    setStatuses(Object.fromEntries(roster.map((r) => [r.studentId, r.status])));
    setExistingMode(count.existingMode);
    setStats(recent);
    setLoading(false);
  }, [sectionId, date, session]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await load(); setRefreshing(false);
  }, [load]);

  // Mode-lock: disable the granularity not already in use.
  const disabled: Partial<Record<AttendanceSession, string>> = {};
  if (existingMode === "FULL_DAY") {
    disabled.FN = "Marked as full-day for this date";
    disabled.AN = "Marked as full-day for this date";
  } else if (existingMode === "SESSION") {
    disabled.FULL_DAY = "Marked by session (FN/AN) for this date";
  }

  function cycleStatus(studentId: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStatuses((prev) => {
      const cur = prev[studentId] ?? "present";
      const next: AttendanceStatus = cur === "present" ? "absent" : cur === "absent" ? "late" : "present";
      return { ...prev, [studentId]: next };
    });
  }

  async function submit() {
    if (!userId || !schoolId) return;
    setSaving(true);
    const records = rows.map((r) => ({
      student_id: r.studentId,
      section_id: sectionId,
      school_id: schoolId,
      date,
      session,
      status: statuses[r.studentId] ?? "present",
      marked_by: userId,
    }));
    const { error } = await supabase
      .from("attendance_records")
      .upsert(records, { onConflict: "student_id,date,session" });
    setSaving(false);
    if (error) { Alert.alert("Error", error.message); return; }
    await load(); // refresh so recordIds + send icons appear
    Alert.alert("Saved", "Attendance recorded.");
  }

  function confirmClear() {
    const mode = existingMode;
    if (!mode) return;
    Alert.alert(
      "Clear attendance?",
      "This deletes the saved attendance for this date so you can re-mark. Notifications already sent will not be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear", style: "destructive",
          onPress: async () => {
            const { error } = await clearAttendance(sectionId, date, mode);
            if (error) { Alert.alert("Error", error); return; }
            await load();
          },
        },
      ],
    );
  }

  async function notify(row: SectionAttendanceRow) {
    if (!row.recordId) return;
    setNotifying((p) => ({ ...p, [row.studentId]: true }));
    const result = await sendAbsenceNotification(row.recordId);
    setNotifying((p) => ({ ...p, [row.studentId]: false }));
    if (result === "sent") Alert.alert("Sent", "Parent notified.");
    else if (result === "recorded_no_app") Alert.alert("Recorded", "Saved to parent's inbox (app not installed).");
    else Alert.alert("Failed", "Could not notify. Try again.");
    await load();
  }

  return (
    <SafeAreaView edges={["bottom"]} style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 12 }}>
          <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: theme.textPrimary }}>
            {section?.label ?? "Class"}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ backgroundColor: marked ? theme.success + "1A" : theme.warning + "1A", borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: marked ? theme.success : theme.warning }}>
                {marked ? "Marked" : "Not marked"}
              </Text>
            </View>
            <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: "Inter_400Regular" }}>
              {new Date(date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </Text>
          </View>
          <SessionSelector value={session} onChange={setSession} disabled={disabled} />
          {/* Last-7-marked-days strip */}
          {stats.length > 0 && (
            <View style={{ flexDirection: "row", gap: 6, alignItems: "flex-end", height: 44 }}>
              {stats.map((d) => (
                <View key={d.date} style={{ flex: 1, alignItems: "center", gap: 3 }}>
                  <View style={{ width: "100%", height: Math.max(4, (d.pct / 100) * 32), borderRadius: 3, backgroundColor: d.pct >= 75 ? theme.success : d.pct >= 50 ? theme.warning : theme.danger }} />
                  <Text style={{ fontSize: 9, color: theme.textMuted }}>{d.pct}%</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingTop: 12, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        >
          {loading ? (
            [0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)
          ) : rows.map((row) => {
            const status = statuses[row.studentId] ?? "present";
            const showSend = marked && row.recordId && status === "absent";
            return (
              <View key={row.studentId} style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
                <TouchableOpacity onPress={() => cycleStatus(row.studentId)} activeOpacity={0.7} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Avatar name={row.fullName} size={44} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: theme.textPrimary }}>{row.fullName}</Text>
                    <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: theme.textSecondary }}>Roll #{row.rollNumber}</Text>
                  </View>
                  <StatusBadge variant={status} />
                </TouchableOpacity>
                {showSend ? (
                  !row.hasParent ? (
                    <Ionicons name="person-remove-outline" size={20} color={theme.textMuted} />
                  ) : (
                    <TouchableOpacity disabled={notifying[row.studentId]} onPress={() => notify(row)} style={{ padding: 4 }}>
                      <Ionicons
                        name={row.notifiedAt ? "checkmark-done" : "paper-plane"}
                        size={20}
                        color={row.notifiedAt ? theme.success : theme.primary}
                      />
                    </TouchableOpacity>
                  )
                ) : null}
              </View>
            );
          })}
          {marked && existingMode && (
            <TouchableOpacity onPress={confirmClear} style={{ alignItems: "center", paddingVertical: 14 }}>
              <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: theme.danger }}>Clear &amp; re-mark</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {!loading && rows.length > 0 && (
          <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: theme.background, borderTopWidth: 1, borderTopColor: theme.border }}>
            <PrimaryButton label={marked ? "Update Attendance" : `Submit · ${rows.length} students`} onPress={submit} loading={saving} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "apps/mobile/app/(teacher)/attendance/[sectionId].tsx"
git commit -m "feat(mobile): teacher marking screen with FN/AN, strip, clear, send"
```

---

## Task 5: Manual emulator verification

**Files:** none (verification task)

- [ ] **Step 1: Run the app and exercise the flow**

The user runs the emulator (`cd apps/mobile && npx expo start -c`). Walk through:
- Overview lists only the teacher's assigned (homeroom) sections with `NA / N` initially.
- Switching Full-Day → FN changes the counts; a section marked in the other mode shows `FN·AN` / `Full-day` instead of `NA`.
- Open a class: status badge shows "Not marked"; toggling cycles present→absent→late.
- Submit → badge flips to "Marked"; absent rows show the paper-plane icon; rows whose student has no parent show the muted person-remove icon.
- Tap send on an absent row with a parent → alert (sent / recorded) and the icon becomes the green checkmark.
- After marking FN, reopen and confirm Full-Day is disabled with the hint; "Clear & re-mark" deletes and re-enables all modes.
- The 7-day strip renders bars for recent marked dates.

- [ ] **Step 2: Document any issues found and fix, then re-verify**

If the emulator is unavailable, state explicitly that the flow was verified only by typecheck, not runtime.

---

## Self-review notes (for the implementer)

- `existingMode` is computed from what's actually in the DB for that date — it drives both the mode-lock (disabled sessions) and the overview's mode tag, keeping them consistent.
- The send icon only appears post-submit (`marked && row.recordId`) and only for `absent` rows — matching the spec; the pre-save tooltip case is avoided by simply not rendering an actionable icon until a record exists.
- `clearAttendance` deletes by granularity (`FULL_DAY` vs both `FN`+`AN`); same-mode edits go through `submit`'s upsert, no clear needed.
- "My sections" = `isHomeroom` sections only (the teacher's `section_assignments`). RLS remains the backstop server-side.
