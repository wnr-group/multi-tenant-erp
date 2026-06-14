# Homework Lifecycle Rework — Plan 3: Mobile Teacher

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the mobile teacher the full homework loop: attach files (DOC/PDF/images) when creating homework, see a live "X/Y done" hint per homework card, open a homework detail screen showing a status-grouped completion roster, and review each completed submission inline with a rating + comment.

**Architecture:** A shared `lib/homework.ts` module holds all homework data access + the signed-URL helper, keeping screens thin. The homework list stays in the existing `classes.tsx` "homework" tab but its cards become tappable and route to a new nested-Stack detail screen `(teacher)/homework/[homeworkId].tsx` (hidden tab, mirroring the existing `attendance/[sectionId]` pattern). Attachments upload to the private bucket via `expo-document-picker` + `expo-image-picker`.

**Tech Stack:** Expo Router (nested Stack), React Native, Supabase JS, `expo-document-picker`, `expo-image-picker`, `expo-file-system`.

**Spec:** `docs/superpowers/specs/2026-06-14-homework-lifecycle-design.md` (UI → Teacher Mobile).

**Depends on:** Plan 1 (RPCs, tables), Plan 2 (bucket, notification function).

---

## Context for the implementer

- Teacher screens live under `apps/mobile/app/(teacher)/`. The tab bar is defined in `(teacher)/_layout.tsx` (a `Tabs` navigator wrapped in `TeacherContextProvider`).
- **Nested Stack precedent:** `(teacher)/attendance/` is a folder with `_layout.tsx` (a `Stack`, `headerShown:false`), `index.tsx` (overview), and `[sectionId].tsx` (detail). The tab points at the folder. Replicate this for homework so the detail screen does not become its own tab.
- **`classes.tsx`** currently hosts a "homework" tab (flat cards, tap does nothing) and a "results" tab in one screen. Homework data is loaded in `loadAll()` and created in `submitHomework()`. We keep homework as a tab here but: (a) cards gain an "X/Y done" hint, (b) cards become tappable → push to the detail screen, (c) the create sheet gains an attachment picker.
- **`useTeacherContext()`** (`lib/teacherContext.tsx`) provides `{ activeSection, userId, schoolId, ready }`. `activeSection` has `{ id, label, classId, isHomeroom }`.
- **Supabase client + helpers:** `lib/supabase.ts` exports `supabase`, `supabaseUrl`, `SCHOOL_ID`, and `fixStorageUrl()`. Auth token via `supabase.auth.getSession()`.
- **Existing UI components:** `PrimaryButton`, `PickerModal` + `SelectRow` (`{label, value}` options), `SkeletonCard`, `StatusBadge`, `SectionSwitcher`. Theme via `useTheme()`.
- **Calling an edge function from mobile:** `fetch(\`${supabaseUrl}/functions/v1/<name>\`, { method:"POST", headers:{ Authorization:\`Bearer ${session.access_token}\`, "Content-Type":"application/json" }, body: JSON.stringify(...) })` — see `downloadReportCard` in `(parent)/academics.tsx`.
- **`expo-document-picker` is NOT installed yet** — Task 1 adds it. `expo-image-picker` and `expo-file-system` ARE installed.
- **Signed URLs:** for a private bucket, `supabase.storage.from("homework-attachments").createSignedUrl(path, 60)` returns `{ data: { signedUrl } }`. Generate on demand when opening an attachment.
- **Uploading from mobile:** read the picked file as an `ArrayBuffer`/base64 and pass to `supabase.storage.from(bucket).upload(path, bytes, { contentType })`. With `expo-file-system`, fetch the local `uri` and convert to a `Blob`/`ArrayBuffer`. (Step code below shows the exact approach.)
- Verify types with `npx tsc --noEmit` (run from `apps/mobile`). `npm run lint` is broken repo-wide — do not rely on it.
- **Local-only:** do not deploy anything.

---

## File Structure

- Modify: `apps/mobile/package.json` — add `expo-document-picker`.
- Create: `apps/mobile/lib/homework.ts` — types + data access (`loadTeacherHomework`, `loadRoster`, `reviewStudent`, `uploadAttachment`, `getSignedUrl`, `notifyAssigned`).
- Create: `apps/mobile/app/(teacher)/homework/_layout.tsx` — Stack (headerShown:false).
- Create: `apps/mobile/app/(teacher)/homework/[homeworkId].tsx` — roster + inline review.
- Modify: `apps/mobile/app/(teacher)/_layout.tsx` — register hidden `homework` tab (`href: null`).
- Modify: `apps/mobile/app/(teacher)/classes.tsx` — tappable cards + "X/Y done" hint + attachment picker in create sheet + fire `assigned` notification.

---

## Task 1: Add expo-document-picker

**Files:**
- Modify: `apps/mobile/package.json`

- [ ] **Step 1: Install the Expo-compatible version**

Run (from `apps/mobile`): `npx expo install expo-document-picker`
Expected: adds `expo-document-picker` to `package.json` `dependencies` at an SDK-55-compatible version; `node_modules` updated.

- [ ] **Step 2: Verify it resolves**

Run: `node -e "require.resolve('expo-document-picker'); console.log('ok')"`
Expected: prints `ok`.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/package.json apps/mobile/package-lock.json
git commit -m "build(mobile): add expo-document-picker for homework attachments"
```

---

## Task 2: lib/homework.ts data module

**Files:**
- Create: `apps/mobile/lib/homework.ts`

- [ ] **Step 1: Write the module**

```typescript
import { supabase, supabaseUrl } from "./supabase";

export type HomeworkRating = "good" | "satisfactory" | "needs_improvement";
export type RosterState = "not_started" | "viewed" | "done";

export interface TeacherHomeworkItem {
  id: string;
  title: string;
  subject: string;
  due_date: string;
  doneCount: number;
  totalCount: number;
}

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
  fileUrl: string; // storage object path
}

// Homework list for a teacher's section, with done/total counts.
export async function loadTeacherHomework(
  sectionId: string,
  teacherId: string,
): Promise<TeacherHomeworkItem[]> {
  const { data: hw } = await supabase
    .from("homework")
    .select("id, title, due_date, subjects(name)")
    .eq("teacher_id", teacherId)
    .eq("section_id", sectionId)
    .order("due_date", { ascending: false })
    .limit(30);

  const ids = (hw ?? []).map((h: any) => h.id);

  // Total enrolled students in the section (denominator).
  const { count: totalCount } = await supabase
    .from("student_enrollments")
    .select("id", { count: "exact", head: true })
    .eq("section_id", sectionId)
    .eq("is_active", true);

  // Done counts per homework.
  const doneByHw: Record<string, number> = {};
  if (ids.length > 0) {
    const { data: statuses } = await supabase
      .from("homework_status")
      .select("homework_id, state")
      .in("homework_id", ids)
      .eq("state", "done");
    for (const s of statuses ?? []) {
      doneByHw[(s as any).homework_id] = (doneByHw[(s as any).homework_id] ?? 0) + 1;
    }
  }

  return (hw ?? []).map((h: any) => ({
    id: h.id,
    title: h.title,
    subject: h.subjects?.name ?? "—",
    due_date: h.due_date,
    doneCount: doneByHw[h.id] ?? 0,
    totalCount: totalCount ?? 0,
  }));
}

// Build the roster: all enrolled students LEFT JOINed with their status.
export async function loadRoster(homeworkId: string, sectionId: string): Promise<RosterRow[]> {
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
  const { data } = await supabase
    .from("homework_attachments")
    .select("id, file_name, file_type, file_url")
    .eq("homework_id", homeworkId);
  return (data ?? []).map((a: any) => ({
    id: a.id, fileName: a.file_name, fileType: a.file_type, fileUrl: a.file_url,
  }));
}

export async function getSignedUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage
    .from("homework-attachments")
    .createSignedUrl(path, 60);
  return data?.signedUrl ?? null;
}

// Teacher review via the column-aware RPC.
export async function reviewStudent(
  homeworkId: string, studentId: string, rating: HomeworkRating, comment: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc("review_homework", {
    p_homework_id: homeworkId,
    p_student_id: studentId,
    p_rating: rating,
    p_comment: comment,
  });
  return { error: error?.message ?? null };
}

// Upload one picked file to the private bucket; insert the attachments row.
export async function uploadAttachment(
  schoolId: string, homeworkId: string,
  file: { uri: string; name: string; mimeType: string; size: number },
): Promise<{ error: string | null }> {
  if (file.size > 2 * 1024 * 1024) return { error: "File exceeds 2MB" };
  const path = `homework/${schoolId}/${homeworkId}/${Date.now()}-${file.name}`;
  // RN: fetch the local file uri into an ArrayBuffer for upload.
  const res = await fetch(file.uri);
  const bytes = await res.arrayBuffer();
  const up = await supabase.storage
    .from("homework-attachments")
    .upload(path, bytes, { contentType: file.mimeType, upsert: false });
  if (up.error) return { error: up.error.message };
  const ins = await supabase.from("homework_attachments").insert({
    homework_id: homeworkId,
    school_id: schoolId,
    file_url: path,
    file_name: file.name,
    file_type: file.mimeType,
    file_size: file.size,
  });
  return { error: ins.error?.message ?? null };
}

// Fire the "assigned" notification fan-out (best-effort; never blocks the user).
export async function notifyAssigned(homeworkId: string): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch(`${supabaseUrl}/functions/v1/send-homework-notification`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ event: "assigned", homeworkId }),
    });
  } catch {
    // best-effort; the homework is already saved
  }
}

// Fire the "reviewed" notification for one student (best-effort).
export async function notifyReviewed(homeworkId: string, studentId: string): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch(`${supabaseUrl}/functions/v1/send-homework-notification`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ event: "reviewed", homeworkId, studentId }),
    });
  } catch {
    // best-effort
  }
}
```

- [ ] **Step 2: Type-check**

Run (from `apps/mobile`): `npx tsc --noEmit`
Expected: no errors referencing `lib/homework.ts`. (Pre-existing errors elsewhere, if any, are out of scope — but there should be none introduced by this file.)

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/lib/homework.ts
git commit -m "feat(mobile): add homework data module (roster, review, attachments, notify)"
```

---

## Task 3: Homework detail screen (roster + inline review)

**Files:**
- Create: `apps/mobile/app/(teacher)/homework/_layout.tsx`
- Create: `apps/mobile/app/(teacher)/homework/[homeworkId].tsx`
- Modify: `apps/mobile/app/(teacher)/_layout.tsx`

- [ ] **Step 1: Create the nested Stack layout**

Create `apps/mobile/app/(teacher)/homework/_layout.tsx`:
```tsx
import { Stack } from "expo-router";

export default function HomeworkStackLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 2: Register the hidden tab in the teacher layout**

In `apps/mobile/app/(teacher)/_layout.tsx`, add this line inside `<Tabs>` (after the `profile` screen):
```tsx
      <Tabs.Screen name="homework" options={{ href: null }} />
```
This makes `(teacher)/homework/*` navigable via `router.push` without showing a tab (same trick the attendance detail uses).

- [ ] **Step 3: Write the detail screen**

Create `apps/mobile/app/(teacher)/homework/[homeworkId].tsx`:
```tsx
import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "../../../lib/theme";
import { useTeacherContext } from "../../../lib/teacherContext";
import { PrimaryButton } from "../../../components/PrimaryButton";
import { SkeletonCard } from "../../../components/Skeleton";
import {
  loadRoster, loadAttachments, getSignedUrl, reviewStudent, notifyReviewed,
  RosterRow, AttachmentRow, HomeworkRating,
} from "../../../lib/homework";
import { Linking } from "react-native";

const RATING_OPTIONS: { value: HomeworkRating; label: string }[] = [
  { value: "good", label: "Good" },
  { value: "satisfactory", label: "Satisfactory" },
  { value: "needs_improvement", label: "Needs Improvement" },
];

export default function HomeworkDetail() {
  const theme = useTheme();
  const router = useRouter();
  const { homeworkId, sectionId, title } = useLocalSearchParams<{ homeworkId: string; sectionId: string; title: string }>();
  const { activeSection } = useTeacherContext();
  const secId = (sectionId as string) || activeSection?.id || "";

  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draftRating, setDraftRating] = useState<HomeworkRating>("good");
  const [draftComment, setDraftComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [groupsOpen, setGroupsOpen] = useState({ done: true, viewed: true, not_started: false });

  const load = useCallback(async () => {
    if (!homeworkId || !secId) return;
    setLoading(true);
    const [r, a] = await Promise.all([loadRoster(homeworkId, secId), loadAttachments(homeworkId)]);
    setRoster(r);
    setAttachments(a);
    setLoading(false);
  }, [homeworkId, secId]);

  useEffect(() => { load(); }, [load]);

  // "Done — needs review" = done & not yet reviewed; reviewed ones still show in done group with their rating.
  const doneRows = roster.filter((r) => r.state === "done");
  const viewedRows = roster.filter((r) => r.state === "viewed");
  const notStartedRows = roster.filter((r) => r.state === "not_started");
  const doneCount = doneRows.length;

  function openReview(row: RosterRow) {
    if (expandedId === row.studentId) { setExpandedId(null); return; }
    setExpandedId(row.studentId);
    setDraftRating(row.rating ?? "good");
    setDraftComment(row.teacherComment ?? "");
  }

  async function saveReview(row: RosterRow) {
    setSaving(true);
    const { error } = await reviewStudent(homeworkId, row.studentId, draftRating, draftComment);
    setSaving(false);
    if (error) { Alert.alert("Error", error); return; }
    notifyReviewed(homeworkId, row.studentId);
    setExpandedId(null);
    load();
  }

  async function openAttachment(path: string) {
    const url = await getSignedUrl(path);
    if (url) Linking.openURL(url);
    else Alert.alert("Error", "Could not open attachment");
  }

  const ratingLabel = (r: HomeworkRating | null) =>
    r === "good" ? "Good" : r === "satisfactory" ? "Satisfactory" : r === "needs_improvement" ? "Needs Improvement" : "";

  function renderRow(row: RosterRow, reviewable: boolean) {
    const expanded = expandedId === row.studentId;
    return (
      <View key={row.studentId} style={{ backgroundColor: theme.surface, borderRadius: 14, padding: 14, marginBottom: 8 }}>
        <TouchableOpacity
          activeOpacity={reviewable ? 0.7 : 1}
          onPress={reviewable ? () => openReview(row) : undefined}
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
        >
          <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: theme.textPrimary }}>{row.fullName}</Text>
          {row.reviewedAt ? (
            <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: theme.primary }}>{ratingLabel(row.rating)}</Text>
          ) : reviewable ? (
            <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={theme.textMuted} />
          ) : null}
        </TouchableOpacity>

        {expanded && reviewable && (
          <View style={{ marginTop: 12, gap: 10 }}>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              {RATING_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setDraftRating(opt.value)}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
                    backgroundColor: draftRating === opt.value ? theme.primary : theme.surfaceRaised,
                    borderWidth: 1, borderColor: draftRating === opt.value ? theme.primary : theme.border,
                  }}
                >
                  <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: draftRating === opt.value ? "#fff" : theme.textSecondary }}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={{ backgroundColor: theme.surfaceRaised, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: theme.border, fontSize: 14, fontFamily: "Inter_400Regular", color: theme.textPrimary, minHeight: 60, textAlignVertical: "top" }}
              placeholder="Comment (optional)…"
              placeholderTextColor={theme.textMuted}
              multiline
              value={draftComment}
              onChangeText={setDraftComment}
            />
            <PrimaryButton label="Save Review" onPress={() => saveReview(row)} loading={saving} />
          </View>
        )}
      </View>
    );
  }

  function GroupHeader({ label, count, k }: { label: string; count: number; k: keyof typeof groupsOpen }) {
    return (
      <TouchableOpacity
        onPress={() => setGroupsOpen((p) => ({ ...p, [k]: !p[k] }))}
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10 }}
      >
        <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: theme.textMuted, letterSpacing: 0.5, textTransform: "uppercase" }}>
          {label} ({count})
        </Text>
        <Ionicons name={groupsOpen[k] ? "chevron-up" : "chevron-down"} size={16} color={theme.textMuted} />
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Header with back */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12 }}>
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace("/(teacher)/classes"))} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={26} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 18, fontFamily: "Inter_700Bold", color: theme.textPrimary }} numberOfLines={1}>
          {title || "Homework"}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={{ gap: 8 }}><SkeletonCard /><SkeletonCard /></View>
        ) : (
          <>
            {/* Summary bar */}
            <View style={{ backgroundColor: theme.surface, borderRadius: 14, padding: 16, marginBottom: 16, flexDirection: "row", justifyContent: "space-around" }}>
              <Summary theme={theme} label="Done" value={`${doneCount}/${roster.length}`} />
              <Summary theme={theme} label="Viewed" value={`${viewedRows.length}`} />
              <Summary theme={theme} label="Not started" value={`${notStartedRows.length}`} />
            </View>

            {/* Attachments */}
            {attachments.length > 0 && (
              <View style={{ marginBottom: 16, gap: 8 }}>
                {attachments.map((a) => (
                  <TouchableOpacity key={a.id} onPress={() => openAttachment(a.fileUrl)} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: theme.surface, borderRadius: 12, padding: 12 }}>
                    <Ionicons name="document-attach-outline" size={20} color={theme.primary} />
                    <Text style={{ flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", color: theme.textPrimary }} numberOfLines={1}>{a.fileName}</Text>
                    <Ionicons name="open-outline" size={18} color={theme.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Done — needs review (top, actionable) */}
            <GroupHeader label="Done — tap to review" count={doneRows.length} k="done" />
            {groupsOpen.done && doneRows.map((r) => renderRow(r, true))}

            <GroupHeader label="Viewed (not done)" count={viewedRows.length} k="viewed" />
            {groupsOpen.viewed && viewedRows.map((r) => renderRow(r, false))}

            <GroupHeader label="Not started" count={notStartedRows.length} k="not_started" />
            {groupsOpen.not_started && notStartedRows.map((r) => renderRow(r, false))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Summary({ theme, label, value }: { theme: any; label: string; value: string }) {
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: theme.textPrimary }}>{value}</Text>
      <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: theme.textMuted, marginTop: 2 }}>{label}</Text>
    </View>
  );
}
```

- [ ] **Step 4: Type-check**

Run (from `apps/mobile`): `npx tsc --noEmit`
Expected: no new errors. If the dynamic route params type complains, confirm `useLocalSearchParams` generic matches the pushed params from Task 4.

- [ ] **Step 5: Commit**

```bash
git add "apps/mobile/app/(teacher)/homework/_layout.tsx" "apps/mobile/app/(teacher)/homework/[homeworkId].tsx" "apps/mobile/app/(teacher)/_layout.tsx"
git commit -m "feat(mobile): teacher homework detail screen with grouped roster + inline review"
```

---

## Task 4: Wire classes.tsx — tappable cards, done hint, attachment picker

**Files:**
- Modify: `apps/mobile/app/(teacher)/classes.tsx`

- [ ] **Step 1: Replace homework loading with the shared module + counts**

In `classes.tsx`, import the module and router near the top:
```tsx
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { loadTeacherHomework, uploadAttachment, notifyAssigned, TeacherHomeworkItem } from "../../lib/homework";
```
Add `const router = useRouter();` inside the component. Change the homework state type to `TeacherHomeworkItem[]`:
```tsx
const [homework, setHomework] = useState<TeacherHomeworkItem[]>([]);
```
In `loadAll()`, replace the homework query + `setHomework(...)` mapping with:
```tsx
const hwItems = await loadTeacherHomework(sectionId, userId);
setHomework(hwItems);
```
(Remove `homework` from the `Promise.all` array and its mapping block.)

- [ ] **Step 2: Make homework cards tappable with an X/Y done hint**

Replace the homework card JSX (the `homework.map((h) => { ... })` block) with:
```tsx
homework.map((h) => {
  const isOverdue = new Date(h.due_date) < new Date();
  return (
    <TouchableOpacity
      key={h.id}
      activeOpacity={0.85}
      onPress={() => router.push({
        pathname: "/(teacher)/homework/[homeworkId]",
        params: { homeworkId: h.id, sectionId: activeSection!.id, title: h.title },
      })}
      style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 14 }}
    >
      <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: theme.primary + "18", alignItems: "center", justifyContent: "center" }}>
        <Ionicons name="book-outline" size={20} color={theme.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: theme.textPrimary }}>{h.title}</Text>
        <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: theme.textSecondary, marginTop: 2 }}>
          {h.subject} · {h.doneCount}/{h.totalCount} done
        </Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: isOverdue ? "#EF4444" : theme.textMuted }}>
          {isOverdue ? "Overdue" : `Due ${new Date(h.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
      </View>
    </TouchableOpacity>
  );
})
```

- [ ] **Step 3: Add attachment state + pickers to the create sheet**

Add state near the other HW form state:
```tsx
const [hwAttachments, setHWAttachments] = useState<{ uri: string; name: string; mimeType: string; size: number }[]>([]);
```
Add two picker handlers inside the component:
```tsx
async function pickDocument() {
  const res = await DocumentPicker.getDocumentAsync({
    type: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    copyToCacheDirectory: true,
  });
  if (res.canceled || !res.assets?.[0]) return;
  const a = res.assets[0];
  if ((a.size ?? 0) > 2 * 1024 * 1024) { Alert.alert("Too large", "Files must be under 2MB."); return; }
  setHWAttachments((p) => [...p, { uri: a.uri, name: a.name, mimeType: a.mimeType ?? "application/octet-stream", size: a.size ?? 0 }]);
}

async function pickImage() {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
  if (res.canceled || !res.assets?.[0]) return;
  const a = res.assets[0];
  if ((a.fileSize ?? 0) > 2 * 1024 * 1024) { Alert.alert("Too large", "Files must be under 2MB."); return; }
  const name = a.fileName ?? `photo-${Date.now()}.jpg`;
  setHWAttachments((p) => [...p, { uri: a.uri, name, mimeType: a.mimeType ?? "image/jpeg", size: a.fileSize ?? 0 }]);
}
```
In the Add Homework sheet JSX, add this block above the `<PrimaryButton label="Assign Homework" .../>`:
```tsx
<View>
  <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: theme.textSecondary, marginBottom: 6 }}>Attachments (optional, ≤2MB each)</Text>
  <View style={{ flexDirection: "row", gap: 10 }}>
    <TouchableOpacity onPress={pickDocument} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 10, backgroundColor: theme.surfaceRaised, borderWidth: 1, borderColor: theme.border }}>
      <Ionicons name="document-outline" size={18} color={theme.primary} />
      <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: theme.textSecondary }}>DOC / PDF</Text>
    </TouchableOpacity>
    <TouchableOpacity onPress={pickImage} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 10, backgroundColor: theme.surfaceRaised, borderWidth: 1, borderColor: theme.border }}>
      <Ionicons name="image-outline" size={18} color={theme.primary} />
      <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: theme.textSecondary }}>Photo</Text>
    </TouchableOpacity>
  </View>
  {hwAttachments.map((f, i) => (
    <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
      <Ionicons name="attach" size={16} color={theme.textMuted} />
      <Text style={{ flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: theme.textSecondary }} numberOfLines={1}>{f.name}</Text>
      <TouchableOpacity onPress={() => setHWAttachments((p) => p.filter((_, j) => j !== i))}>
        <Ionicons name="close-circle" size={18} color={theme.textMuted} />
      </TouchableOpacity>
    </View>
  ))}
</View>
```

- [ ] **Step 4: Upload attachments + notify after the homework insert**

In `submitHomework()`, change the insert to return the new row id and then upload + notify. Replace the insert block:
```tsx
const { data: created, error } = await supabase.from("homework").insert({
  title: hwForm.title.trim(),
  description: hwForm.description.trim() || null,
  due_date: hwForm.dueDate.toISOString().split("T")[0],
  subject_id: hwForm.subjectId,
  teacher_id: ctx.userId,
  section_id: ctx.sectionId,
  class_id: ctx.classId,
  school_id: ctx.schoolId,
}).select("id").single();
setSavingHW(false);
if (error || !created) { Alert.alert("Error", error?.message ?? "Could not save"); return; }

// Upload attachments (sequential; small files).
for (const f of hwAttachments) {
  const up = await uploadAttachment(ctx.schoolId, created.id, f);
  if (up.error) Alert.alert("Attachment failed", `${f.name}: ${up.error}`);
}
// Notify parents (best-effort).
notifyAssigned(created.id);

setShowAddHW(false);
setHWForm({ title: "", subjectId: "", subjectLabel: "", description: "", dueDate: new Date() });
setHWAttachments([]);
loadAll();
```
(Remove the old `setSavingHW(false)` / reset lines that this block replaces.)

- [ ] **Step 5: Type-check**

Run (from `apps/mobile`): `npx tsc --noEmit`
Expected: no new errors. If `ImagePicker.MediaTypeOptions` is flagged deprecated in this SDK, use `ImagePicker.MediaType.Images` per the installed `expo-image-picker` types — check the existing usage in `(parent)/more.tsx` and match it.

- [ ] **Step 6: Commit**

```bash
git add "apps/mobile/app/(teacher)/classes.tsx"
git commit -m "feat(mobile): tappable homework cards, done counts, attachment picker"
```

---

## Final verification

- [ ] **Type-check the whole mobile app**

Run (from `apps/mobile`): `npx tsc --noEmit`
Expected: no errors introduced by this plan.

- [ ] **Manual emulator smoke (golden path)**

With the local stack running (`supabase start`) and the app on the emulator:
1. Log in as a teacher (e.g. 9000000006), open Classes → Homework.
2. Create homework with one photo + one PDF attachment. Confirm it saves and appears with "0/N done".
3. Tap the card → detail screen opens with the grouped roster + the two attachments (tap one → opens via signed URL).
4. (After Plan 4) a parent marks Done → pull-to-refresh detail → student moves to "Done — tap to review"; expand, pick a rating, Save → row shows the rating.

Report any failures; do not mark complete if the golden path errors.

---

## Self-review notes (for the implementer)

- The detail screen is reached only via `router.push` with `{ homeworkId, sectionId, title }`. The hidden `href: null` tab keeps it out of the tab bar (same pattern as `attendance/[sectionId]`).
- Counts: denominator is active enrollments in the section; numerator is `homework_status` rows with `state='done'`. A student reviewed is still `done`, so they remain counted.
- Reviewing calls the `review_homework` RPC (Plan 1), which enforces the teacher actually teaches the section — the screen does not trust the client.
- `notifyReviewed`/`notifyAssigned` are fire-and-forget; a notification failure must never block saving homework or a review.
- Attachment upload is sequential and best-effort per file; a failed upload alerts but does not delete the already-created homework.
