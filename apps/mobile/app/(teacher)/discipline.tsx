import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/theme";
import { PrimaryButton } from "../../components/PrimaryButton";
import { SkeletonCard } from "../../components/Skeleton";

interface DisciplineRecord { id: string; student_name: string; incident_date: string; description: string; action_taken: string }

export default function TeacherDiscipline() {
  const theme = useTheme();
  const [records, setRecords] = useState<DisciplineRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ student_name: "", description: "", action_taken: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadRecords(); }, []);

  async function loadRecords() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("discipline_records").select("id, incident_date, description, action_taken, profiles(full_name)").eq("teacher_id", user.id).order("incident_date", { ascending: false }).limit(30);
    setRecords((data ?? []).map((r: any) => ({ ...r, student_name: r.profiles?.full_name ?? "Student" })));
    setLoading(false);
  }

  async function addRecord() {
    if (!form.student_name.trim() || !form.description.trim() || !form.action_taken.trim()) {
      Alert.alert("Missing fields", "Please fill all fields.");
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: roleData } = await supabase.from("user_roles").select("class_id, school_id").eq("user_id", user?.id).eq("is_active", true).single();
    await supabase.from("discipline_records").insert({
      description: form.description.trim(),
      action_taken: form.action_taken.trim(),
      incident_date: new Date().toISOString().split("T")[0],
      teacher_id: user?.id,
      school_id: roleData?.school_id,
    });
    setSaving(false);
    setShowAdd(false);
    setForm({ student_name: "", description: "", action_taken: "" });
    loadRecords();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: theme.textPrimary }}>Discipline</Text>
        <TouchableOpacity onPress={() => setShowAdd(true)} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: theme.primaryLight, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="add" size={22} color={theme.primary} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 20 }}>
        {loading ? [0,1,2].map(i => <SkeletonCard key={i} />) :
          records.length === 0 ? (
            <Text style={{ textAlign: "center", color: theme.textMuted, fontFamily: "Inter_400Regular", paddingVertical: 40 }}>No discipline records</Text>
          ) : records.map((r) => (
            <View key={r.id} style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 16, gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: theme.textPrimary }}>{r.student_name}</Text>
                <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: theme.textMuted }}>{new Date(r.incident_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</Text>
              </View>
              <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: theme.textSecondary }}>{r.description}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.warning }} />
                <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: theme.warning }}>{r.action_taken}</Text>
              </View>
            </View>
          ))
        }
      </ScrollView>

      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: theme.textPrimary }}>Log Incident</Text>
              <TouchableOpacity onPress={() => setShowAdd(false)}><Ionicons name="close" size={24} color={theme.textMuted} /></TouchableOpacity>
            </View>
            {[
              { key: "student_name", label: "Student Name", placeholder: "Full name" },
              { key: "description", label: "Incident Description", placeholder: "What happened?" },
              { key: "action_taken", label: "Action Taken", placeholder: "e.g. Warning issued" },
            ].map((f) => (
              <View key={f.key}>
                <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: theme.textSecondary, marginBottom: 4 }}>{f.label}</Text>
                <TextInput
                  style={{ backgroundColor: theme.surfaceRaised, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: theme.border, fontSize: 14, fontFamily: "Inter_400Regular", color: theme.textPrimary }}
                  placeholder={f.placeholder}
                  placeholderTextColor={theme.textMuted}
                  value={(form as any)[f.key]}
                  onChangeText={(v) => setForm((prev) => ({ ...prev, [f.key]: v }))}
                  multiline={f.key !== "student_name"}
                />
              </View>
            ))}
            <PrimaryButton label="Log Incident" onPress={addRecord} loading={saving} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
