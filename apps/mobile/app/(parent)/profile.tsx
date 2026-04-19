import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

interface ProfileData {
  full_name: string;
  email: string;
  role: string;
}

export default function ParentProfile() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
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
        .select("full_name, email, role")
        .eq("id", user.id)
        .single();

      setProfile(data ?? { full_name: "", email: user.email ?? "", role: "student" });
      setLoading(false);
    }

    load();
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert("Error", error.message);
      setSigningOut(false);
      return;
    }
    router.replace("/(auth)/login");
  }

  if (loading) {
    return <ActivityIndicator className="flex-1 mt-20" />;
  }

  const roleLabel =
    profile?.role === "parent"
      ? "Parent"
      : profile?.role === "student"
      ? "Student"
      : "Student / Parent";

  return (
    <View className="flex-1 bg-gray-50 p-5">
      <Text className="mt-12 mb-6 text-2xl font-bold text-gray-900">
        Profile
      </Text>

      {/* Profile card */}
      <View className="rounded-2xl bg-white p-6 shadow-sm mb-6">
        {/* Avatar placeholder */}
        <View className="mb-4 h-16 w-16 rounded-full bg-blue-100 items-center justify-center">
          <Text className="text-2xl font-bold text-blue-600">
            {profile?.full_name?.charAt(0)?.toUpperCase() ?? "?"}
          </Text>
        </View>

        <Text className="text-xl font-bold text-gray-900">
          {profile?.full_name ?? "—"}
        </Text>
        <Text className="mt-0.5 text-sm text-gray-500">{profile?.email ?? "—"}</Text>

        <View className="mt-3 self-start rounded-full bg-blue-50 px-3 py-1">
          <Text className="text-xs font-semibold text-blue-600">{roleLabel}</Text>
        </View>
      </View>

      {/* Sign out */}
      <TouchableOpacity
        onPress={handleSignOut}
        disabled={signingOut}
        className="rounded-xl border border-red-200 bg-red-50 py-3.5 disabled:opacity-50"
      >
        {signingOut ? (
          <ActivityIndicator color="#dc2626" />
        ) : (
          <Text className="text-center text-base font-semibold text-red-600">
            Sign Out
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
