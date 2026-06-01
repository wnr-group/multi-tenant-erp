import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { PageHeader } from "@/components/page-header";
import { NewYearButton, ActivateYearButton, AddExamDialog } from "./academic-dialogs";
import { AcademicYearsTable, ExamsTable } from "./academics-table";

export default async function AcademicsPage() {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  const { data: academicYears } = await supabase
    .from("academic_years")
    .select("id, name, start_date, end_date, status")
    .eq("school_id", schoolId)
    .order("start_date", { ascending: false });

  const { data: exams } = await supabase
    .from("exams")
    .select("id, name, start_date, end_date, academic_year:academic_years(name)")
    .eq("school_id", schoolId)
    .order("start_date", { ascending: false });

  const years = academicYears ?? [];
  const activeYear = years.find((y) => y.status === "active");
  const draftYear = years.find((y) => y.status === "draft");

  const yearRows = years.map((y) => ({
    id: y.id,
    name: y.name,
    start: y.start_date ?? "—",
    end: y.end_date ?? "—",
    status: y.status as "draft" | "active" | "archived",
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
      <section>
        <PageHeader
          title="Academics"
          description="Manage academic years and exams for your school."
          action={
            <div className="flex items-center gap-2">
              {!draftYear && (
                <NewYearButton schoolId={schoolId} activeYearId={activeYear?.id ?? null} />
              )}
              {draftYear && (
                <ActivateYearButton draftYearId={draftYear.id} schoolId={schoolId} />
              )}
              {draftYear && (
                <a href="/admin/academics/promote" className="rounded-lg border border-indigo-600 px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50">
                  Promote Students →
                </a>
              )}
            </div>
          }
          stats={[
            { label: "Academic Years", value: years.length },
            { label: "Active Year", value: activeYear?.name ?? "—" },
            { label: "Exams", value: (exams ?? []).length },
          ]}
        />
        <AcademicYearsTable yearRows={yearRows} schoolId={schoolId} />
      </section>

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
