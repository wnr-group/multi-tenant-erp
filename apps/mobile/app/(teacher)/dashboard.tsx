import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/theme";
import { SectionHeader } from "../../components/SectionHeader";
import { Skeleton, SkeletonCard } from "../../components/Skeleton";

interface TodayClass { id: string; period_number: number; subject: string; class_name: string; start_time: string; end_time: string }

export default function TeacherDashboard() {
  const theme = useTheme();
  const router = useRouter();
  const [name, setName] = useState("");
  const [todayClasses, setTodayClasses] = useState<TodayClass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDashboard(); }, []);

  async function loadDashboard() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const today = new Date().toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
    const [profileRes, scheduleRes] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", user.id).single(),
      supabase.from("timetable").select("id, period, subjects(name), sections(name, classes(name))").eq("teacher_id", user.id).eq("day_of_week", today).order("period"),
    ]);
    setName(profileRes.data?.full_name ?? "Teacher");
    setTodayClasses((scheduleRes.data ?? []).map((r: any) => ({
      id: r.id,
      period_number: r.period,
      subject: r.subjects?.name ?? "",
      class_name: r.sections ? `${r.sections.classes?.name ?? ""} ${r.sections.name ?? ""}`.trim() : "",
      start_time: "",
      end_time: "",
    })));
    setLoading(false);
  }

  const quickActions = [
    { icon: "checkmark-circle-outline" as const, label: "Attendance", route: "/(teacher)/attendance" },
    { icon: "book-outline" as const, label: "Homework", route: "/(teacher)/classes" },
    { icon: "trophy-outline" as const, label: "Results", route: "/(teacher)/classes" },
    { icon: "shield-outline" as const, label: "Discipline", route: "/(teacher)/discipline" },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 24 }} showsVerticalScrollIndicator={false}>
        {loading ? <Skeleton height={28} width="60%" /> : (
          <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: theme.textPrimary }}>
            Good morning, {name.split(" ")[0]} 👋
          </Text>
        )}

        <View>
          <SectionHeader title="Today's Schedule" />
          {loading ? (
            <View style={{ gap: 8 }}><SkeletonCard /><SkeletonCard /></View>
          ) : todayClasses.length === 0 ? (
            <Text style={{ textAlign: "center", color: theme.textMuted, fontFamily: "Inter_400Regular", paddingVertical: 20 }}>No classes today</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 12 }}>
                {todayClasses.map((c) => (
                  <View key={c.id} style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 16, width: 140, gap: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: theme.primaryLight, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: theme.primary }}>P{c.period_number}</Text>
                    </View>
                    <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: theme.textPrimary }}>{c.subject}</Text>
                    <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: theme.textSecondary }}>{c.class_name}</Text>
                    {c.start_time && c.end_time ? <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: theme.textMuted }}>{c.start_time} – {c.end_time}</Text> : null}
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </View>

        <View>
          <SectionHeader title="Quick Actions" />
          <View style={{ flexDirection: "row", gap: 12 }}>
            {quickActions.map((action) => (
              <TouchableOpacity key={action.label} onPress={() => router.push(action.route as any)} style={{ flex: 1, backgroundColor: theme.surface, borderRadius: 16, padding: 14, alignItems: "center", gap: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 }} activeOpacity={0.7}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: theme.primaryLight, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name={action.icon} size={20} color={theme.primary} />
                </View>
                <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: theme.textSecondary, textAlign: "center" }}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
