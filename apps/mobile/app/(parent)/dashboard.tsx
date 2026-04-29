import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/theme";
import { StatCard } from "../../components/StatCard";
import { SectionHeader } from "../../components/SectionHeader";
import { Skeleton, SkeletonCard } from "../../components/Skeleton";

interface DashboardData {
  name: string;
  attendancePct: number;
  pendingFees: number;
  homeworkDue: number;
  announcements: { id: string; title: string; created_at: string }[];
}

export default function ParentDashboard() {
  const theme = useTheme();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDashboard(); }, []);

  async function loadDashboard() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Look up parent's student
    const { data: sp } = await supabase.from("student_profiles").select("profile_id, section_id, class_id, full_name").eq("parent_profile_id", user.id).single();
    const studentId = sp?.profile_id;
    const studentName = sp?.full_name ?? "Student";

    const [attendanceRes, feesRes, homeworkRes, announcementsRes] = await Promise.all([
      studentId ? supabase.from("attendance_records").select("status").eq("student_id", studentId) : Promise.resolve({ data: [] }),
      studentId ? supabase.from("fee_payments").select("amount_paid, fee_structures(amount)").eq("student_id", studentId).eq("status", "pending") : Promise.resolve({ data: [] }),
      supabase.from("homework").select("id").gte("due_date", new Date().toISOString().split("T")[0]),
      supabase.from("announcements").select("id, title, created_at").order("created_at", { ascending: false }).limit(3),
    ]);
    const totalDays = attendanceRes.data?.length ?? 0;
    const presentDays = attendanceRes.data?.filter((r: any) => r.status === "present").length ?? 0;
    const pendingFees = (feesRes.data ?? []).reduce((sum: number, r: any) => sum + ((r.fee_structures?.amount ?? 0) - r.amount_paid), 0);
    setData({
      name: studentName,
      attendancePct: totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0,
      pendingFees,
      homeworkDue: homeworkRes.data?.length ?? 0,
      announcements: announcementsRes.data ?? [],
    });
    setLoading(false);
  }

  const quickActions = [
    { icon: "wallet-outline" as const, label: "Pay Fees", route: "/(parent)/fees" },
    { icon: "trophy-outline" as const, label: "Results", route: "/(parent)/academics" },
    { icon: "book-outline" as const, label: "Homework", route: "/(parent)/academics" },
    { icon: "megaphone-outline" as const, label: "News", route: "/(parent)/more" },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 24 }} showsVerticalScrollIndicator={false}>
        {loading ? <Skeleton height={28} width="60%" /> : (
          <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: theme.textPrimary }}>
            Good morning, {data?.name?.split(" ")[0]} 👋
          </Text>
        )}
        {loading ? (
          <View style={{ flexDirection: "row", gap: 12 }}>
            {[0,1,2].map(i => <View key={i} style={{ flex: 1 }}><SkeletonCard /></View>)}
          </View>
        ) : (
          <View style={{ flexDirection: "row", gap: 12 }}>
            <StatCard icon="checkmark-circle-outline" value={`${data?.attendancePct}%`} label="Attendance" />
            <StatCard icon="wallet-outline" value={`₹${((data?.pendingFees ?? 0) / 1000).toFixed(0)}k`} label="Pending" variant={data?.pendingFees ? "warning" : "default"} />
            <StatCard icon="book-outline" value={`${data?.homeworkDue}`} label="Due Today" variant={data?.homeworkDue ? "danger" : "default"} />
          </View>
        )}
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
        <View>
          <SectionHeader title="Latest News" onSeeAll={() => router.push("/(parent)/more")} />
          {loading ? (
            <View style={{ gap: 8 }}><SkeletonCard /><SkeletonCard /></View>
          ) : data?.announcements.map((a) => (
            <View key={a.id} style={{ backgroundColor: theme.surface, borderRadius: 12, padding: 14, marginBottom: 8 }}>
              <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: theme.textPrimary }}>{a.title}</Text>
              <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: theme.textMuted, marginTop: 4 }}>{new Date(a.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
