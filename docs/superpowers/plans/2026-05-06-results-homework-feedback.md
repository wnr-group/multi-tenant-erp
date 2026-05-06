# Results Rework, Homework Calendar & Parent Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the Results screen to group by academic year and show rankings, replace the Homework flat list with a calendar view, and split parent Feedback into two distinct types (to teacher vs. to management).

**Architecture:** All three features touch `apps/mobile/app/(parent)/academics.tsx` and `apps/mobile/app/(parent)/more.tsx` for mobile, plus the web teacher results and feedback pages. A single Supabase migration adds `to_user_id` to `feedback` and tightens the teacher RLS policy.

**Tech Stack:** Expo / React Native, `react-native-calendars`, Next.js 15 (App Router), Supabase (PostgreSQL + RLS), TypeScript.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `apps/mobile/app/(parent)/academics.tsx` | Modify | Results grouped by year + rank; Homework calendar |
| `apps/mobile/app/(teacher)/classes.tsx` | Modify | Ranked results table (sorted by total, rank badge) |
| `apps/web/app/(school)/teacher/results/page.tsx` | Modify | Add "View Rankings" link per exam |
| `apps/web/app/(school)/teacher/results/[examId]/rankings/page.tsx` | Create | Ranked leaderboard for a single exam |
| `apps/web/app/(school)/teacher/feedback/page.tsx` | Modify | Tighten query to `to_user_id = auth.uid()` |
| `apps/web/app/(school)/teacher/feedback/feedback-list.tsx` | Modify | Add "From Parents" / "All" filter tabs |
| `apps/web/app/(school)/admin/feedback/page.tsx` | Create | Management feedback inbox (admin) |
| `apps/web/app/(school)/principal/feedback/page.tsx` | Create | Management feedback inbox (principal) |
| `apps/web/app/(school)/layout.tsx` | Modify | Add Feedback to admin + principal nav |
| `apps/mobile/app/(parent)/more.tsx` | Modify | Replace single textarea with two feedback cards |
| `supabase/migrations/20240001000024_feedback_to_user.sql` | Create | Add `to_user_id` column + update RLS |

---

## Task 1: Supabase Migration — Add `to_user_id` to `feedback` + Update RLS

**Files:**
- Create: `supabase/migrations/20240001000024_feedback_to_user.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20240001000024_feedback_to_user.sql

-- Add nullable to_user_id for directing feedback to a specific user (e.g. class teacher)
ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS to_user_id UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_feedback_to_user_id ON public.feedback(to_user_id);

-- Tighten teacher feedback_select: teachers only see feedback directed to them specifically
DROP POLICY IF EXISTS "feedback_select" ON public.feedback;

CREATE POLICY "feedback_select" ON public.feedback FOR SELECT
  USING (
    from_user_id = auth.uid()
    OR public.get_my_role() = 'super_admin'
    OR (
      public.get_my_role() IN ('school_admin', 'principal')
      AND school_id = public.get_my_school_id()
    )
    OR (
      public.get_my_role() = 'teacher'
      AND school_id = public.get_my_school_id()
      AND to_user_id = auth.uid()
    )
  );
```

- [ ] **Step 2: Apply the migration**

```bash
cd "/Users/dineshlearning/Documents/make money/erp"
npx supabase db push
```

Expected: migration applies without error.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20240001000024_feedback_to_user.sql
git commit -m "feat(db): add feedback.to_user_id + tighten teacher RLS policy"
```

---

## Task 2: Parent Mobile — Results Tab Rework (grouped by year + rank badge)

**Files:**
- Modify: `apps/mobile/app/(parent)/academics.tsx`

The existing `Result` interface and flat list get replaced. We need to:
1. Fetch exam results joined with `exams` and `academic_years`.
2. Compute rank client-side: for each exam, sum each student's marks, sort descending, assign rank.
3. Group results cards by academic year, expand to show subject breakdown.

- [ ] **Step 1: Update the `Result` interface and add helper types**

Replace the top of the file. The new interfaces support grouping and expansion:

```typescript
interface SubjectResult {
  id: string;
  subject: string;
  marks_obtained: number;
  max_marks: number;
  grade: string;
}

interface ExamResult {
  examId: string;
  examName: string;
  startDate: string;
  endDate: string;
  academicYear: string;
  subjects: SubjectResult[];
  totalObtained: number;
  totalMax: number;
  rank: number;
  totalStudents: number;
}
```

- [ ] **Step 2: Replace `loadData` results query**

The new query fetches results with exam + academic year info, plus all results in the same section/exam for rank computation:

```typescript
async function loadData() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: sp } = await supabase
    .from("student_profiles")
    .select("id, section_id")
    .eq("parent_profile_id", user.id)
    .single();
  const studentId = sp?.id;
  const sectionId = sp?.section_id;

  const [resultsRes, allSectionResultsRes, homeworkRes] = await Promise.all([
    studentId
      ? supabase
          .from("exam_results")
          .select("id, marks_obtained, max_marks, grade, exam_id, subjects(name), exams(id, name, start_date, end_date, academic_years(name))")
          .eq("student_id", studentId)
      : Promise.resolve({ data: [] }),
    studentId && sectionId
      ? supabase
          .from("exam_results")
          .select("student_id, exam_id, marks_obtained")
          .in("exam_id",
            await supabase
              .from("exam_results")
              .select("exam_id")
              .eq("student_id", studentId)
              .then(r => (r.data ?? []).map((x: any) => x.exam_id))
          )
      : Promise.resolve({ data: [] }),
    supabase
      .from("homework")
      .select("id, title, due_date, subjects(name)")
      .eq("section_id", sectionId ?? "")
      .order("due_date", { ascending: true }),
  ]);

  // Build per-exam totals for all students (for rank)
  const allResults = allSectionResultsRes.data ?? [];
  const studentTotals: Record<string, Record<string, number>> = {};
  for (const r of allResults as any[]) {
    if (!studentTotals[r.exam_id]) studentTotals[r.exam_id] = {};
    studentTotals[r.exam_id][r.student_id] = (studentTotals[r.exam_id][r.student_id] ?? 0) + (r.marks_obtained ?? 0);
  }

  // Group this student's results by exam
  const examMap: Record<string, ExamResult> = {};
  for (const r of (resultsRes.data ?? []) as any[]) {
    const examId = r.exams?.id ?? r.exam_id;
    if (!examMap[examId]) {
      examMap[examId] = {
        examId,
        examName: r.exams?.name ?? "—",
        startDate: r.exams?.start_date ?? "",
        endDate: r.exams?.end_date ?? "",
        academicYear: r.exams?.academic_years?.name ?? "—",
        subjects: [],
        totalObtained: 0,
        totalMax: 0,
        rank: 0,
        totalStudents: 0,
      };
    }
    examMap[examId].subjects.push({
      id: r.id,
      subject: r.subjects?.name ?? "—",
      marks_obtained: r.marks_obtained ?? 0,
      max_marks: r.max_marks ?? 100,
      grade: r.grade ?? "—",
    });
    examMap[examId].totalObtained += r.marks_obtained ?? 0;
    examMap[examId].totalMax += r.max_marks ?? 100;
  }

  // Compute rank per exam
  for (const examId of Object.keys(examMap)) {
    const totals = Object.values(studentTotals[examId] ?? {});
    const myTotal = examMap[examId].totalObtained;
    examMap[examId].rank = totals.filter(t => t > myTotal).length + 1;
    examMap[examId].totalStudents = totals.length;
  }

  // Group by academic year
  const grouped: Record<string, ExamResult[]> = {};
  for (const exam of Object.values(examMap)) {
    if (!grouped[exam.academicYear]) grouped[exam.academicYear] = [];
    grouped[exam.academicYear].push(exam);
  }
  setGroupedResults(grouped);

  // Homework stays same shape but now uses section_id filter
  setHomework((homeworkRes.data ?? []).map((h: any) => ({
    id: h.id,
    title: h.title,
    subject: h.subjects?.name ?? "",
    due_date: h.due_date,
    status: new Date(h.due_date) < new Date() ? "overdue" : "pending",
  })));
  setLoading(false);
}
```

- [ ] **Step 3: Add state for grouped results and expanded exam**

In the component, replace `const [results, setResults] = useState<Result[]>([])` with:

```typescript
const [groupedResults, setGroupedResults] = useState<Record<string, ExamResult[]>>({});
const [expandedExamId, setExpandedExamId] = useState<string | null>(null);
```

- [ ] **Step 4: Replace the results render section**

Replace the `tab === "results"` JSX block with:

```tsx
<View style={{ gap: 16 }}>
  {Object.keys(groupedResults).length === 0 ? (
    <Text style={{ textAlign: "center", color: theme.textMuted, fontFamily: "Inter_400Regular", paddingVertical: 32 }}>No results yet</Text>
  ) : Object.entries(groupedResults).map(([year, exams]) => (
    <View key={year}>
      <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: theme.textMuted, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>{year}</Text>
      <View style={{ gap: 10 }}>
        {exams.map((exam) => {
          const isExpanded = expandedExamId === exam.examId;
          return (
            <TouchableOpacity
              key={exam.examId}
              activeOpacity={0.85}
              onPress={() => setExpandedExamId(isExpanded ? null : exam.examId)}
              style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 16, gap: 10 }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: theme.textPrimary }}>{exam.examName}</Text>
                  {exam.startDate ? (
                    <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: theme.textMuted, marginTop: 2 }}>
                      {new Date(exam.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      {exam.endDate ? ` – ${new Date(exam.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}
                    </Text>
                  ) : null}
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: theme.primary }}>{exam.totalObtained}/{exam.totalMax}</Text>
                  {exam.rank > 0 && (
                    <View style={{ backgroundColor: exam.rank <= 3 ? "#F59E0B18" : theme.surfaceRaised, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: exam.rank <= 3 ? "#D97706" : theme.textSecondary }}>
                        Rank {exam.rank}{exam.totalStudents > 0 ? ` of ${exam.totalStudents}` : ""}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              {isExpanded && (
                <View style={{ borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 10, gap: 6 }}>
                  <View style={{ flexDirection: "row" }}>
                    <Text style={{ flex: 3, fontSize: 11, fontFamily: "Inter_600SemiBold", color: theme.textMuted }}>SUBJECT</Text>
                    <Text style={{ flex: 1, fontSize: 11, fontFamily: "Inter_600SemiBold", color: theme.textMuted, textAlign: "center" }}>MARKS</Text>
                    <Text style={{ flex: 1, fontSize: 11, fontFamily: "Inter_600SemiBold", color: theme.textMuted, textAlign: "center" }}>GRADE</Text>
                  </View>
                  {exam.subjects.map((s) => (
                    <View key={s.id} style={{ flexDirection: "row", alignItems: "center" }}>
                      <Text style={{ flex: 3, fontSize: 13, fontFamily: "Inter_400Regular", color: theme.textPrimary }}>{s.subject}</Text>
                      <Text style={{ flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: theme.textSecondary, textAlign: "center" }}>{s.marks_obtained}/{s.max_marks}</Text>
                      <Text style={{ flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold", color: theme.primary, textAlign: "center" }}>{s.grade}</Text>
                    </View>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  ))}
</View>
```

- [ ] **Step 5: Clean up — remove the old `Result` interface and `results` state**

Remove the old `interface Result { ... }` at the top and `const [results, setResults] = useState<Result[]>([])` from state declarations.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/app/\(parent\)/academics.tsx
git commit -m "feat(parent-mobile): results grouped by academic year with rank badge"
```

---

## Task 3: Parent Mobile — Homework Calendar View

**Files:**
- Modify: `apps/mobile/app/(parent)/academics.tsx`

- [ ] **Step 1: Install `react-native-calendars`**

```bash
cd "/Users/dineshlearning/Documents/make money/erp/apps/mobile"
npx expo install react-native-calendars
```

Expected: package added to package.json, no errors.

- [ ] **Step 2: Add calendar state variables**

In the component state declarations, add:

```typescript
const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
const [calendarMonth, setCalendarMonth] = useState<{ year: number; month: number }>({
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
});
```

Also update the `Homework` interface to include `description`:

```typescript
interface Homework { id: string; title: string; subject: string; due_date: string; status: string; description: string }
```

- [ ] **Step 3: Update homework query in `loadData` to include description and filter by month**

Replace the homework fetch inside `loadData` with a function that accepts year/month params:

```typescript
async function loadHomeworkForMonth(sectionId: string, year: number, month: number) {
  const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).toISOString().split("T")[0];
  const { data } = await supabase
    .from("homework")
    .select("id, title, description, due_date, subjects(name)")
    .eq("section_id", sectionId)
    .gte("due_date", firstDay)
    .lte("due_date", lastDay)
    .order("due_date", { ascending: true });
  setHomework((data ?? []).map((h: any) => ({
    id: h.id,
    title: h.title,
    description: h.description ?? "",
    subject: h.subjects?.name ?? "",
    due_date: h.due_date,
    status: new Date(h.due_date) < new Date() ? "overdue" : "pending",
  })));
}
```

Also store `sectionId` in state so month changes can re-fetch:

```typescript
const [studentSectionId, setStudentSectionId] = useState<string | null>(null);
```

In `loadData`, after resolving `sp`, set `setStudentSectionId(sectionId)` and call `loadHomeworkForMonth(sectionId, calendarMonth.year, calendarMonth.month)` instead of the old homework fetch.

- [ ] **Step 4: Add `useEffect` to re-fetch on month change**

```typescript
useEffect(() => {
  if (studentSectionId) {
    loadHomeworkForMonth(studentSectionId, calendarMonth.year, calendarMonth.month);
  }
}, [calendarMonth.year, calendarMonth.month, studentSectionId]);
```

- [ ] **Step 5: Build the calendar marked dates object**

Add a derived `markedDates` computation (place just before the return statement):

```typescript
const SUBJECT_COLORS = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#3B82F6"];
const subjectColorMap: Record<string, string> = {};
let colorIndex = 0;

const markedDates: Record<string, any> = {};
for (const hw of homework) {
  if (!subjectColorMap[hw.subject]) {
    subjectColorMap[hw.subject] = SUBJECT_COLORS[colorIndex % SUBJECT_COLORS.length];
    colorIndex++;
  }
  if (!markedDates[hw.due_date]) {
    markedDates[hw.due_date] = { dots: [], selected: hw.due_date === selectedDate };
  }
  if (markedDates[hw.due_date].dots.length < 3) {
    markedDates[hw.due_date].dots.push({ color: subjectColorMap[hw.subject] });
  }
}
if (markedDates[selectedDate]) {
  markedDates[selectedDate].selected = true;
  markedDates[selectedDate].selectedColor = theme.primary + "30";
} else {
  markedDates[selectedDate] = { selected: true, selectedColor: theme.primary + "30" };
}
```

- [ ] **Step 6: Replace homework tab JSX with calendar + detail panel**

Replace the `tab === "homework"` JSX block with:

```tsx
<View style={{ gap: 0 }}>
  <Calendar
    markingType="multi-dot"
    markedDates={markedDates}
    onDayPress={(day: { dateString: string }) => setSelectedDate(day.dateString)}
    onMonthChange={(month: { year: number; month: number }) =>
      setCalendarMonth({ year: month.year, month: month.month })
    }
    theme={{
      backgroundColor: theme.surface,
      calendarBackground: theme.surface,
      textSectionTitleColor: theme.textMuted,
      selectedDayBackgroundColor: theme.primary,
      selectedDayTextColor: "#fff",
      todayTextColor: theme.primary,
      dayTextColor: theme.textPrimary,
      textDisabledColor: theme.textMuted,
      dotColor: theme.primary,
      arrowColor: theme.primary,
      monthTextColor: theme.textPrimary,
      textMonthFontFamily: "Inter_600SemiBold",
      textDayFontFamily: "Inter_400Regular",
      textDayHeaderFontFamily: "Inter_500Medium",
    }}
    style={{ borderRadius: 16, overflow: "hidden", marginBottom: 16 }}
  />
  {(() => {
    const dayHomework = homework.filter(h => h.due_date === selectedDate);
    return dayHomework.length === 0 ? (
      <Text style={{ textAlign: "center", color: theme.textMuted, fontFamily: "Inter_400Regular", paddingVertical: 24 }}>
        No homework for {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
      </Text>
    ) : (
      <View style={{ gap: 10 }}>
        <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: theme.textMuted, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 2 }}>
          {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
        </Text>
        {dayHomework.map((h) => (
          <View key={h.id} style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 16, gap: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: theme.textPrimary }}>{h.title}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                  <View style={{ backgroundColor: (subjectColorMap[h.subject] ?? theme.primary) + "20", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: subjectColorMap[h.subject] ?? theme.primary }}>{h.subject}</Text>
                  </View>
                </View>
              </View>
              <StatusBadge variant={h.status === "submitted" ? "paid" : h.status === "overdue" ? "overdue" : "pending"} />
            </View>
            {h.description ? (
              <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: theme.textSecondary }}>{h.description}</Text>
            ) : null}
          </View>
        ))}
      </View>
    );
  })()}
</View>
```

- [ ] **Step 7: Add Calendar import**

At the top of the file, add:

```typescript
import { Calendar } from "react-native-calendars";
```

- [ ] **Step 8: Commit**

```bash
git add apps/mobile/app/\(parent\)/academics.tsx apps/mobile/package.json
git commit -m "feat(parent-mobile): homework calendar view with day indicators and detail panel"
```

---

## Task 4: Teacher Mobile — Ranked Results Table

**Files:**
- Modify: `apps/mobile/app/(teacher)/classes.tsx`

- [ ] **Step 1: Add rank computation helper**

After the existing `gradeFromMarks` function, add:

```typescript
function computeRanks(items: ResultItem[]): (ResultItem & { rank: number; totalObtained: number })[] {
  // Group by exam: sum marks per student
  const examStudentTotals: Record<string, Record<string, number>> = {};
  for (const r of items) {
    if (!examStudentTotals["all"]) examStudentTotals["all"] = {};
    examStudentTotals["all"][r.student_name] = (examStudentTotals["all"][r.student_name] ?? 0) + r.marks_obtained;
  }
  // For display in ranked table, aggregate by student: sum across all subjects
  const studentAgg: Record<string, { student_name: string; totalObtained: number; totalMax: number; grade: string; id: string }> = {};
  for (const r of items) {
    if (!studentAgg[r.student_name]) {
      studentAgg[r.student_name] = { student_name: r.student_name, totalObtained: 0, totalMax: 0, grade: "", id: r.id };
    }
    studentAgg[r.student_name].totalObtained += r.marks_obtained;
    studentAgg[r.student_name].totalMax += r.max_marks;
  }
  const sorted = Object.values(studentAgg).sort((a, b) => b.totalObtained - a.totalObtained);
  let rank = 1;
  return sorted.map((s, i) => {
    if (i > 0 && sorted[i - 1].totalObtained > s.totalObtained) rank = i + 1;
    return { ...s, rank, subject: "", grade: gradeFromMarks(s.totalObtained, s.totalMax) } as any;
  });
}
```

- [ ] **Step 2: Update the results render section in the teacher classes screen**

Replace the `results.length === 0` empty block and the `results.map(...)` block inside the `tab === "results"` branch with:

```tsx
results.length === 0 ? (
  <View style={{ alignItems: "center", paddingVertical: 48, gap: 10 }}>
    <Ionicons name="trophy-outline" size={40} color={theme.textMuted} />
    <Text style={{ fontFamily: "Inter_500Medium", color: theme.textMuted, fontSize: 14 }}>No results entered yet</Text>
    <TouchableOpacity onPress={() => setShowAddResult(true)} style={{ marginTop: 4, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: theme.primary }}>
      <Text style={{ fontFamily: "Inter_600SemiBold", color: "#fff", fontSize: 14 }}>Enter First Result</Text>
    </TouchableOpacity>
  </View>
) : (() => {
  const ranked = computeRanks(results);
  const RANK_COLORS: Record<number, string> = { 1: "#F59E0B", 2: "#9CA3AF", 3: "#B45309" };
  return (
    <View style={{ gap: 8 }}>
      {ranked.map((r) => (
        <View key={r.id} style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View style={{
            width: 40, height: 40, borderRadius: 12,
            backgroundColor: (RANK_COLORS[r.rank] ?? theme.primary) + "18",
            alignItems: "center", justifyContent: "center"
          }}>
            <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: RANK_COLORS[r.rank] ?? theme.primary }}>
              {r.rank <= 3 ? ["🥇","🥈","🥉"][r.rank - 1] : `#${r.rank}`}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: theme.textPrimary }}>{r.student_name}</Text>
            <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: theme.textSecondary, marginTop: 2 }}>Grade {r.grade}</Text>
          </View>
          <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: theme.textSecondary }}>{r.totalObtained}/{r.totalMax}</Text>
        </View>
      ))}
    </View>
  );
})()
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/\(teacher\)/classes.tsx
git commit -m "feat(teacher-mobile): ranked results table with gold/silver/bronze badges"
```

---

## Task 5: Teacher Web — View Rankings Button + Leaderboard Page

**Files:**
- Modify: `apps/web/app/(school)/teacher/results/page.tsx`
- Create: `apps/web/app/(school)/teacher/results/[examId]/rankings/page.tsx`

- [ ] **Step 1: Add "View Rankings" link to the results page**

In `apps/web/app/(school)/teacher/results/page.tsx`, replace the `columns` array passed to `DataTable` with one that has both "Enter Marks" and "View Rankings":

```tsx
columns={[
  { header: "Exam", accessor: "name" },
  { header: "Academic Year", accessor: "academic_year" },
  { header: "Start", accessor: "start_date" },
  { header: "End", accessor: "end_date" },
  {
    header: "Actions",
    accessor: (row) => (
      <div className="flex gap-3">
        <Link
          href={`/teacher/results/${row.id}?sectionId=${sectionId}`}
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          Enter Marks
        </Link>
        <Link
          href={`/teacher/results/${row.id}/rankings?sectionId=${sectionId}`}
          className="text-sm font-medium text-indigo-600 hover:underline"
        >
          View Rankings
        </Link>
      </div>
    ),
  },
]}
```

- [ ] **Step 2: Create the rankings page**

Create `apps/web/app/(school)/teacher/results/[examId]/rankings/page.tsx`:

```tsx
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { getActiveSection } from "@/lib/section-context";
import { NoSectionPrompt } from "../../../no-section-prompt";
import Link from "next/link";

export default async function ExamRankingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ examId: string }>;
  searchParams: Promise<{ sectionId?: string }>;
}) {
  const { examId } = await params;
  const { sectionId: sectionIdParam } = await searchParams;
  const sectionId = sectionIdParam ?? (await getActiveSection());

  if (!sectionId) return <NoSectionPrompt />;

  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  const [{ data: examRow }, { data: resultsData }] = await Promise.all([
    supabase.from("exams").select("name, start_date, end_date").eq("id", examId).single(),
    supabase
      .from("exam_results")
      .select("student_id, marks_obtained, max_marks, grade, subjects(name), student_profiles!student_id(full_name)")
      .eq("exam_id", examId)
      .eq("school_id", schoolId),
  ]);

  // Aggregate per student
  const studentMap: Record<string, { name: string; totalObtained: number; totalMax: number; subjects: { subject: string; marks: number; max: number; grade: string }[] }> = {};
  for (const r of resultsData ?? []) {
    const rr = r as any;
    const sid = rr.student_id;
    if (!studentMap[sid]) {
      studentMap[sid] = { name: rr.student_profiles?.full_name ?? "—", totalObtained: 0, totalMax: 0, subjects: [] };
    }
    studentMap[sid].totalObtained += rr.marks_obtained ?? 0;
    studentMap[sid].totalMax += rr.max_marks ?? 100;
    studentMap[sid].subjects.push({ subject: rr.subjects?.name ?? "—", marks: rr.marks_obtained ?? 0, max: rr.max_marks ?? 100, grade: rr.grade ?? "—" });
  }

  const sorted = Object.entries(studentMap)
    .sort(([, a], [, b]) => b.totalObtained - a.totalObtained);

  let rank = 1;
  const ranked = sorted.map(([, s], i) => {
    if (i > 0 && sorted[i - 1][1].totalObtained > s.totalObtained) rank = i + 1;
    return { ...s, rank };
  });

  const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link href={`/teacher/results/${examId}?sectionId=${sectionId}`} className="text-sm text-gray-500 hover:underline">← Back to Marks Entry</Link>
        <h1 className="text-2xl font-bold text-gray-900">
          Rankings — {examRow?.name ?? "Exam"}
        </h1>
      </div>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Rank</th>
              <th className="px-4 py-3 text-left">Student</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-left">Subjects</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {ranked.map((r, i) => (
              <tr key={i} className={r.rank <= 3 ? "bg-amber-50" : ""}>
                <td className="px-4 py-3 font-bold text-gray-800">
                  {MEDAL[r.rank] ?? `#${r.rank}`}
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-800">
                  {r.totalObtained}/{r.totalMax}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {r.subjects.map((s, si) => (
                    <span key={si} className="mr-3">{s.subject}: {s.marks}/{s.max} ({s.grade})</span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {ranked.length === 0 && (
          <p className="p-8 text-center text-gray-400">No results entered for this exam yet.</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add "apps/web/app/(school)/teacher/results/page.tsx" "apps/web/app/(school)/teacher/results/[examId]/rankings/page.tsx"
git commit -m "feat(teacher-web): view rankings button and ranked leaderboard page per exam"
```

---

## Task 6: Parent Mobile — Two-Type Feedback in `more.tsx`

**Files:**
- Modify: `apps/mobile/app/(parent)/more.tsx`

- [ ] **Step 1: Add new state and types for feedback**

In `more.tsx`, replace the existing `Section` type and the single `feedback` string state with:

```typescript
type Section = "menu" | "announcements" | "discipline" | "feedback-teacher" | "feedback-management" | "profile";

// Replace: const [feedback, setFeedback] = useState("");
const [teacherFeedback, setTeacherFeedback] = useState({ subject: "", message: "" });
const [managementFeedback, setManagementFeedback] = useState({ subject: "", message: "", toRole: "principal" as "principal" | "school_admin" });
const [classteacherId, setClassteacherId] = useState<string | null>(null);
```

- [ ] **Step 2: Fetch class teacher ID in `loadProfile`**

In `loadProfile`, after fetching `sp`, look up the class teacher for the student's section:

```typescript
if (sp) {
  const s = sp as any;
  setStudent({ ... }); // existing code

  // Fetch class teacher for feedback routing
  if (s.sections?.id || s.section_id) {
    const sectionId = s.sections?.id ?? s.section_id;
    const { data: tp } = await supabase
      .from("teacher_profiles")
      .select("profile_id")
      .eq("class_teacher_of", sectionId)
      .maybeSingle();
    setClassteacherId(tp?.profile_id ?? null);
  }
}
```

Note: The existing `loadProfile` query selects `sections(name, classes(name))` — update it to also select `sections(id, name, classes(name))` so `s.sections.id` is available.

- [ ] **Step 3: Replace `submitFeedback` with two submit functions**

Remove the old `submitFeedback` function. Add:

```typescript
async function submitTeacherFeedback() {
  if (!teacherFeedback.subject.trim() || !teacherFeedback.message.trim()) {
    Alert.alert("Required", "Please fill in subject and message."); return;
  }
  setSubmitting(true);
  const { data: { user } } = await supabase.auth.getUser();
  const { data: prof } = await supabase.from("profiles").select("school_id").eq("id", user!.id).single();
  await supabase.from("feedback").insert({
    school_id: prof?.school_id,
    from_user_id: user?.id,
    to_role: "teacher",
    to_user_id: classteacherId,
    subject: teacherFeedback.subject.trim(),
    message: teacherFeedback.message.trim(),
    status: "open",
  });
  setTeacherFeedback({ subject: "", message: "" });
  setSubmitting(false);
  setSection("menu");
  Alert.alert("Sent", "Your message has been sent to the teacher.");
}

async function submitManagementFeedback() {
  if (!managementFeedback.subject.trim() || !managementFeedback.message.trim()) {
    Alert.alert("Required", "Please fill in subject and message."); return;
  }
  setSubmitting(true);
  const { data: { user } } = await supabase.auth.getUser();
  const { data: prof } = await supabase.from("profiles").select("school_id").eq("id", user!.id).single();
  await supabase.from("feedback").insert({
    school_id: prof?.school_id,
    from_user_id: user?.id,
    to_role: managementFeedback.toRole,
    to_user_id: null,
    subject: managementFeedback.subject.trim(),
    message: managementFeedback.message.trim(),
    status: "open",
  });
  setManagementFeedback({ subject: "", message: "", toRole: "principal" });
  setSubmitting(false);
  setSection("menu");
  Alert.alert("Sent", "Your message has been sent to the management.");
}
```

- [ ] **Step 4: Replace feedback render in the detail section**

In the `section !== "menu"` return block, replace:

```tsx
{section === "feedback" && ( ... )}
```

with:

```tsx
{section === "feedback-teacher" && (
  <View style={{ gap: 14 }}>
    <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: theme.textSecondary }}>
      Your message will be sent to your child's class teacher.
    </Text>
    <View>
      <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: theme.textSecondary, marginBottom: 6 }}>Subject</Text>
      <TextInput
        style={{ backgroundColor: theme.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: theme.border, fontSize: 14, fontFamily: "Inter_400Regular", color: theme.textPrimary }}
        placeholder="e.g. Homework concern"
        placeholderTextColor={theme.textMuted}
        value={teacherFeedback.subject}
        onChangeText={(v) => setTeacherFeedback(p => ({ ...p, subject: v }))}
      />
    </View>
    <View>
      <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: theme.textSecondary, marginBottom: 6 }}>Message</Text>
      <TextInput
        style={{ backgroundColor: theme.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: theme.border, fontSize: 14, fontFamily: "Inter_400Regular", color: theme.textPrimary, minHeight: 120, textAlignVertical: "top" }}
        placeholder="Write your message..."
        placeholderTextColor={theme.textMuted}
        multiline
        value={teacherFeedback.message}
        onChangeText={(v) => setTeacherFeedback(p => ({ ...p, message: v }))}
      />
    </View>
    <PrimaryButton label="Send to Teacher" onPress={submitTeacherFeedback} loading={submitting} />
  </View>
)}
{section === "feedback-management" && (
  <View style={{ gap: 14 }}>
    <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: theme.textSecondary }}>
      Send a formal message to school management.
    </Text>
    {/* To: selector */}
    <View style={{ flexDirection: "row", gap: 10 }}>
      {(["principal", "school_admin"] as const).map((role) => (
        <TouchableOpacity
          key={role}
          onPress={() => setManagementFeedback(p => ({ ...p, toRole: role }))}
          style={{
            flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1,
            borderColor: managementFeedback.toRole === role ? theme.primary : theme.border,
            backgroundColor: managementFeedback.toRole === role ? theme.primary + "15" : theme.surface,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: managementFeedback.toRole === role ? theme.primary : theme.textSecondary }}>
            {role === "principal" ? "Principal" : "Admin"}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
    <View>
      <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: theme.textSecondary, marginBottom: 6 }}>Subject</Text>
      <TextInput
        style={{ backgroundColor: theme.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: theme.border, fontSize: 14, fontFamily: "Inter_400Regular", color: theme.textPrimary }}
        placeholder="e.g. Fee inquiry"
        placeholderTextColor={theme.textMuted}
        value={managementFeedback.subject}
        onChangeText={(v) => setManagementFeedback(p => ({ ...p, subject: v }))}
      />
    </View>
    <View>
      <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: theme.textSecondary, marginBottom: 6 }}>Message</Text>
      <TextInput
        style={{ backgroundColor: theme.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: theme.border, fontSize: 14, fontFamily: "Inter_400Regular", color: theme.textPrimary, minHeight: 120, textAlignVertical: "top" }}
        placeholder="Write your message..."
        placeholderTextColor={theme.textMuted}
        multiline
        value={managementFeedback.message}
        onChangeText={(v) => setManagementFeedback(p => ({ ...p, message: v }))}
      />
    </View>
    <PrimaryButton label="Send to Management" onPress={submitManagementFeedback} loading={submitting} />
  </View>
)}
```

- [ ] **Step 5: Update the header title for the two new sections**

The existing back-nav header uses `section` as the title. Update to show a readable title:

```typescript
const sectionTitle: Record<Section, string> = {
  menu: "More",
  announcements: "Announcements",
  discipline: "Discipline Records",
  "feedback-teacher": "Message Teacher",
  "feedback-management": "Contact Management",
  profile: "Profile",
};
```

Replace `{section}` in the header `Text` with `{sectionTitle[section]}`.

- [ ] **Step 6: Replace the single Feedback ListItem in the menu with two cards**

Replace:
```tsx
<ListItem icon="chatbubble-outline" title="Feedback" subtitle="Send feedback to school" onPress={() => navigate("feedback")} />
```

with:
```tsx
<ListItem icon="chatbubble-ellipses-outline" title="Message Teacher" subtitle="Connect with your child's class teacher" onPress={() => navigate("feedback-teacher")} />
<ListItem icon="business-outline" title="Contact Management" subtitle="Reach out to the principal or admin" onPress={() => navigate("feedback-management")} />
```

- [ ] **Step 7: Update `navigate` to handle new section keys**

Remove `if (s === "announcements") loadAnnouncements();` — keep that and `if (s === "discipline") loadDiscipline();`. No changes needed for the feedback sections.

- [ ] **Step 8: Commit**

```bash
git add apps/mobile/app/\(parent\)/more.tsx
git commit -m "feat(parent-mobile): two-type feedback - message teacher vs contact management"
```

---

## Task 7: Teacher Web — Tighten Feedback Query + Filter Tabs

**Files:**
- Modify: `apps/web/app/(school)/teacher/feedback/page.tsx`
- Modify: `apps/web/app/(school)/teacher/feedback/feedback-list.tsx`

- [ ] **Step 1: Update the server query in `page.tsx` to filter by `to_user_id`**

Replace the `.eq("to_role", "teacher")` filter with:

```typescript
.eq("to_role", "teacher")
.eq("to_user_id", user!.id)
```

Full updated fetch:

```typescript
const { data: feedback } = await supabase
  .from("feedback")
  .select(
    "id, subject, message, status, created_at, response, from_user:profiles!feedback_from_user_id_fkey(full_name)"
  )
  .eq("school_id", schoolId)
  .eq("to_role", "teacher")
  .eq("to_user_id", user!.id)
  .order("created_at", { ascending: false });
```

- [ ] **Step 2: Add `from_role` to the `FeedbackItem` interface in `feedback-list.tsx`**

Update `FeedbackItem`:

```typescript
interface FeedbackItem {
  id: string;
  subject: string;
  message: string;
  from_name: string;
  from_role: string;
  status: string;
  response: string;
  created_at: string;
}
```

- [ ] **Step 3: Add filter tabs to `FeedbackList` component**

At the top of `FeedbackList`, add filter state and tabs:

```tsx
export function FeedbackList({ items }: { items: FeedbackItem[] }) {
  const [filter, setFilter] = useState<"all" | "parents">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  // ... existing state

  const filtered = filter === "parents"
    ? items.filter(i => i.from_role === "parent")
    : items;

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {(["all", "parents"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              filter === f
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {f === "all" ? "All" : "From Parents"}
          </button>
        ))}
      </div>
      <div className="grid gap-4">
        {/* render `filtered` instead of `items` */}
      </div>
    </div>
  );
}
```

Replace `items.map(...)` with `filtered.map(...)` in the existing cards render.

- [ ] **Step 4: Pass `from_role` from `page.tsx`**

Update the select query in `page.tsx` to also fetch the sender's role:

```typescript
.select(
  "id, subject, message, status, created_at, response, from_user:profiles!feedback_from_user_id_fkey(full_name), from_role_row:user_roles!feedback_from_user_id_fkey(role)"
)
```

And in the `.map()`:

```typescript
const fromUser = f.from_user as unknown as { full_name: string } | null;
const fromRoleRow = (f as any).from_role_row as { role: string } | null;
return {
  ...
  from_role: fromRoleRow?.role ?? "",
};
```

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/(school)/teacher/feedback/page.tsx" "apps/web/app/(school)/teacher/feedback/feedback-list.tsx"
git commit -m "feat(teacher-web): tighten feedback query to own messages + From Parents filter tab"
```

---

## Task 8: Admin & Principal Web — Management Feedback Inbox + Nav

**Files:**
- Create: `apps/web/app/(school)/admin/feedback/page.tsx`
- Create: `apps/web/app/(school)/principal/feedback/page.tsx`
- Modify: `apps/web/app/(school)/layout.tsx`

- [ ] **Step 1: Create admin feedback inbox page**

Create `apps/web/app/(school)/admin/feedback/page.tsx`:

```tsx
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { FeedbackList } from "../../teacher/feedback/feedback-list";

export default async function AdminFeedbackPage() {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  const { data: feedback } = await supabase
    .from("feedback")
    .select(
      "id, subject, message, status, created_at, response, from_user:profiles!feedback_from_user_id_fkey(full_name)"
    )
    .eq("school_id", schoolId)
    .eq("to_role", "school_admin")
    .order("created_at", { ascending: false });

  const items = (feedback ?? []).map((f) => {
    const fromUser = f.from_user as unknown as { full_name: string } | null;
    return {
      id: f.id,
      subject: f.subject ?? "—",
      message: f.message ?? "—",
      from_name: fromUser?.full_name ?? "—",
      from_role: "parent",
      status: f.status ?? "open",
      response: f.response ?? "",
      created_at: f.created_at ? new Date(f.created_at).toLocaleDateString() : "—",
    };
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Feedback — Management</h1>
      <FeedbackList items={items} />
    </div>
  );
}
```

- [ ] **Step 2: Create principal feedback inbox page**

Create `apps/web/app/(school)/principal/feedback/page.tsx`:

```tsx
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { FeedbackList } from "../../teacher/feedback/feedback-list";

export default async function PrincipalFeedbackPage() {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  const { data: feedback } = await supabase
    .from("feedback")
    .select(
      "id, subject, message, status, created_at, response, from_user:profiles!feedback_from_user_id_fkey(full_name)"
    )
    .eq("school_id", schoolId)
    .eq("to_role", "principal")
    .order("created_at", { ascending: false });

  const items = (feedback ?? []).map((f) => {
    const fromUser = f.from_user as unknown as { full_name: string } | null;
    return {
      id: f.id,
      subject: f.subject ?? "—",
      message: f.message ?? "—",
      from_name: fromUser?.full_name ?? "—",
      from_role: "parent",
      status: f.status ?? "open",
      response: f.response ?? "",
      created_at: f.created_at ? new Date(f.created_at).toLocaleDateString() : "—",
    };
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Feedback — From Parents</h1>
      <FeedbackList items={items} />
    </div>
  );
}
```

- [ ] **Step 3: Add Feedback to admin and principal nav in `layout.tsx`**

In `apps/web/app/(school)/layout.tsx`, in the `NAV_ITEMS` object:

Add to `school_admin` array (after "Discipline"):
```typescript
{ label: "Feedback", href: "/admin/feedback" },
```

Add to `principal` array (after "Discipline"):
```typescript
{ label: "Feedback", href: "/principal/feedback" },
```

- [ ] **Step 4: Commit**

```bash
git add "apps/web/app/(school)/admin/feedback/page.tsx" "apps/web/app/(school)/principal/feedback/page.tsx" "apps/web/app/(school)/layout.tsx"
git commit -m "feat(web): admin + principal feedback inbox pages with nav links"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** Results (parent mobile grouped + rank ✓, teacher mobile ranked ✓, teacher web leaderboard ✓), Homework calendar (install library ✓, dots ✓, day panel ✓, month re-fetch ✓), Feedback two types (parent mobile ✓, teacher web tightened + filter ✓, admin inbox ✓, principal inbox ✓, migration ✓, nav ✓)
- [x] **Placeholders:** None — all steps have concrete code
- [x] **Type consistency:** `ExamResult`, `SubjectResult` used consistently in Task 2–3. `FeedbackItem.from_role` added in Task 7 Step 2 and passed in Step 4. `computeRanks` input/output uses `ResultItem` from existing interface.
- [x] **Migration:** Task 1 runs before any feedback insert (Tasks 6–8 depend on `to_user_id` column existing)
