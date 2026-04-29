import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/theme";
import { useTeacherContext } from "../../lib/teacherContext";
import { SectionSwitcher } from "../../components/SectionSwitcher";
import { Avatar } from "../../components/Avatar";
import { PrimaryButton } from "../../components/PrimaryButton";
import { StatusBadge } from "../../components/StatusBadge";
import { SkeletonCard } from "../../components/Skeleton";

type AttendanceStatus = "present" | "absent" | "late";
interface Student { id: string; full_name: string; roll_number: string }

export default function TeacherAttendance() {
  const theme = useTheme();
  const { activeSection, userId, schoolId, ready } = useTeacherContext();
  const [students, setStudents] = useState<Student[]>([]);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const today = new Date().toISOString().split("T")[0];

  // Reload whenever the active section changes
  useEffect(() => {
    if (!ready) return;
    loadStudents();
  }, [activeSection?.id, ready]);

  async function loadStudents() {
    setLoading(true);
    setStudents([]);
    setStatuses({});

    if (!activeSection) { setLoading(false); return; }

    const [studentRes, existingRes] = await Promise.all([
      supabase
        .from("student_profiles")
        .select("id, roll_number, full_name, admission_number")
        .eq("section_id", activeSection.id)
        .order("full_name"),
      supabase
        .from("attendance_records")
        .select("student_id, status")
        .eq("section_id", activeSection.id)
        .eq("date", today),
    ]);

    const list: Student[] = (studentRes.data ?? []).map((s: any, idx: number) => ({
      id: s.id,
      full_name: s.full_name ?? "Student",
      roll_number: s.roll_number || s.admission_number || String(idx + 1),
    }));

    const existingMap = Object.fromEntries(
      (existingRes.data ?? []).map((r: any) => [r.student_id, r.status as AttendanceStatus])
    );
    const defaults = Object.fromEntries(
      list.map((s) => [s.id, existingMap[s.id] ?? ("present" as AttendanceStatus)])
    );

    setStudents(list);
    setStatuses(defaults);
    setLoading(false);
  }

  function cycleStatus(studentId: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStatuses((prev) => {
      const current = prev[studentId] ?? "present";
      const next: AttendanceStatus =
        current === "present" ? "absent" : current === "absent" ? "late" : "present";
      return { ...prev, [studentId]: next };
    });
  }

  function markAll(status: AttendanceStatus) {
    setStatuses(Object.fromEntries(students.map((s) => [s.id, status])));
  }

  async function saveAttendance() {
    if (!activeSection || !userId || !schoolId) return;
    setSaving(true);
    const records = students.map((s) => ({
      student_id: s.id,
      section_id: activeSection.id,
      school_id: schoolId,
      date: today,
      status: statuses[s.id] ?? "present",
      marked_by: userId,
    }));
    const { error } = await supabase
      .from("attendance_records")
      .upsert(records, { onConflict: "student_id,date" });
    setSaving(false);
    if (error) Alert.alert("Error", error.message);
    else Alert.alert("Saved", "Attendance recorded.");
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 }}>
          <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: theme.textPrimary }}>
            Mark Attendance
          </Text>
          <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: theme.textSecondary, marginTop: 2 }}>
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
          </Text>
        </View>

        {/* Section switcher — only shows when teacher has >1 section */}
        <SectionSwitcher />

        {/* Bulk actions */}
        {!loading && students.length > 0 && (
          <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 20, marginBottom: 12 }}>
            <TouchableOpacity
              onPress={() => markAll("present")}
              style={{ flex: 1, paddingVertical: 9, borderRadius: 10, backgroundColor: theme.success + "1A", alignItems: "center" }}
            >
              <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: theme.success }}>All Present</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => markAll("absent")}
              style={{ flex: 1, paddingVertical: 9, borderRadius: 10, backgroundColor: theme.danger + "1A", alignItems: "center" }}
            >
              <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: theme.danger }}>All Absent</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Student list */}
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 100 }}>
          {loading ? (
            [0,1,2,3,4].map(i => <SkeletonCard key={i} />)
          ) : !activeSection ? (
            <View style={{ alignItems: "center", paddingVertical: 56, gap: 8 }}>
              <Text style={{ fontFamily: "Inter_500Medium", color: theme.textMuted, fontSize: 14 }}>No class assigned</Text>
            </View>
          ) : students.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 56, gap: 8 }}>
              <Text style={{ fontFamily: "Inter_500Medium", color: theme.textMuted, fontSize: 14 }}>No students in {activeSection.label}</Text>
            </View>
          ) : students.map((student) => (
            <TouchableOpacity
              key={student.id}
              onPress={() => cycleStatus(student.id)}
              style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 }}
              activeOpacity={0.7}
            >
              <Avatar name={student.full_name} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: theme.textPrimary }}>
                  {student.full_name}
                </Text>
                <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: theme.textSecondary }}>
                  Roll #{student.roll_number}
                </Text>
              </View>
              <StatusBadge variant={statuses[student.id] ?? "present"} />
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Save bar */}
        {!loading && students.length > 0 && (
          <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: theme.background, borderTopWidth: 1, borderTopColor: theme.border }}>
            <PrimaryButton
              label={`Save Attendance · ${students.length} students`}
              onPress={saveAttendance}
              loading={saving}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
