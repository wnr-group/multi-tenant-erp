import { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../../lib/supabase";

interface ResultRow {
  id: string;
  marks_obtained: number;
  max_marks: number;
  exam_name: string;
  subject_name: string;
}

export default function ParentResults() {
  const [results, setResults] = useState<ResultRow[]>([]);
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
        .from("exam_results")
        .select(
          "id, marks_obtained, max_marks, exams(name), subjects(name)"
        )
        .eq("student_id", user.id);

      type RawResult = {
        id: string;
        marks_obtained: number;
        max_marks: number;
        exams: { name: string }[] | { name: string } | null;
        subjects: { name: string }[] | { name: string } | null;
      };

      const pickName = (rel: { name: string }[] | { name: string } | null): string => {
        if (!rel) return "—";
        if (Array.isArray(rel)) return rel[0]?.name ?? "—";
        return rel.name ?? "—";
      };

      const rows: ResultRow[] = (data ?? []).map((r: RawResult) => ({
        id: r.id,
        marks_obtained: r.marks_obtained,
        max_marks: r.max_marks,
        exam_name: pickName(r.exams),
        subject_name: pickName(r.subjects),
      }));

      setResults(rows);
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
        Results
      </Text>
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-5 pb-8"
        ListEmptyComponent={
          <Text className="mt-8 text-center text-sm text-gray-400">
            No results yet.
          </Text>
        }
        renderItem={({ item }) => {
          const pct = item.max_marks > 0
            ? Math.round((item.marks_obtained / item.max_marks) * 100)
            : 0;
          const scoreColor =
            pct >= 75
              ? "text-green-600"
              : pct >= 50
              ? "text-yellow-600"
              : "text-red-600";

          return (
            <View className="mb-3 rounded-xl bg-white p-4 shadow-sm">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 mr-3">
                  <Text className="font-semibold text-gray-900">
                    {item.exam_name}
                  </Text>
                  <Text className="mt-0.5 text-sm text-gray-500">
                    {item.subject_name}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className={`text-lg font-bold ${scoreColor}`}>
                    {item.marks_obtained}/{item.max_marks}
                  </Text>
                  <Text className="text-xs text-gray-400">{pct}%</Text>
                </View>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}
