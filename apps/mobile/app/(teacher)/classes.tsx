import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/theme";
import { PrimaryButton } from "../../components/PrimaryButton";
import { SkeletonCard } from "../../components/Skeleton";

type Tab = "homework" | "results";

interface HomeworkItem { id: string; title: string; subject: string; due_date: string; class_name: string }
interface ResultItem { id: string; student_name: string; subject: string; marks_obtained: number; max_marks: number; grade: string }

export default function TeacherClasses() {
  const theme = useTheme();
  const [tab, setTab] = useState<Tab>("homework");
  const [homework, setHomework] = useState<HomeworkItem[]>([]);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddHomework, setShowAddHomework] = useState(false);
  const [newHW, setNewHW] = useState({ title: "", subject: "", due_date: "", description: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [hwRes, resultsRes] = await Promise.all([
      supabase.from("homework").select("id, title, due_date, subjects(name), sections(name, classes(name))").eq("teacher_id", user.id).order("due_date", { ascending: false }).limit(20),
      supabase.from("exam_results").select("id, marks_obtained, max_marks, grade, subjects(name), student_profiles!student_id(full_name)").eq("teacher_id", user.id).order("created_at", { ascending: false }).limit(30),
    ]);

    setHomework((hwRes.data ?? []).map((r: any) => ({
      id: r.id,
      title: r.title,
      subject: r.subjects?.name ?? "",
      due_date: r.due_date,
      class_name: r.sections ? `${r.sections.classes?.name ?? ""} ${r.sections.name ?? ""}`.trim() : "",
    })));
    setResults((resultsRes.data ?? []).map((r: any) => ({
      id: r.id,
      student_name: r.student_profiles?.full_name ?? "Student",
      subject: r.subjects?.name ?? "",
      marks_obtained: r.marks_obtained,
      max_marks: r.max_marks,
      grade: r.grade,
    })));
    setLoading(false);
  }

  async function addHomework() {
    if (!newHW.title.trim() || !newHW.subject.trim() || !newHW.due_date.trim()) {
      Alert.alert("Missing fields", "Please fill in title, subject and due date.");
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: roleData } = await supabase.from("user_roles").select("school_id").eq("user_id", user?.id).eq("is_active", true).single();
    const { data: tp } = await supabase.from("teacher_profiles").select("class_teacher_of").eq("profile_id", user?.id).single();
    const { data: sectionData } = tp?.class_teacher_of
      ? await supabase.from("sections").select("id, class_id").eq("id", tp.class_teacher_of).single()
      : { data: null };
    await supabase.from("homework").insert({
      title: newHW.title.trim(),
      due_date: newHW.due_date.trim(),
      description: newHW.description.trim(),
      teacher_id: user?.id,
      class_id: sectionData?.class_id,
      section_id: tp?.class_teacher_of,
      school_id: roleData?.school_id,
    });
    setSaving(false);
    setShowAddHomework(false);
    setNewHW({ title: "", subject: "", due_date: "", description: "" });
    loadData();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: theme.textPrimary }}>Classes</Text>
        {tab === "homework" && (
          <TouchableOpacity onPress={() => setShowAddHomework(true)} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: theme.primaryLight, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="add" size={22} color={theme.primary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={{ flexDirection: "row", backgroundColor: theme.surface, borderRadius: 12, margin: 20, marginTop: 0, padding: 4, borderWidth: 1, borderColor: theme.border }}>
        {(["homework", "results"] as const).map((t) => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: tab === t ? theme.primary : "transparent", alignItems: "center" }}>
            <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: tab === t ? "#fff" : theme.textSecondary, textTransform: "capitalize" }}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 20 }}>
        {loading ? [0,1,2].map(i => <SkeletonCard key={i} />) :
          tab === "homework" ? (
            homework.length === 0 ? (
              <Text style={{ textAlign: "center", color: theme.textMuted, fontFamily: "Inter_400Regular", paddingVertical: 32 }}>No homework assigned</Text>
            ) : homework.map((h) => (
              <View key={h.id} style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 16, gap: 4 }}>
                <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: theme.textPrimary }}>{h.title}</Text>
                <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: theme.textSecondary }}>{h.subject} · {h.class_name}</Text>
                <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: theme.textMuted }}>Due {new Date(h.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</Text>
              </View>
            ))
          ) : (
            results.length === 0 ? (
              <Text style={{ textAlign: "center", color: theme.textMuted, fontFamily: "Inter_400Regular", paddingVertical: 32 }}>No results entered</Text>
            ) : results.map((r) => (
              <View key={r.id} style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View>
                  <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: theme.textPrimary }}>{r.student_name}</Text>
                  <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: theme.textSecondary }}>{r.subject}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: theme.primary }}>{r.grade}</Text>
                  <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: theme.textMuted }}>{r.marks_obtained}/{r.max_marks}</Text>
                </View>
              </View>
            ))
          )
        }
      </ScrollView>

      <Modal visible={showAddHomework} transparent animationType="slide" onRequestClose={() => setShowAddHomework(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: theme.textPrimary }}>Add Homework</Text>
              <TouchableOpacity onPress={() => setShowAddHomework(false)}>
                <Ionicons name="close" size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
            {[
              { key: "title", placeholder: "Title", label: "Title" },
              { key: "subject", placeholder: "e.g. Mathematics", label: "Subject" },
              { key: "due_date", placeholder: "YYYY-MM-DD", label: "Due Date" },
              { key: "description", placeholder: "Optional description", label: "Description" },
            ].map((field) => (
              <View key={field.key}>
                <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: theme.textSecondary, marginBottom: 4 }}>{field.label}</Text>
                <TextInput
                  style={{ backgroundColor: theme.surfaceRaised, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: theme.border, fontSize: 14, fontFamily: "Inter_400Regular", color: theme.textPrimary }}
                  placeholder={field.placeholder}
                  placeholderTextColor={theme.textMuted}
                  value={(newHW as any)[field.key]}
                  onChangeText={(v) => setNewHW((prev) => ({ ...prev, [field.key]: v }))}
                />
              </View>
            ))}
            <PrimaryButton label="Add Homework" onPress={addHomework} loading={saving} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
