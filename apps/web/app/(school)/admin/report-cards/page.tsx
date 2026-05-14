import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { PageHeader } from "@/components/page-header";
import { ReportCardTable } from "./report-card-table";

export default async function ReportCardsPage() {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  const [{ data: students }, { data: classes }, { data: exams }] = await Promise.all([
    supabase
      .from("student_profiles")
      .select("id, full_name, roll_number, class:classes(name), section:sections(name)")
      .eq("school_id", schoolId)
      .limit(5000),
    supabase
      .from("classes")
      .select("id, name")
      .eq("school_id", schoolId)
      .order("order"),
    supabase
      .from("exams")
      .select("id, name")
      .eq("school_id", schoolId)
      .order("start_date", { ascending: false }),
  ]);

  const rows = (students ?? []).map((s) => {
    const c = s.class as unknown as { name: string } | null;
    const sec = s.section as unknown as { name: string } | null;
    return {
      id: s.id,
      name: s.full_name ?? "",
      roll: s.roll_number ?? "",
      class_name: c?.name ?? "",
      section: sec?.name ?? "",
    };
  });

  const classOptions = (classes ?? []).map((c) => ({ label: c.name, value: c.name }));
  const examOptions = (exams ?? []).map((e) => ({ label: e.name, value: e.id }));

  return (
    <div>
      <PageHeader
        title="Report Cards"
        description="View and download student report cards."
        stats={[{ label: "Total Students", value: rows.length }]}
      />
      <ReportCardTable rows={rows} classOptions={classOptions} examOptions={examOptions} />
    </div>
  );
}
