import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../../lib/supabase";

interface DisciplineRecord {
  id: string;
  category: string;
  severity: string;
  description: string | null;
  created_at: string;
  student: { full_name: string } | null;
}

const SEVERITY_COLORS: Record<string, string> = {
  low: "text-green-600",
  medium: "text-yellow-600",
  high: "text-orange-600",
  critical: "text-red-600",
};

export default function TeacherDiscipline() {
  const [records, setRecords] = useState<DisciplineRecord[]>([]);
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
        .from("discipline_records")
        .select("id, category, severity, description, created_at, profiles(full_name)")
        .eq("recorded_by", user.id)
        .order("created_at", { ascending: false });

      const mapped: DisciplineRecord[] = (data ?? []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        category: row.category as string,
        severity: row.severity as string,
        description: row.description as string | null,
        created_at: row.created_at as string,
        student: (row.profiles as { full_name: string } | null) ?? null,
      }));

      setRecords(mapped);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <ActivityIndicator className="flex-1 mt-20" />;

  return (
    <ScrollView className="flex-1 bg-gray-50 p-5">
      <Text className="mt-12 mb-1 text-2xl font-bold text-gray-900">Discipline</Text>
      <Text className="mb-5 text-sm text-gray-500">Records you've logged</Text>

      {records.length === 0 ? (
        <View className="rounded-xl bg-white p-6 shadow-sm items-center">
          <Text className="text-gray-400 text-sm">No discipline records found.</Text>
        </View>
      ) : (
        records.map((rec) => (
          <View key={rec.id} className="mb-3 rounded-xl bg-white p-4 shadow-sm">
            <View className="flex-row items-center justify-between">
              <Text className="font-semibold text-gray-800">
                {rec.student?.full_name ?? "Unknown Student"}
              </Text>
              <Text
                className={`text-xs font-medium capitalize ${
                  SEVERITY_COLORS[rec.severity] ?? "text-gray-500"
                }`}
              >
                {rec.severity}
              </Text>
            </View>
            <Text className="text-xs text-blue-600 font-medium mt-0.5 capitalize">
              {rec.category}
            </Text>
            {rec.description ? (
              <Text className="mt-1 text-sm text-gray-600" numberOfLines={3}>
                {rec.description}
              </Text>
            ) : null}
            <Text className="mt-1 text-xs text-gray-400">
              {new Date(rec.created_at).toLocaleDateString()}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}
