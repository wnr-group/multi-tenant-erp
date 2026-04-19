import { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { supabase } from "../lib/supabase";
import type { Session } from "@supabase/supabase-js";
import "../global.css";

async function tryRegisterPush(userId: string) {
  try {
    const { registerForPushNotifications } = await import("../lib/notifications");
    await registerForPushNotifications(userId);
  } catch {
    // Notifications unavailable (Expo Go)
  }
}

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        tryRegisterPush(session.user.id);
      }
      setInitialized(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session?.user) {
          tryRegisterPush(session.user.id);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

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

  return <Stack screenOptions={{ headerShown: false }} />;
}
