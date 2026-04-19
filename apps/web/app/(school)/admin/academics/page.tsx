import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { PageHeader } from "@/components/page-header";
import { AddAcademicYearDialog, AddExamDialog } from "./academic-dialogs";
import { AcademicYearsTable, ExamsTable } from "./academics-table";

export default async function AcademicsPage() {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  const { data: academicYears } = await supabase
    .from("academic_years")
    .select("id, name, start_date, end_date, is_current")
    .eq("school_id", schoolId)
    .order("start_date", { ascending: false });

  const { data: exams } = await supabase
    .from("exams")
    .select("id, name, start_date, end_date, academic_year:academic_years(name)")
    .eq("school_id", schoolId)
    .order("start_date", { ascending: false });

  const years = academicYears ?? [];
  const currentYear = years.find((y) => y.is_current);

  const yearRows = years.map((y) => ({
    id: y.id,
    name: y.name,
    start: y.start_date ?? "—",
    end: y.end_date ?? "—",
    is_current: y.is_current ?? false,
  }));

  const examRows = (exams ?? []).map((e) => {
    const ay = e.academic_year as unknown as { name: string } | null;
    return {
      id: e.id,
      name: e.name,
      academic_year: ay?.name ?? "—",
      start: e.start_date ?? "—",
      end: e.end_date ?? "—",
    };
  });

  return (
    <div className="space-y-10">
      {/* Academic Years section */}
      <section>
        <PageHeader
          title="Academics"
          description="Manage academic years and exams for your school."
          action={<AddAcademicYearDialog schoolId={schoolId} />}
          stats={[
            { label: "Academic Years", value: years.length },
            { label: "Current Year", value: currentYear?.name ?? "—" },
            { label: "Exams", value: (exams ?? []).length },
          ]}
        />

        <AcademicYearsTable yearRows={yearRows} />
      </section>

      {/* Exams section */}
      <section>
        <PageHeader
          title="Exams"
          description="Track all exams across academic years."
          action={
            <AddExamDialog
              schoolId={schoolId}
              academicYears={years.map((y) => ({ id: y.id, name: y.name }))}
            />
          }
        />

        <ExamsTable examRows={examRows} />
      </section>
    </div>
  );
}
