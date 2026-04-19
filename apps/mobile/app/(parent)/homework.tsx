import { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../../lib/supabase";

interface HomeworkRow {
  id: string;
  title: string;
  due_date: string | null;
  subject_name: string;
}

export default function ParentHomework() {
  const [homework, setHomework] = useState<HomeworkRow[]>([]);
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

      const { data: sp } = await supabase
        .from("student_profiles")
        .select("section_id, school_id")
        .eq("profile_id", user.id)
        .single();

      if (!sp) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("homework")
        .select("id, title, due_date, subjects(name)")
        .eq("section_id", sp.section_id)
        .eq("school_id", sp.school_id)
        .order("due_date", { ascending: true });

      type RawHomework = {
        id: string;
        title: string;
        due_date: string | null;
        subjects: { name: string }[] | { name: string } | null;
      };

      const rows: HomeworkRow[] = (data ?? []).map((h: RawHomework) => ({
        id: h.id,
        title: h.title,
        due_date: h.due_date,
        subject_name: Array.isArray(h.subjects)
          ? (h.subjects[0]?.name ?? "—")
          : (h.subjects?.name ?? "—"),
      }));

      setHomework(rows);
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
        Homework
      </Text>
      <FlatList
        data={homework}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-5 pb-8"
        ListEmptyComponent={
          <Text className="mt-8 text-center text-sm text-gray-400">
            No homework assigned.
          </Text>
        }
        renderItem={({ item }) => (
          <View className="mb-3 rounded-xl bg-white p-4 shadow-sm">
            <Text className="font-semibold text-gray-900">{item.title}</Text>
            <Text className="mt-0.5 text-sm text-gray-500">
              {item.subject_name}
            </Text>
            {item.due_date && (
              <Text className="mt-1 text-xs text-blue-500">
                Due: {item.due_date}
              </Text>
            )}
          </View>
        )}
      />
    </View>
  );
}
