import { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../../lib/supabase";

interface AttendanceRow {
  id: string;
  date: string;
  status: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  present: { bg: "bg-green-100", text: "text-green-700", label: "Present" },
  absent: { bg: "bg-red-100", text: "text-red-700", label: "Absent" },
  late: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Late" },
  half_day: { bg: "bg-orange-100", text: "text-orange-700", label: "Half Day" },
};

export default function ParentAttendance() {
  const [records, setRecords] = useState<AttendanceRow[]>([]);
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

      const { data } = await supabase
        .from("attendance_records")
        .select("id, date, status")
        .eq("student_id", user.id)
        .order("date", { ascending: false });

      setRecords(data ?? []);
      setLoading(false);
    }

    load();
  }, []);

  if (loading) {
    return <ActivityIndicator className="flex-1 mt-20" />;
  }

  return (
    <View className="flex-1 bg-gray-50">
      <Text className="mt-12 mb-4 px-5 text-2xl font-bold text-gray-900">
        Attendance
      </Text>
      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-5 pb-8"
        ListEmptyComponent={
          <Text className="mt-8 text-center text-sm text-gray-400">
            No attendance records found.
          </Text>
        }
        renderItem={({ item }) => {
          const style = STATUS_STYLES[item.status] ?? {
            bg: "bg-gray-100",
            text: "text-gray-600",
            label: item.status,
          };
          return (
            <View className="mb-2 flex-row items-center justify-between rounded-xl bg-white p-4 shadow-sm">
              <Text className="text-sm font-medium text-gray-800">
                {item.date}
              </Text>
              <View className={`rounded-full px-3 py-1 ${style.bg}`}>
                <Text className={`text-xs font-semibold ${style.text}`}>
                  {style.label}
                </Text>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}
