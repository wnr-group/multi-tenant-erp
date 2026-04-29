import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { supabase } from "../../lib/supabase";

type AttendanceStatus = "present" | "absent" | "late" | "half_day";

interface Section {
  id: string;
  name: string;
}

interface Student {
  id: string;
  full_name: string;
  status: AttendanceStatus;
}

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; bg: string; text: string }> = {
  present: { label: "Present", bg: "bg-green-600", text: "text-white" },
  absent: { label: "Absent", bg: "bg-red-500", text: "text-white" },
  late: { label: "Late", bg: "bg-yellow-400", text: "text-gray-900" },
  half_day: { label: "Half Day", bg: "bg-orange-400", text: "text-white" },
};

const ALL_STATUSES: AttendanceStatus[] = ["present", "absent", "late", "half_day"];

export default function TeacherAttendance() {
  const [step, setStep] = useState<"sections" | "students">("sections");
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);

  useEffect(() => {
    async function loadSections() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("id", user.id)
        .single();
      setSchoolId(profile?.school_id ?? null);

      // Fetch distinct sections from teacher's timetable
      const { data: entries } = await supabase
        .from("timetable")
        .select("section_id, sections(id, name)")
        .eq("teacher_id", user.id);

      const seen = new Set<string>();
      const unique: Section[] = [];
      for (const e of entries ?? []) {
        const rawSec = e.sections as { id: string; name: string } | { id: string; name: string }[] | null;
        const sec = Array.isArray(rawSec) ? (rawSec[0] ?? null) : rawSec;
        if (sec && !seen.has(sec.id)) {
          seen.add(sec.id);
          unique.push({ id: sec.id, name: sec.name });
        }
      }
      setSections(unique);
      setLoading(false);
    }
    loadSections();
  }, []);

  async function handleSectionTap(section: Section) {
    setSelectedSection(section);
    setLoading(true);

    const { data: sp } = await supabase
      .from("student_profiles")
      .select("id, full_name")
      .eq("section_id", section.id)
      .order("full_name");

    const list: Student[] = (sp ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      full_name: (row.full_name as string | null) ?? "Unknown",
      status: "present" as AttendanceStatus,
    }));

    setStudents(list);
    setStep("students");
    setLoading(false);
  }

  function toggleStatus(studentId: string, status: AttendanceStatus) {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, status } : s))
    );
  }

  async function handleSave() {
    if (!userId) return;
    setSaving(true);

    const today = new Date().toISOString().split("T")[0];
    const sectionId = selectedSection!.id;
    const records = students.map((s) => ({
      student_id: s.id,
      section_id: sectionId,
      school_id: schoolId,
      date: today,
      status: s.status,
      marked_by: userId,
    }));

    const { error } = await supabase
      .from("attendance_records")
      .upsert(records, { onConflict: "student_id,date" });

    setSaving(false);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Saved", "Attendance saved successfully.");
    }
  }

  if (loading) return <ActivityIndicator className="flex-1 mt-20" />;

  if (step === "sections") {
    return (
      <ScrollView className="flex-1 bg-gray-50 p-5">
        <Text className="mt-12 mb-5 text-2xl font-bold text-gray-900">
          Attendance
        </Text>
        <Text className="mb-4 text-sm text-gray-500">Select a section to mark attendance</Text>
        {sections.length === 0 ? (
          <Text className="text-sm text-gray-400">No sections assigned.</Text>
        ) : (
          sections.map((sec) => (
            <TouchableOpacity
              key={sec.id}
              onPress={() => handleSectionTap(sec)}
              className="mb-3 rounded-xl bg-white p-4 shadow-sm"
            >
              <Text className="font-semibold text-gray-800">{sec.name}</Text>
              <Text className="text-xs text-gray-400 mt-0.5">Tap to mark attendance</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 p-5">
      <TouchableOpacity onPress={() => setStep("sections")} className="mt-12 mb-1">
        <Text className="text-blue-600 text-sm">← Back to sections</Text>
      </TouchableOpacity>
      <Text className="mb-1 text-2xl font-bold text-gray-900">
        {selectedSection?.name}
      </Text>
      <Text className="mb-5 text-sm text-gray-500">
        {new Date().toDateString()}
      </Text>

      {students.map((student) => (
        <View key={student.id} className="mb-3 rounded-xl bg-white p-4 shadow-sm">
          <Text className="font-medium text-gray-800 mb-2">{student.full_name}</Text>
          <View className="flex-row gap-2 flex-wrap">
            {ALL_STATUSES.map((status) => {
              const cfg = STATUS_CONFIG[status];
              const isActive = student.status === status;
              return (
                <TouchableOpacity
                  key={status}
                  onPress={() => toggleStatus(student.id, status)}
                  className={`px-3 py-1 rounded-full ${isActive ? cfg.bg : "bg-gray-100"}`}
                >
                  <Text
                    className={`text-xs font-medium ${isActive ? cfg.text : "text-gray-500"}`}
                  >
                    {cfg.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}

      {students.length === 0 && (
        <Text className="text-sm text-gray-400">No students in this section.</Text>
      )}

      {students.length > 0 && (
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          className="mt-4 mb-8 rounded-xl bg-blue-600 py-3 disabled:opacity-50"
        >
          <Text className="text-center text-white font-semibold">
            {saving ? "Saving…" : "Save Attendance"}
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}
