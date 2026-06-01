import { headers } from "next/headers";
import { createServiceSupabaseClient } from "./supabase/server";

export async function getAcademicYearId(schoolId: string): Promise<string | null> {
  const headersList = await headers();
  const fromHeader = headersList.get("x-academic-year-id");
  if (fromHeader) return fromHeader;

  const supabase = createServiceSupabaseClient();
  const { data } = await supabase
    .from("academic_years")
    .select("id")
    .eq("school_id", schoolId)
    .eq("status", "active")
    .single();
  return data?.id ?? null;
}
