import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

interface Profile {
  full_name: string;
  email: string;
}

export default function TeacherProfile() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

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
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single();

      setProfile(data);
      setLoading(false);
    }
    load();
  }, []);

  async function handleSignOut() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          setSigningOut(true);
          await supabase.auth.signOut();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  if (loading) return <ActivityIndicator className="flex-1 mt-20" />;

  return (
    <ScrollView className="flex-1 bg-gray-50 p-5">
      <Text className="mt-12 mb-5 text-2xl font-bold text-gray-900">Profile</Text>

      <View className="rounded-xl bg-white p-5 shadow-sm mb-4">
        <View className="items-center mb-4">
          <View className="w-16 h-16 rounded-full bg-blue-100 items-center justify-center mb-3">
            <Text className="text-2xl font-bold text-blue-600">
              {profile?.full_name?.charAt(0)?.toUpperCase() ?? "T"}
            </Text>
          </View>
          <Text className="text-lg font-bold text-gray-900">{profile?.full_name ?? "—"}</Text>
          <Text className="text-sm text-gray-500 mt-0.5">Teacher</Text>
        </View>

        <View className="border-t border-gray-100 pt-4">
          <View className="flex-row justify-between py-2">
            <Text className="text-sm text-gray-500">Email</Text>
            <Text className="text-sm text-gray-800 font-medium flex-shrink ml-4 text-right">
              {profile?.email ?? "—"}
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        onPress={handleSignOut}
        disabled={signingOut}
        className="rounded-xl bg-red-500 py-3 disabled:opacity-50"
      >
        <Text className="text-center text-white font-semibold">
          {signingOut ? "Signing out…" : "Sign Out"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
