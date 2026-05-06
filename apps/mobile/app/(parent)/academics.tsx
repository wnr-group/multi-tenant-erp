import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar } from "react-native-calendars";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/theme";
import { StatusBadge } from "../../components/StatusBadge";
import { SectionHeader } from "../../components/SectionHeader";
import { SkeletonCard } from "../../components/Skeleton";

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
interface Homework { id: string; title: string; subject: string; due_date: string; status: string; description: string }

export default function ParentAcademics() {
  const theme = useTheme();
  const [tab, setTab] = useState<"results" | "homework">("results");
  const [groupedResults, setGroupedResults] = useState<Record<string, ExamResult[]>>({});
  const [expandedExamId, setExpandedExamId] = useState<string | null>(null);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [calendarMonth, setCalendarMonth] = useState<{ year: number; month: number }>({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  });
  const [studentSectionId, setStudentSectionId] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (studentSectionId) {
      loadHomeworkForMonth(studentSectionId, calendarMonth.year, calendarMonth.month);
    }
  }, [calendarMonth.year, calendarMonth.month, studentSectionId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

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
    setStudentSectionId(sectionId ?? null);

    // Fetch this student's exam results with exam + academic year info
    const resultsRes = studentId
      ? await supabase
          .from("exam_results")
          .select("id, marks_obtained, max_marks, grade, exam_id, subjects(name), exams(id, name, start_date, end_date, academic_years(name))")
          .eq("student_id", studentId)
      : { data: [] };

    // Fetch all exam results in same exams (for rank computation)
    const myExamIds = ((resultsRes.data ?? []) as any[])
      .map((r: any) => r.exams?.id ?? r.exam_id)
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i);

    const allSectionResultsRes = myExamIds.length > 0
      ? await supabase
          .from("exam_results")
          .select("student_id, exam_id, marks_obtained")
          .in("exam_id", myExamIds)
      : { data: [] };

    // Homework is loaded via loadHomeworkForMonth after sectionId is stored

    // Build per-exam totals for all students (for rank)
    const allResults = (allSectionResultsRes.data ?? []) as any[];
    const studentTotals: Record<string, Record<string, number>> = {};
    for (const r of allResults) {
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

    if (sectionId) {
      await loadHomeworkForMonth(sectionId, new Date().getFullYear(), new Date().getMonth() + 1);
    } else {
      setHomework([]);
    }
    setLoading(false);
  }

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

  return (
    <SafeAreaView edges={["bottom"]} style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: theme.textPrimary }}>Academics</Text>

        {/* Segmented control */}
        <View style={{ flexDirection: "row", backgroundColor: theme.surface, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: theme.border }}>
          {(["results", "homework"] as const).map((t) => (
            <TouchableOpacity key={t} onPress={() => setTab(t)} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: tab === t ? theme.primary : "transparent", alignItems: "center" }}>
              <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: tab === t ? "#fff" : theme.textSecondary, textTransform: "capitalize" }}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={{ gap: 8 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>
        ) : tab === "results" ? (
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
        ) : (
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
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
