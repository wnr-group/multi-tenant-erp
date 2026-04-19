import { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../../lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface Announcement {
  id: string;
  title: string;
  body: string;
  created_at: string;
}

export default function ParentAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    let schoolId: string | null = null;

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
        .select("school_id")
        .eq("profile_id", user.id)
        .single();

      if (!sp) {
        setLoading(false);
        return;
      }

      schoolId = sp.school_id as string;

      const { data } = await supabase
        .from("announcements")
        .select("id, title, body, created_at")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false });

      setAnnouncements(data ?? []);
      setLoading(false);

      // Subscribe to new announcements
      channelRef.current = supabase
        .channel("announcements")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "announcements",
            filter: `school_id=eq.${schoolId}`,
          },
          (payload) => {
            const newItem = payload.new as Announcement;
            setAnnouncements((prev) => [newItem, ...prev]);
          }
        )
        .subscribe();
    }

    load();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  if (loading) {
    return <ActivityIndicator className="flex-1 mt-20" />;
  }

  return (
    <View className="flex-1 bg-gray-50">
      <Text className="mt-12 mb-4 px-5 text-2xl font-bold text-gray-900">
        Announcements
      </Text>
      <FlatList
        data={announcements}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-5 pb-8"
        ListEmptyComponent={
          <Text className="mt-8 text-center text-sm text-gray-400">
            No announcements yet.
          </Text>
        }
        renderItem={({ item }) => (
          <View className="mb-3 rounded-xl bg-white p-4 shadow-sm">
            <Text className="font-semibold text-gray-900">{item.title}</Text>
            {item.body ? (
              <Text className="mt-1 text-sm text-gray-600">{item.body}</Text>
            ) : null}
            <Text className="mt-2 text-xs text-gray-400">
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        )}
      />
    </View>
  );
}
