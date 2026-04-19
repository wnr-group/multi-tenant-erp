import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../../lib/supabase";

interface Exam {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
}

export default function TeacherResults() {
  const [exams, setExams] = useState<Exam[]>([]);
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
        .select("school_id")
        .eq("id", user.id)
        .single();

      if (!profile?.school_id) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("exams")
        .select("id, name, start_date, end_date")
        .eq("school_id", profile.school_id)
        .order("start_date", { ascending: false });

      setExams(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <ActivityIndicator className="flex-1 mt-20" />;

  return (
    <ScrollView className="flex-1 bg-gray-50 p-5">
      <Text className="mt-12 mb-1 text-2xl font-bold text-gray-900">Results</Text>
      <Text className="mb-5 text-sm text-gray-500">Exams for your school</Text>

      {exams.length === 0 ? (
        <View className="rounded-xl bg-white p-6 shadow-sm items-center">
          <Text className="text-gray-400 text-sm">No exams scheduled.</Text>
        </View>
      ) : (
        exams.map((exam) => (
          <View key={exam.id} className="mb-3 rounded-xl bg-white p-4 shadow-sm">
            <Text className="font-semibold text-gray-800">{exam.name}</Text>
            {exam.start_date ? (
              <Text className="mt-1 text-xs text-gray-500">
                {exam.start_date}
                {exam.end_date ? ` → ${exam.end_date}` : ""}
              </Text>
            ) : null}
          </View>
        ))
      )}

      <View className="mt-2 mb-8 rounded-xl bg-blue-50 p-3">
        <Text className="text-xs text-blue-600 text-center">
          Mark entry is available on the web portal.
        </Text>
      </View>
    </ScrollView>
  );
}
