import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

import { Platform } from "react-native";

const DEFAULT_URL = Platform.OS === "android" ? "http://10.0.2.2:54321" : "http://127.0.0.1:54321";
const supabaseUrl = (Constants.expoConfig?.extra?.supabaseUrl as string)?.replace("127.0.0.1", Platform.OS === "android" ? "10.0.2.2" : "127.0.0.1") ?? DEFAULT_URL;
const supabaseAnonKey = (Constants.expoConfig?.extra?.supabaseAnonKey as string) ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
