import { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import * as SplashScreen from "expo-splash-screen";
import { supabase } from "../lib/supabase";
import { ThemeProvider } from "../lib/theme";
import type { Session } from "@supabase/supabase-js";
import "../global.css";

SplashScreen.preventAutoHideAsync();

async function tryRegisterPush(userId: string) {
  try {
    const { registerForPushNotifications } = await import("../lib/notifications");
    await registerForPushNotifications(userId);
  } catch {}
}

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [schoolId, setSchoolId] = useState<string | undefined>();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        tryRegisterPush(session.user.id);
        fetchSchoolId(session.user.id);
      }
      setInitialized(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        tryRegisterPush(session.user.id);
        fetchSchoolId(session.user.id);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function fetchSchoolId(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("school_id")
      .eq("id", userId)
      .single();
    if (data?.school_id) setSchoolId(data.school_id);
  }

  useEffect(() => {
    if (!initialized) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!session && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (session && inAuthGroup) {
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("is_active", true)
        .single()
        .then(({ data }) => {
          if (data?.role === "teacher") {
            router.replace("/(teacher)/dashboard");
          } else {
            router.replace("/(parent)/dashboard");
          }
        });
    }
  }, [session, initialized, segments]);

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider schoolId={schoolId}>
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}
