import { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../../lib/supabase";

interface DisciplineRecord {
  id: string;
  category: string;
  severity: string;
  description: string | null;
  created_at: string;
}

const SEVERITY_STYLES: Record<string, { bg: string; text: string }> = {
  low: { bg: "bg-yellow-100", text: "text-yellow-700" },
  medium: { bg: "bg-orange-100", text: "text-orange-700" },
  high: { bg: "bg-red-100", text: "text-red-700" },
};

export default function ParentDiscipline() {
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
        .select("id, category, severity, description, created_at")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false });

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
        Discipline Records
      </Text>
      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-5 pb-8"
        ListEmptyComponent={
          <Text className="mt-8 text-center text-sm text-gray-400">
            No discipline records.
          </Text>
        }
        renderItem={({ item }) => {
          const style = SEVERITY_STYLES[item.severity] ?? {
            bg: "bg-gray-100",
            text: "text-gray-600",
          };
          return (
            <View className="mb-3 rounded-xl bg-white p-4 shadow-sm">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="font-semibold text-gray-900 capitalize">
                  {item.category}
                </Text>
                <View className={`rounded-full px-3 py-0.5 ${style.bg}`}>
                  <Text className={`text-xs font-semibold capitalize ${style.text}`}>
                    {item.severity}
                  </Text>
                </View>
              </View>
              {item.description ? (
                <Text className="text-sm text-gray-600">{item.description}</Text>
              ) : null}
              <Text className="mt-2 text-xs text-gray-400">
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
          );
        }}
      />
    </View>
  );
}
