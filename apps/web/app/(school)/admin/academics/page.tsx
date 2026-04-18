import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DataTable } from "@/components/data-table";
import { AddAcademicYearForm } from "./add-academic-year-form";
import { AddExamForm } from "./add-exam-form";
import { Badge } from "@/components/ui/badge";

export default async function AcademicsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("school_id").eq("id", user!.id).single();
  const schoolId = profile!.school_id!;

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

  const yearRows = (academicYears ?? []).map((y) => ({
    id: y.id,
    name: y.name,
    start: y.start_date ?? "—",
    end: y.end_date ?? "—",
    current: y.is_current,
  }));

  const examRows = (exams ?? []).map((e) => {
    const ay = (e.academic_year as unknown as { name: string } | null);
    return {
      id: e.id,
      name: e.name,
      academic_year: ay?.name ?? "—",
      start: e.start_date ?? "—",
      end: e.end_date ?? "—",
    };
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Academics</h1>

      <h2 className="mb-4 text-xl font-semibold text-gray-800">Academic Years</h2>
      <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
        <AddAcademicYearForm schoolId={schoolId} />
      </div>
      <DataTable
        data={yearRows}
        columns={[
          { header: "Name", accessor: "name" },
          { header: "Start", accessor: "start" },
          { header: "End", accessor: "end" },
          {
            header: "Status",
            accessor: (row) =>
              row.current ? (
                <Badge variant="default">Current</Badge>
              ) : (
                <Badge variant="secondary">Inactive</Badge>
              ),
          },
        ]}
        emptyMessage="No academic years yet."
      />

      <h2 className="mb-4 mt-10 text-xl font-semibold text-gray-800">Exams</h2>
      <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
        <AddExamForm
          schoolId={schoolId}
          academicYears={(academicYears ?? []).map((y) => ({ id: y.id, name: y.name }))}
        />
      </div>
      <DataTable
        data={examRows}
        columns={[
          { header: "Exam Name", accessor: "name" },
          { header: "Academic Year", accessor: "academic_year" },
          { header: "Start", accessor: "start" },
          { header: "End", accessor: "end" },
        ]}
        emptyMessage="No exams yet."
      />
    </div>
  );
}
