import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/theme";
import { Skeleton, SkeletonCard } from "../../components/Skeleton";

interface TodayClass {
  id: string;
  period: number;
  subject: string;
  class_name: string;
}

interface Stats {
  studentsInClass: number;
  homeworkCount: number;
}

export default function TeacherDashboard() {
  const theme = useTheme();
  const router = useRouter();
  const [name, setName] = useState("");
  const [todayClasses, setTodayClasses] = useState<TodayClass[]>([]);
  const [stats, setStats] = useState<Stats>({ studentsInClass: 0, homeworkCount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDashboard(); }, []);

  async function loadDashboard() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // DB stores 1=Mon…5=Fri (ISO weekday); JS getDay() returns 0=Sun…6=Sat
    const jsDay = new Date().getDay(); // 0=Sun,1=Mon…6=Sat
    const dbDay = jsDay === 0 ? 7 : jsDay; // 7=Sun, maps Mon–Sat to 1–6

    const [profileRes, scheduleRes, tpRes] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", user.id).single(),
      supabase
        .from("timetable")
        .select("id, period, subjects(name), sections(name, classes(name))")
        .eq("teacher_id", user.id)
        .eq("day_of_week", dbDay)
        .order("period"),
      supabase.from("teacher_profiles").select("class_teacher_of").eq("profile_id", user.id).single(),
    ]);

    setName(profileRes.data?.full_name ?? "Teacher");

    const classes = (scheduleRes.data ?? []).map((r: any) => ({
      id: r.id,
      period: r.period,
      subject: r.subjects?.name ?? "—",
      class_name: r.sections
        ? `${r.sections.classes?.name ?? ""} ${r.sections.name ?? ""}`.trim()
        : "—",
    }));
    setTodayClasses(classes);

    const sectionId = tpRes.data?.class_teacher_of;
    if (sectionId) {
      const [studentsRes, homeworkRes] = await Promise.all([
        supabase.from("student_profiles").select("id", { count: "exact", head: true }).eq("section_id", sectionId),
        supabase.from("homework").select("id", { count: "exact", head: true }).eq("teacher_id", user.id).gte("due_date", new Date().toISOString().split("T")[0]),
      ]);
      setStats({
        studentsInClass: studentsRes.count ?? 0,
        homeworkDue: homeworkRes.count ?? 0,
      } as any);
    }

    setLoading(false);
  }

  const dayName = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  const quickActions = [
    { icon: "checkmark-circle-outline" as const, label: "Attendance", route: "/(teacher)/attendance", color: "#10B981" },
    { icon: "book-outline" as const, label: "Classes", route: "/(teacher)/classes", color: "#3B82F6" },
    { icon: "shield-outline" as const, label: "Discipline", route: "/(teacher)/discipline", color: "#F59E0B" },
    { icon: "person-outline" as const, label: "Profile", route: "/(teacher)/profile", color: "#8B5CF6" },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 }}>
          {loading ? <Skeleton height={28} width="55%" /> : (
            <Text style={{ fontSize: 24, fontFamily: "Inter_700Bold", color: theme.textPrimary, lineHeight: 32 }}>
              Good morning,{"\n"}{name.split(" ")[0]} 👋
            </Text>
          )}
          <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: theme.textMuted, marginTop: 6 }}>{dayName}</Text>
        </View>

        {/* Stats strip */}
        {!loading && (
          <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: 20, marginBottom: 24 }}>
            <View style={{ flex: 1, backgroundColor: theme.primary + "18", borderRadius: 14, padding: 14 }}>
              <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: theme.primary }}>{(stats as any).studentsInClass ?? 0}</Text>
              <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: theme.primary + "CC", marginTop: 2 }}>Students</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: "#F59E0B18", borderRadius: 14, padding: 14 }}>
              <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: "#F59E0B" }}>{todayClasses.length}</Text>
              <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#F59E0BCC", marginTop: 2 }}>Classes Today</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: "#10B98118", borderRadius: 14, padding: 14 }}>
              <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: "#10B981" }}>{(stats as any).homeworkDue ?? 0}</Text>
              <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#10B981CC", marginTop: 2 }}>HW Due</Text>
            </View>
          </View>
        )}

        {/* Today's schedule */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: theme.textPrimary, marginBottom: 12, letterSpacing: 0.2 }}>
            Today's Schedule
          </Text>
          {loading ? (
            <View style={{ gap: 8 }}><SkeletonCard /><SkeletonCard /></View>
          ) : todayClasses.length === 0 ? (
            <View style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 24, alignItems: "center", gap: 8 }}>
              <Ionicons name="calendar-outline" size={32} color={theme.textMuted} />
              <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: theme.textMuted }}>No classes scheduled today</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
              {todayClasses.map((c, idx) => (
                <View
                  key={c.id}
                  style={{
                    backgroundColor: theme.surface,
                    borderRadius: 16,
                    padding: 16,
                    width: 148,
                    gap: 10,
                    borderTopWidth: 3,
                    borderTopColor: [theme.primary, "#10B981", "#F59E0B", "#8B5CF6", "#EF4444"][idx % 5],
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: theme.textMuted, letterSpacing: 0.8, textTransform: "uppercase" }}>Period {c.period}</Text>
                  </View>
                  <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: theme.textPrimary }}>{c.subject}</Text>
                  <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: theme.textSecondary }}>{c.class_name}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Quick actions */}
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: theme.textPrimary, marginBottom: 12, letterSpacing: 0.2 }}>
            Quick Actions
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.label}
                onPress={() => router.push(action.route as any)}
                style={{ width: "47%", backgroundColor: theme.surface, borderRadius: 16, padding: 18, gap: 12 }}
                activeOpacity={0.7}
              >
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: action.color + "18", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name={action.icon} size={22} color={action.color} />
                </View>
                <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: theme.textPrimary }}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
