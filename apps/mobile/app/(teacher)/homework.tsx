import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../../lib/supabase";

interface HomeworkItem {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  subject: { name: string } | null;
}

export default function TeacherHomework() {
  const [homework, setHomework] = useState<HomeworkItem[]>([]);
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
        .from("homework")
        .select("id, title, description, due_date, subjects(name)")
        .eq("teacher_id", user.id)
        .order("due_date", { ascending: false });

      const mapped: HomeworkItem[] = (data ?? []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        title: row.title as string,
        description: row.description as string | null,
        due_date: row.due_date as string | null,
        subject: (row.subjects as { name: string } | null) ?? null,
      }));

      setHomework(mapped);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <ActivityIndicator className="flex-1 mt-20" />;

  return (
    <ScrollView className="flex-1 bg-gray-50 p-5">
      <Text className="mt-12 mb-1 text-2xl font-bold text-gray-900">Homework</Text>
      <Text className="mb-5 text-sm text-gray-500">Assignments you've created</Text>

      {homework.length === 0 ? (
        <View className="rounded-xl bg-white p-6 shadow-sm items-center">
          <Text className="text-gray-400 text-sm">No homework assigned yet.</Text>
        </View>
      ) : (
        homework.map((hw) => (
          <View key={hw.id} className="mb-3 rounded-xl bg-white p-4 shadow-sm">
            <Text className="font-semibold text-gray-800">{hw.title}</Text>
            <Text className="text-xs text-blue-600 mt-0.5 font-medium">
              {hw.subject?.name ?? "Unknown Subject"}
            </Text>
            {hw.description ? (
              <Text className="mt-1 text-sm text-gray-600" numberOfLines={2}>
                {hw.description}
              </Text>
            ) : null}
            {hw.due_date ? (
              <Text className="mt-1 text-xs text-gray-400">
                Due: {hw.due_date}
              </Text>
            ) : null}
          </View>
        ))
      )}

      <View className="mt-2 mb-8 rounded-xl bg-blue-50 p-3">
        <Text className="text-xs text-blue-600 text-center">
          Create new homework assignments on the web portal.
        </Text>
      </View>
    </ScrollView>
  );
}
