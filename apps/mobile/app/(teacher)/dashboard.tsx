import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../../lib/supabase";

interface TimetableEntry {
  id: string;
  period_number: number;
  start_time: string | null;
  end_time: string | null;
  subject: { name: string } | null;
  section: { name: string } | null;
}

interface Profile {
  full_name: string;
  school_id: string;
}

export default function TeacherDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
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

      const { data: p } = await supabase
        .from("profiles")
        .select("full_name, school_id")
        .eq("id", user.id)
        .single();

      setProfile(p);

      // 1 = Mon … 7 = Sun (ISO weekday)
      const today = new Date().getDay() || 7;

      const { data: entries } = await supabase
        .from("timetable")
        .select(
          "id, period, subjects(name), sections(name)"
        )
        .eq("teacher_id", user.id)
        .eq("day_of_week", today)
        .order("period", { ascending: true });

      const mapped: TimetableEntry[] = (entries ?? []).map((e: Record<string, unknown>) => ({
        id: e.id as string,
        period_number: e.period as number,
        start_time: null,
        end_time: null,
        subject: (e.subjects as { name: string } | null) ?? null,
        section: (e.sections as { name: string } | null) ?? null,
      }));

      setTimetable(mapped);
      setLoading(false);
    }
    load();
  }, []);

  const dayNames = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const todayName = dayNames[new Date().getDay() || 7];

  if (loading) return <ActivityIndicator className="flex-1 mt-20" />;

  return (
    <ScrollView className="flex-1 bg-gray-50 p-5">
      <Text className="mt-12 mb-1 text-2xl font-bold text-gray-900">
        Hello, {profile?.full_name ?? "Teacher"} 👋
      </Text>
      <Text className="mb-5 text-sm text-gray-500">
        {todayName}'s timetable
      </Text>

      {timetable.length === 0 ? (
        <View className="rounded-xl bg-white p-6 shadow-sm items-center">
          <Text className="text-gray-400 text-sm">No classes scheduled for today.</Text>
        </View>
      ) : (
        timetable.map((entry) => (
          <View key={entry.id} className="mb-3 rounded-xl bg-white p-4 shadow-sm">
            <View className="flex-row items-center justify-between">
              <Text className="font-semibold text-gray-800">
                Period {entry.period_number}
              </Text>
            </View>
            <Text className="mt-1 text-sm text-blue-600 font-medium">
              {entry.subject?.name ?? "Unknown Subject"}
            </Text>
            <Text className="text-xs text-gray-500 mt-0.5">
              Section: {entry.section?.name ?? "—"}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}
