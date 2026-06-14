# Homework Lifecycle Rework — Plan 4: Mobile Parent

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the parent the engagement side of the loop: the homework list shows the real per-child status (New / Viewed / Done / Reviewed, overdue in red), and tapping a homework opens a detail screen that auto-marks it Viewed, shows attachments (via signed URL), lets the parent Mark as Done (undoable until reviewed), and shows the teacher's rating + comment once reviewed.

**Architecture:** Reuse the shared `lib/homework.ts` from Plan 3, adding parent-side helpers (`loadParentHomework`, `markViewed`, `markDone`, `unmarkDone`, `loadStudentStatus`). The list stays in `(parent)/academics.tsx`; its homework query is extended to LEFT JOIN the student's status. A new detail screen `(parent)/homework/[homeworkId].tsx` is registered as a hidden tab (same `href:null` + nested Stack pattern as the teacher side). A new `StatusBadge` variant set covers the homework states.

**Tech Stack:** Expo Router (nested Stack), React Native, Supabase JS.

**Spec:** `docs/superpowers/specs/2026-06-14-homework-lifecycle-design.md` (UI → Parent Mobile, State machine).

**Depends on:** Plan 1 (RPCs), Plan 2 (bucket), Plan 3 (`lib/homework.ts`).

---

## Context for the implementer

- Parent screens live under `apps/mobile/app/(parent)/`. The tab bar is `(parent)/_layout.tsx` — a `Tabs` navigator wrapped in `ParentCountsProvider`; tabs are `dashboard, attendance, academics, fees, more`.
- **Active child:** `useActiveContext()` (`lib/active-context.tsx`) exposes `studentId` — the currently-selected child's `student_profiles.id`. A parent may have several children and switch between them; all homework queries must use this id.
- **`academics.tsx`** has a `homework` tab (calendar + per-day list). Homework is loaded by `loadHomeworkForMonth(sectionId, year, month)` which sets a `Homework[]` with a FAKE `status`. We replace that status with the real per-student state and make cards tappable.
- **`StatusBadge`** (`components/StatusBadge.tsx`) currently supports `paid|pending|overdue|partial|present|absent|late|unmarked`. We ADD homework variants: `hw_new`, `hw_viewed`, `hw_done`, `hw_reviewed`. The current parent code maps homework to `paid/overdue/pending` — that mapping is replaced.
- **Nested Stack + hidden tab:** mirror the teacher side — a `(parent)/homework/` folder with `_layout.tsx` (Stack) and `[homeworkId].tsx`, plus `<Tabs.Screen name="homework" options={{ href: null }} />` in the parent layout.
- **Parent RPCs (Plan 1):** `mark_homework_viewed(p_homework_id, p_student_id)`, `mark_homework_done(...)`, `unmark_homework_done(...)`. `unmark` raises `already_reviewed` if the teacher has reviewed — the UI must hide/disable undo once `reviewed_at` is set.
- **Signed URLs / attachments:** reuse `getSignedUrl` and `loadAttachments` from `lib/homework.ts` (Plan 3).
- **Badge refresh:** the parent unread badge logic lives in `lib/parent-counts.tsx`; it is independent of this plan. Marking viewed does NOT need to touch it (the homework_assigned notification is what drives the badge; opening homework marks the homework_status, not the notification). Out of scope here.
- Type-check with `npx tsc --noEmit` from `apps/mobile`.
- **Local-only.**

---

## File Structure

- Modify: `apps/mobile/components/StatusBadge.tsx` — add `hw_new|hw_viewed|hw_done|hw_reviewed` variants.
- Modify: `apps/mobile/lib/homework.ts` — add parent helpers.
- Create: `apps/mobile/app/(parent)/homework/_layout.tsx` — Stack.
- Create: `apps/mobile/app/(parent)/homework/[homeworkId].tsx` — detail + mark done.
- Modify: `apps/mobile/app/(parent)/_layout.tsx` — hidden `homework` tab.
- Modify: `apps/mobile/app/(parent)/academics.tsx` — real status + tappable cards.

---

## Task 1: Add homework badge variants

**Files:**
- Modify: `apps/mobile/components/StatusBadge.tsx`

- [ ] **Step 1: Extend the variant type, labels, and colors**

In `StatusBadge.tsx`, add the four variants. Change the `BadgeVariant` type:
```tsx
type BadgeVariant = "paid" | "pending" | "overdue" | "partial" | "present" | "absent" | "late" | "unmarked" | "hw_new" | "hw_viewed" | "hw_done" | "hw_reviewed";
```
Add to the `LABELS` map:
```tsx
  hw_new: "New",
  hw_viewed: "Viewed",
  hw_done: "Done",
  hw_reviewed: "Reviewed",
```
Add to the `config` map (inside the component where `theme` is available):
```tsx
    hw_new: { bg: theme.primary + "1A", text: theme.primary },
    hw_viewed: { bg: theme.warning + "1A", text: theme.warning },
    hw_done: { bg: theme.success + "1A", text: theme.success },
    hw_reviewed: { bg: theme.success + "1A", text: theme.success },
```

- [ ] **Step 2: Type-check**

Run (from `apps/mobile`): `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/components/StatusBadge.tsx
git commit -m "feat(mobile): add homework status badge variants"
```

---

## Task 2: Parent helpers in lib/homework.ts

**Files:**
- Modify: `apps/mobile/lib/homework.ts`

- [ ] **Step 1: Append parent-side helpers and a ParentHomeworkItem type**

Add to `lib/homework.ts`:
```typescript
export type ParentHomeworkState = "new" | "viewed" | "done" | "reviewed";

export interface ParentHomeworkItem {
  id: string;
  title: string;
  subject: string;
  description: string;
  due_date: string;
  state: ParentHomeworkState;
  rating: HomeworkRating | null;
  teacherComment: string | null;
}

function deriveParentState(s: any): ParentHomeworkState {
  if (!s) return "new";
  if (s.reviewed_at) return "reviewed";
  if (s.state === "done") return "done";
  return "viewed";
}

// Homework for a child's section in a month, merged with that child's status.
export async function loadParentHomework(
  sectionId: string, studentId: string, year: number, month: number,
): Promise<ParentHomeworkItem[]> {
  const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).toISOString().split("T")[0];

  const { data: hw } = await supabase
    .from("homework")
    .select("id, title, description, due_date, subjects(name)")
    .eq("section_id", sectionId)
    .gte("due_date", firstDay)
    .lte("due_date", lastDay)
    .order("due_date", { ascending: true });

  const ids = (hw ?? []).map((h: any) => h.id);
  const statusByHw: Record<string, any> = {};
  if (ids.length > 0) {
    const { data: statuses } = await supabase
      .from("homework_status")
      .select("homework_id, state, rating, teacher_comment, reviewed_at")
      .in("homework_id", ids)
      .eq("student_id", studentId);
    for (const s of statuses ?? []) statusByHw[(s as any).homework_id] = s;
  }

  return (hw ?? []).map((h: any): ParentHomeworkItem => {
    const s = statusByHw[h.id];
    return {
      id: h.id,
      title: h.title,
      description: h.description ?? "",
      subject: h.subjects?.name ?? "",
      due_date: h.due_date,
      state: deriveParentState(s),
      rating: s?.rating ?? null,
      teacherComment: s?.teacher_comment ?? null,
    };
  });
}

// One homework's status for a child (for the detail screen).
export async function loadStudentStatus(homeworkId: string, studentId: string): Promise<{
  state: ParentHomeworkState; rating: HomeworkRating | null; teacherComment: string | null;
  title: string; description: string; subject: string; dueDate: string;
} | null> {
  const { data: hw } = await supabase
    .from("homework")
    .select("id, title, description, due_date, subjects(name)")
    .eq("id", homeworkId)
    .maybeSingle();
  if (!hw) return null;

  const { data: s } = await supabase
    .from("homework_status")
    .select("state, rating, teacher_comment, reviewed_at")
    .eq("homework_id", homeworkId)
    .eq("student_id", studentId)
    .maybeSingle();

  return {
    state: deriveParentState(s),
    rating: (s as any)?.rating ?? null,
    teacherComment: (s as any)?.teacher_comment ?? null,
    title: (hw as any).title,
    description: (hw as any).description ?? "",
    subject: (hw as any).subjects?.name ?? "",
    dueDate: (hw as any).due_date,
  };
}

export async function markViewed(homeworkId: string, studentId: string): Promise<void> {
  await supabase.rpc("mark_homework_viewed", { p_homework_id: homeworkId, p_student_id: studentId });
}
export async function markDone(homeworkId: string, studentId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc("mark_homework_done", { p_homework_id: homeworkId, p_student_id: studentId });
  return { error: error?.message ?? null };
}
export async function unmarkDone(homeworkId: string, studentId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc("unmark_homework_done", { p_homework_id: homeworkId, p_student_id: studentId });
  return { error: error?.message ?? null };
}
```

- [ ] **Step 2: Type-check**

Run (from `apps/mobile`): `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/lib/homework.ts
git commit -m "feat(mobile): add parent homework helpers (status merge, mark viewed/done)"
```

---

## Task 3: Parent homework detail screen

**Files:**
- Create: `apps/mobile/app/(parent)/homework/_layout.tsx`
- Create: `apps/mobile/app/(parent)/homework/[homeworkId].tsx`
- Modify: `apps/mobile/app/(parent)/_layout.tsx`

- [ ] **Step 1: Create the Stack layout**

Create `apps/mobile/app/(parent)/homework/_layout.tsx`:
```tsx
import { Stack } from "expo-router";

export default function ParentHomeworkStackLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 2: Register the hidden tab**

In `apps/mobile/app/(parent)/_layout.tsx`, add inside `<Tabs>` (after the `more` screen):
```tsx
      <Tabs.Screen name="homework" options={{ href: null }} />
```

- [ ] **Step 3: Write the detail screen**

Create `apps/mobile/app/(parent)/homework/[homeworkId].tsx`:
```tsx
import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "../../../lib/theme";
import { useActiveContext } from "../../../lib/active-context";
import { PrimaryButton } from "../../../components/PrimaryButton";
import { StatusBadge } from "../../../components/StatusBadge";
import { SkeletonCard } from "../../../components/Skeleton";
import {
  loadStudentStatus, loadAttachments, getSignedUrl, markViewed, markDone, unmarkDone,
  AttachmentRow, ParentHomeworkState, HomeworkRating,
} from "../../../lib/homework";

const RATING_LABEL: Record<HomeworkRating, string> = {
  good: "Good", satisfactory: "Satisfactory", needs_improvement: "Needs Improvement",
};
const BADGE: Record<ParentHomeworkState, "hw_new" | "hw_viewed" | "hw_done" | "hw_reviewed"> = {
  new: "hw_new", viewed: "hw_viewed", done: "hw_done", reviewed: "hw_reviewed",
};

export default function ParentHomeworkDetail() {
  const theme = useTheme();
  const router = useRouter();
  const { homeworkId } = useLocalSearchParams<{ homeworkId: string }>();
  const { studentId } = useActiveContext();

  const [data, setData] = useState<Awaited<ReturnType<typeof loadStudentStatus>>>(null);
  const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!homeworkId || !studentId) return;
    setLoading(true);
    // Auto-mark viewed on open (idempotent; never downgrades 'done').
    await markViewed(homeworkId, studentId);
    const [d, a] = await Promise.all([
      loadStudentStatus(homeworkId, studentId),
      loadAttachments(homeworkId),
    ]);
    setData(d);
    setAttachments(a);
    setLoading(false);
  }, [homeworkId, studentId]);

  useEffect(() => { load(); }, [load]);

  async function onMarkDone() {
    if (!homeworkId || !studentId) return;
    setBusy(true);
    const { error } = await markDone(homeworkId, studentId);
    setBusy(false);
    if (error) { Alert.alert("Error", error); return; }
    load();
  }

  async function onUndo() {
    if (!homeworkId || !studentId) return;
    setBusy(true);
    const { error } = await unmarkDone(homeworkId, studentId);
    setBusy(false);
    if (error) {
      Alert.alert("Cannot undo", error === "already_reviewed" ? "This homework has already been reviewed by the teacher." : error);
      return;
    }
    load();
  }

  async function openAttachment(path: string) {
    const url = await getSignedUrl(path);
    if (url) Linking.openURL(url); else Alert.alert("Error", "Could not open attachment");
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12 }}>
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace("/(parent)/academics"))} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={26} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 18, fontFamily: "Inter_700Bold", color: theme.textPrimary }} numberOfLines={1}>Homework</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 16 }}>
        {loading || !data ? (
          <SkeletonCard />
        ) : (
          <>
            <View style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 16, gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ flex: 1, fontSize: 17, fontFamily: "Inter_700Bold", color: theme.textPrimary }}>{data.title}</Text>
                <StatusBadge variant={BADGE[data.state]} />
              </View>
              {data.subject ? (
                <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: theme.textSecondary }}>{data.subject}</Text>
              ) : null}
              <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: theme.textMuted }}>
                Due {new Date(data.dueDate + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
              </Text>
              {data.description ? (
                <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: theme.textPrimary, marginTop: 4 }}>{data.description}</Text>
              ) : null}
            </View>

            {attachments.length > 0 && (
              <View style={{ gap: 8 }}>
                {attachments.map((a) => (
                  <TouchableOpacity key={a.id} onPress={() => openAttachment(a.fileUrl)} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: theme.surface, borderRadius: 12, padding: 12 }}>
                    <Ionicons name="document-attach-outline" size={20} color={theme.primary} />
                    <Text style={{ flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", color: theme.textPrimary }} numberOfLines={1}>{a.fileName}</Text>
                    <Ionicons name="open-outline" size={18} color={theme.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Teacher feedback (once reviewed) */}
            {data.state === "reviewed" && (
              <View style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 16, gap: 6 }}>
                <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: theme.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>Teacher feedback</Text>
                {data.rating ? (
                  <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: theme.success }}>{RATING_LABEL[data.rating]}</Text>
                ) : null}
                {data.teacherComment ? (
                  <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: theme.textPrimary }}>{data.teacherComment}</Text>
                ) : null}
              </View>
            )}

            {/* Action: Mark done / Undo. Locked once reviewed. */}
            {data.state === "reviewed" ? null : data.state === "done" ? (
              <TouchableOpacity onPress={onUndo} disabled={busy} style={{ alignItems: "center", paddingVertical: 12 }}>
                <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: theme.textMuted }}>Undo "Done"</Text>
              </TouchableOpacity>
            ) : (
              <PrimaryButton label="Mark as Done" onPress={onMarkDone} loading={busy} />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
```

- [ ] **Step 4: Type-check**

Run (from `apps/mobile`): `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "apps/mobile/app/(parent)/homework/_layout.tsx" "apps/mobile/app/(parent)/homework/[homeworkId].tsx" "apps/mobile/app/(parent)/_layout.tsx"
git commit -m "feat(mobile): parent homework detail screen with mark-done + teacher feedback"
```

---

## Task 4: Real status + tappable cards in academics.tsx

**Files:**
- Modify: `apps/mobile/app/(parent)/academics.tsx`

- [ ] **Step 1: Swap the homework loader to the real-status helper**

In `academics.tsx`, add imports:
```tsx
import { useRouter } from "expo-router";
import { loadParentHomework, ParentHomeworkItem, ParentHomeworkState } from "../../lib/homework";
```
Add `const router = useRouter();` in the component. Change the `Homework` interface/state to use the shared type:
```tsx
const [homework, setHomework] = useState<ParentHomeworkItem[]>([]);
```
(Remove the local `interface Homework { ... }` definition.)

Replace the body of `loadHomeworkForMonth` to delegate to the helper (it needs the active student id):
```tsx
async function loadHomeworkForMonth(sectionId: string, year: number, month: number) {
  if (!activeStudentId) { setHomework([]); return; }
  const items = await loadParentHomework(sectionId, activeStudentId, year, month);
  setHomework(items);
}
```

- [ ] **Step 2: Map real state → badge variant and make day cards tappable**

In the per-day homework render (the `dayHomework.map((h) => ...)` block), replace the `<StatusBadge .../>` line and wrap the card in a touchable. Add this helper above the `return`:
```tsx
const HW_BADGE: Record<ParentHomeworkState, "hw_new" | "hw_viewed" | "hw_done" | "hw_reviewed"> = {
  new: "hw_new", viewed: "hw_viewed", done: "hw_done", reviewed: "hw_reviewed",
};
```
Change the card's outer `<View key={h.id} ...>` to a `TouchableOpacity` that navigates:
```tsx
<TouchableOpacity
  key={h.id}
  activeOpacity={0.85}
  onPress={() => router.push({ pathname: "/(parent)/homework/[homeworkId]", params: { homeworkId: h.id } })}
  style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 16, gap: 8 }}
>
```
(Close it with `</TouchableOpacity>` instead of `</View>`.) Replace the badge with:
```tsx
{(() => {
  const isOverdueNotDone = (h.state === "new" || h.state === "viewed") && new Date(h.due_date) < new Date();
  return <StatusBadge variant={isOverdueNotDone ? "overdue" : HW_BADGE[h.state]} />;
})()}
```

- [ ] **Step 3: Type-check**

Run (from `apps/mobile`): `npx tsc --noEmit`
Expected: no errors. The `h.status` references are gone; `h.subject`, `h.due_date`, `h.title`, `h.description`, `h.state` come from `ParentHomeworkItem`. The `subjectColorMap`/`markedDates` logic still uses `h.subject`/`h.due_date`, which remain present.

- [ ] **Step 4: Commit**

```bash
git add "apps/mobile/app/(parent)/academics.tsx"
git commit -m "feat(mobile): parent homework shows real status + opens detail screen"
```

---

## Final verification

- [ ] **Type-check the whole mobile app**

Run (from `apps/mobile`): `npx tsc --noEmit`
Expected: no errors introduced by this plan.

- [ ] **Manual emulator smoke (full loop with teacher side)**

1. As a teacher, publish homework to a section with attachments (Plan 3).
2. Log in as a parent of a student in that section. Open Academics → Homework → the due date. The card shows **New** (or **Overdue** in red if past due).
3. Tap the card → detail opens; badge flips to **Viewed**; attachments open via signed URL.
4. Tap **Mark as Done** → badge → **Done**; back on the list it shows **Done**. "Undo Done" reverts to Viewed.
5. As the teacher, review that student (rating + comment).
6. Back as the parent, reopen → badge **Reviewed**, teacher feedback shown, the Done/Undo action is gone (locked).

Do not mark complete if any step errors.

---

## Self-review notes (for the implementer)

- Auto-mark-viewed runs on every detail open but is idempotent and never downgrades `done` (the RPC uses `COALESCE` on `viewed_at` and only sets state to `viewed` on insert).
- The list badge shows `overdue` (red) only when the child hasn't done it AND it's past due; once done/reviewed it shows the real state regardless of date.
- Undo is hidden entirely once `state === "reviewed"`; even if a stale UI lets it through, the RPC raises `already_reviewed` and the screen surfaces a friendly message.
- All status reads are scoped to `activeStudentId` (the selected child) — switching children re-runs `loadData`/`loadHomeworkForMonth` via the existing `useEffect` on `activeStudentId`.
- The parent never sees other children's or other students' statuses — RLS on `homework_status` (Plan 1) restricts parent SELECT to their own children, and the queries filter by `student_id` anyway.
