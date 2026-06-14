import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../lib/theme";
import { useTeacherContext } from "../../../lib/teacherContext";
import { SessionSelector } from "../../../components/SessionSelector";
import { SkeletonCard } from "../../../components/Skeleton";
import {
  AttendanceSession, fetchMarkedCount, MarkedCount,
} from "../../../lib/attendance";

export default function TeacherAttendanceOverview() {
  const theme = useTheme();
  const router = useRouter();
  const { sections, ready } = useTeacherContext();
  const mySections = sections;
  const [session, setSession] = useState<AttendanceSession>("FULL_DAY");
  const [counts, setCounts] = useState<Record<string, MarkedCount>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const today = new Date().toISOString().split("T")[0];

  const load = useCallback(async () => {
    if (!ready) return;
    setLoading(true);
    const entries = await Promise.all(
      mySections.map((s) => fetchMarkedCount(s.id, today, session)),
    );
    setCounts(Object.fromEntries(entries.map((c) => [c.sectionId, c])));
    setLoading(false);
  }, [ready, session, mySections.map((s) => s.id).join(","), today]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  function badge(c: MarkedCount | undefined): string {
    if (!c) return "—";
    // If marked in the other granularity, show a mode tag instead of false NA.
    if (session === "FULL_DAY" && c.existingMode === "SESSION") return "FN·AN";
    if (session !== "FULL_DAY" && c.existingMode === "FULL_DAY") return "Full-day";
    return c.marked === 0 ? `NA / ${c.total}` : `${c.marked} / ${c.total}`;
  }

  return (
    <SafeAreaView edges={["bottom"]} style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 14 }}>
        <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: theme.textPrimary }}>Attendance</Text>
        <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: theme.textSecondary }}>
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
        </Text>
        <SessionSelector value={session} onChange={setSession} />
      </View>
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 8 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >
        {loading ? (
          [0, 1, 2].map((i) => <SkeletonCard key={i} />)
        ) : mySections.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 56 }}>
            <Text style={{ fontFamily: "Inter_500Medium", color: theme.textMuted, fontSize: 14 }}>
              No classes assigned to you
            </Text>
          </View>
        ) : mySections.map((s) => {
          const c = counts[s.id];
          const complete = c && c.marked === c.total && c.total > 0;
          return (
            <TouchableOpacity
              key={s.id}
              onPress={() => router.push({ pathname: "/(teacher)/attendance/[sectionId]", params: { sectionId: s.id, session, date: today } })}
              style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 }}
              activeOpacity={0.7}
            >
              <Ionicons name="people-outline" size={22} color={theme.primary} />
              <Text style={{ flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold", color: theme.textPrimary }}>{s.label}</Text>
              <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: complete ? theme.success : theme.textSecondary }}>
                {badge(c)}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
