import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
interface Homework { id: string; title: string; subject: string; due_date: string; status: string }

export default function ParentAcademics() {
  const theme = useTheme();
  const [tab, setTab] = useState<"results" | "homework">("results");
  const [groupedResults, setGroupedResults] = useState<Record<string, ExamResult[]>>({});
  const [expandedExamId, setExpandedExamId] = useState<string | null>(null);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadData(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

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

    // Fetch homework for this month
    const homeworkRes = sectionId
      ? await supabase
          .from("homework")
          .select("id, title, due_date, subjects(name)")
          .eq("section_id", sectionId)
          .order("due_date", { ascending: true })
      : { data: [] };

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

    setHomework((homeworkRes.data ?? []).map((h: any) => ({
      id: h.id,
      title: h.title,
      subject: h.subjects?.name ?? "",
      due_date: h.due_date,
      status: new Date(h.due_date) < new Date() ? "overdue" : "pending",
    })));
    setLoading(false);
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
          <View style={{ gap: 8 }}>
            {homework.length === 0 ? (
              <Text style={{ textAlign: "center", color: theme.textMuted, fontFamily: "Inter_400Regular", paddingVertical: 32 }}>No homework assigned</Text>
            ) : homework.map((h) => (
              <View key={h.id} style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: theme.textPrimary }}>{h.title}</Text>
                  <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: theme.textSecondary, marginTop: 2 }}>{h.subject} · Due {new Date(h.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</Text>
                </View>
                <StatusBadge variant={h.status === "submitted" ? "paid" : new Date(h.due_date) < new Date() ? "overdue" : "pending"} />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
