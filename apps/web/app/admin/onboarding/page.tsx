import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { WizardShell } from "./wizard-shell";

export default async function OnboardingPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const schoolId = await getSchoolId();
  if (!schoolId) redirect("/login");

  // If school already has years, redirect to dashboard
  const { count } = await supabase
    .from("academic_years")
    .select("*", { count: "exact", head: true })
    .eq("school_id", schoolId);

  if ((count ?? 0) > 0) redirect("/admin/dashboard");

  // Fetch school name for display
  const { data: school } = await supabase
    .from("schools")
    .select("name, primary_color")
    .eq("id", schoolId)
    .single();

  return (
    <WizardShell
      schoolId={schoolId}
      schoolName={school?.name ?? "Your School"}
      brandColor={school?.primary_color ?? "#4f46e5"}
      initialStep={1}
      classCount={0}
      teacherCount={0}
      studentCount={0}
    />
  );
}
