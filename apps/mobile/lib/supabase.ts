import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  (Constants.expoConfig?.extra?.supabaseUrl as string) ??
  "http://127.0.0.1:54321";
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  (Constants.expoConfig?.extra?.supabaseAnonKey as string) ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Rewrite storage URLs that were saved with 127.0.0.1 so they work on physical devices.
// When supabaseUrl points to a LAN IP, 127.0.0.1 in stored URLs must be replaced.
export function fixStorageUrl(url: string): string {
  const configured = new URL(supabaseUrl);
  if (configured.hostname === "127.0.0.1") return url;
  return url.replace("//127.0.0.1:", `//${configured.hostname}:`);
}
