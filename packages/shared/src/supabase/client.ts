import { createBrowserClient } from "@supabase/ssr";

// Accepts explicit URL and key rather than reading process.env directly,
// so both Next.js (NEXT_PUBLIC_*) and Expo (EXPO_PUBLIC_*) can call it
// with their respective env var prefixes.
export function createClient(supabaseUrl: string, supabaseAnonKey: string) {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
