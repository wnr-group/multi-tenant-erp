import { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { supabase } from "../../lib/supabase";

interface DashboardData {
  fullName: string;
  attendancePercent: number | null;
  overdueFeesCount: number;
}

export default function ParentDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      const { data: attendanceRows } = await supabase
        .from("attendance_records")
        .select("status")
        .eq("student_id", user.id);

      let attendancePercent: number | null = null;
      if (attendanceRows && attendanceRows.length > 0) {
        const presentCount = attendanceRows.filter(
          (r) => r.status === "present"
        ).length;
        attendancePercent = Math.round(
          (presentCount / attendanceRows.length) * 100
        );
      }

      const { count: overdueFeesCount } = await supabase
        .from("fee_payments")
        .select("id", { count: "exact", head: true })
        .eq("student_id", user.id)
        .eq("status", "overdue");

      setData({
        fullName: profile?.full_name ?? "Student",
        attendancePercent,
        overdueFeesCount: overdueFeesCount ?? 0,
      });
      setLoading(false);
    }

    load();
  }, []);

  if (loading) {
    return <ActivityIndicator className="flex-1 mt-20" />;
  }

  if (!data) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-gray-500">Could not load data.</Text>
      </View>
    );
  }

  const attendanceColor =
    data.attendancePercent === null
      ? "text-gray-500"
      : data.attendancePercent >= 75
      ? "text-green-600"
      : "text-red-600";

  return (
    <ScrollView className="flex-1 bg-gray-50 p-5">
      <Text className="mt-12 mb-6 text-2xl font-bold text-gray-900">
        Hello, {data.fullName} 👋
      </Text>

      {/* Attendance card */}
      <View className="mb-4 rounded-xl bg-white p-5 shadow-sm">
        <Text className="mb-1 text-sm font-medium text-gray-500 uppercase tracking-wide">
          Attendance
        </Text>
        {data.attendancePercent === null ? (
          <Text className="text-base text-gray-400">No records yet</Text>
        ) : (
          <Text className={`text-3xl font-bold ${attendanceColor}`}>
            {data.attendancePercent}%
          </Text>
        )}
      </View>

      {/* Overdue fees warning */}
      {data.overdueFeesCount > 0 && (
        <View className="mb-4 rounded-xl bg-red-50 border border-red-200 p-5">
          <Text className="text-sm font-semibold text-red-700">
            ⚠️ {data.overdueFeesCount} overdue fee
            {data.overdueFeesCount > 1 ? "s" : ""} pending
          </Text>
          <Text className="mt-1 text-sm text-red-500">
            Please visit the Fees tab to clear dues.
          </Text>
        </View>
      )}

      {data.overdueFeesCount === 0 && (
        <View className="mb-4 rounded-xl bg-green-50 border border-green-200 p-5">
          <Text className="text-sm font-semibold text-green-700">
            ✅ No overdue fees
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
