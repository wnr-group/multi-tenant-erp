import { headers } from "next/headers";
import { createServiceSupabaseClient } from "./supabase/server";

/**
 * Get the current school_id for server components.
 * Resolves from: middleware x-school-id header (domain-based) → user profile fallback.
 * This works correctly even for context-switched super_admins.
 */
export async function getSchoolId(): Promise<string | null> {
  const headersList = await headers();

  // Primary: middleware resolves school from domain
  const fromHeader = headersList.get("x-school-id");
  if (fromHeader) return fromHeader;

  // Fallback: look up from host header directly
  const host = headersList.get("host") ?? "";
  const domain = host.replace(/:\d+$/, "");
  if (domain) {
    const supabase = createServiceSupabaseClient();
    const { data: school } = await supabase
      .from("schools")
      .select("id")
      .eq("domain", domain)
      .single();
    if (school) return school.id;
  }

  return null;
}
