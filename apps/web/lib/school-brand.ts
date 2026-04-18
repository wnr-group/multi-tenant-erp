import { getSchoolId } from "./school";
import { createServiceSupabaseClient } from "./supabase/server";

/**
 * Get the current school's branding (name + primary_color).
 * Uses service client to bypass RLS (works for context-switched super admins too).
 */
export async function getSchoolBrand(): Promise<{
  name: string;
  primaryColor: string;
} | null> {
  const schoolId = await getSchoolId();
  if (!schoolId) return null;

  const supabase = createServiceSupabaseClient();
  const { data: school } = await supabase
    .from("schools")
    .select("name, primary_color")
    .eq("id", schoolId)
    .single();

  if (!school) return null;

  return {
    name: school.name,
    primaryColor: school.primary_color,
  };
}
