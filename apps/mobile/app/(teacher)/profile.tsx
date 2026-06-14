import { useEffect, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase, SCHOOL_ID } from "../../lib/supabase";
import { clearActiveContext } from "../../lib/active-context";
import { useTheme } from "../../lib/theme";
import { Avatar } from "../../components/Avatar";
import { ListItem } from "../../components/ListItem";
import { PrimaryButton } from "../../components/PrimaryButton";

interface Profile { full_name: string; email: string; school_name: string }

export default function TeacherProfile() {
  const theme = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => { loadProfile(); }, []);

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: prof }, { data: school }] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", user.id).single(),
      supabase.from("schools").select("name").eq("id", SCHOOL_ID).maybeSingle(),
    ]);
    setProfile({
      full_name: prof?.full_name ?? "Teacher",
      email: user.email ?? "",
      school_name: school?.name ?? "School",
    });
  }

  return (
    <SafeAreaView edges={["bottom"]} style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: theme.textPrimary }}>Profile</Text>
        {profile && (
          <>
            <View style={{ backgroundColor: theme.surface, borderRadius: 20, padding: 24, alignItems: "center", gap: 12 }}>
              <Avatar name={profile.full_name} size={80} />
              <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: theme.textPrimary }}>{profile.full_name}</Text>
              <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: theme.textSecondary }}>{profile.email}</Text>
              <View style={{ backgroundColor: theme.primaryLight, borderRadius: 100, paddingHorizontal: 12, paddingVertical: 4 }}>
                <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: theme.primary }}>Teacher · {profile.school_name}</Text>
              </View>
            </View>
            <View style={{ gap: 8 }}>
              <ListItem icon="school-outline" title={profile.school_name} subtitle="Your school" />
              <ListItem icon="mail-outline" title={profile.email} subtitle="Email address" />
            </View>
            <PrimaryButton label="Sign Out" onPress={async () => { await clearActiveContext(); await supabase.auth.signOut(); }} style={{ backgroundColor: theme.danger }} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
