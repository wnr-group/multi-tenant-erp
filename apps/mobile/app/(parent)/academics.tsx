import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/theme";
import { StatusBadge } from "../../components/StatusBadge";
import { SectionHeader } from "../../components/SectionHeader";
import { SkeletonCard } from "../../components/Skeleton";

interface Result { id: string; subject: string; marks_obtained: number; max_marks: number; grade: string; term: string }
interface Homework { id: string; title: string; subject: string; due_date: string; status: string }

export default function ParentAcademics() {
  const theme = useTheme();
  const [tab, setTab] = useState<"results" | "homework">("results");
  const [results, setResults] = useState<Result[]>([]);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // Look up parent's student
    const { data: sp } = await supabase.from("student_profiles").select("profile_id").eq("parent_profile_id", user.id).single();
    const studentId = sp?.profile_id;
    const [resultsRes, homeworkRes] = await Promise.all([
      studentId
        ? supabase.from("exam_results").select("id, marks_obtained, max_marks, grade, subjects(name), exams(name)").eq("student_id", studentId).order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      supabase.from("homework").select("id, title, due_date, subjects(name)").order("due_date", { ascending: false }).limit(20),
    ]);
    setResults((resultsRes.data ?? []).map((r: any) => ({
      id: r.id,
      subject: r.subjects?.name ?? "",
      marks_obtained: r.marks_obtained,
      max_marks: r.max_marks,
      grade: r.grade,
      term: r.exams?.name ?? "",
    })));
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
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }} showsVerticalScrollIndicator={false}>
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
          <View style={{ gap: 8 }}>
            {results.length === 0 ? (
              <Text style={{ textAlign: "center", color: theme.textMuted, fontFamily: "Inter_400Regular", paddingVertical: 32 }}>No results yet</Text>
            ) : results.map((r) => (
              <View key={r.id} style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View>
                  <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: theme.textPrimary }}>{r.subject}</Text>
                  <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: theme.textSecondary, marginTop: 2 }}>{r.term}</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: theme.primary }}>{r.grade}</Text>
                  <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: theme.textMuted }}>{r.marks_obtained}/{r.max_marks}</Text>
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
