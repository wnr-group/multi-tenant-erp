import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/theme";
import { Avatar } from "../../components/Avatar";
import { PrimaryButton } from "../../components/PrimaryButton";
import { StatusBadge } from "../../components/StatusBadge";
import { SkeletonCard } from "../../components/Skeleton";

type AttendanceStatus = "present" | "absent" | "late";

interface Student { id: string; full_name: string; roll_number: string }

export default function TeacherAttendance() {
  const theme = useTheme();
  const [students, setStudents] = useState<Student[]>([]);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [classId, setClassId] = useState<string | null>(null);
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => { loadClass(); }, []);

  async function loadClass() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: tp } = await supabase.from("teacher_profiles").select("class_teacher_of").eq("profile_id", user.id).single();
    const sectionId = tp?.class_teacher_of;
    setClassId(sectionId);

    if (!sectionId) { setLoading(false); return; }

    const { data: studentData } = await supabase
      .from("student_profiles")
      .select("profile_id, roll_number, full_name")
      .eq("section_id", sectionId)
      .order("roll_number");

    const studentList: Student[] = (studentData ?? []).map((s: any) => ({
      id: s.profile_id,
      full_name: s.full_name ?? "Student",
      roll_number: s.roll_number,
    }));

    const { data: existing } = await supabase
      .from("attendance_records")
      .select("student_id, status")
      .eq("section_id", sectionId)
      .eq("date", today);

    const existingMap = Object.fromEntries((existing ?? []).map((r: any) => [r.student_id, r.status as AttendanceStatus]));
    const defaultStatuses = Object.fromEntries(studentList.map((s) => [s.id, existingMap[s.id] ?? "present" as AttendanceStatus]));

    setStudents(studentList);
    setStatuses(defaultStatuses);
    setLoading(false);
  }

  function cycleStatus(studentId: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStatuses((prev) => {
      const current = prev[studentId] ?? "present";
      const next: AttendanceStatus = current === "present" ? "absent" : current === "absent" ? "late" : "present";
      return { ...prev, [studentId]: next };
    });
  }

  function markAll(status: AttendanceStatus) {
    setStatuses(Object.fromEntries(students.map((s) => [s.id, status])));
  }

  async function saveAttendance() {
    if (!classId) return;
    setSaving(true);
    const records = students.map((s) => ({
      student_id: s.id,
      section_id: classId,
      date: today,
      status: statuses[s.id] ?? "present",
    }));
    const { error } = await supabase.from("attendance_records").upsert(records, { onConflict: "student_id,date" });
    setSaving(false);
    if (error) Alert.alert("Error", error.message);
    else Alert.alert("Saved", "Attendance recorded successfully.");
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flex: 1 }}>
        <View style={{ padding: 20, gap: 4 }}>
          <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: theme.textPrimary }}>Mark Attendance</Text>
          <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: theme.textSecondary }}>{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</Text>
        </View>

        {!loading && students.length > 0 && (
          <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 20, marginBottom: 12 }}>
            <TouchableOpacity onPress={() => markAll("present")} style={{ flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: theme.success + "1A", alignItems: "center" }}>
              <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: theme.success }}>All Present</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => markAll("absent")} style={{ flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: theme.danger + "1A", alignItems: "center" }}>
              <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: theme.danger }}>All Absent</Text>
            </TouchableOpacity>
          </View>
        )}

        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 100 }}>
          {loading ? (
            [0,1,2,3,4].map(i => <SkeletonCard key={i} />)
          ) : students.length === 0 ? (
            <Text style={{ textAlign: "center", color: theme.textMuted, fontFamily: "Inter_400Regular", paddingVertical: 40 }}>No students found for your class</Text>
          ) : students.map((student) => (
            <TouchableOpacity key={student.id} onPress={() => cycleStatus(student.id)} style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 }} activeOpacity={0.7}>
              <Avatar name={student.full_name} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: theme.textPrimary }}>{student.full_name}</Text>
                <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: theme.textSecondary }}>Roll #{student.roll_number}</Text>
              </View>
              <StatusBadge variant={statuses[student.id] ?? "present"} />
            </TouchableOpacity>
          ))}
        </ScrollView>

        {!loading && students.length > 0 && (
          <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: theme.background, borderTopWidth: 1, borderTopColor: theme.border }}>
            <PrimaryButton label={`Save Attendance (${students.length} students)`} onPress={saveAttendance} loading={saving} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
