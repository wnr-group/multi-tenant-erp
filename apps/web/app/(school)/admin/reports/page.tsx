import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { DataTable } from "@/components/data-table";

export default async function AdminReportsPage() {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  const [
    { data: exams, count: examCount },
    { count: studentCount },
    { count: disciplineCount },
    { count: attendanceCount },
  ] = await Promise.all([
    supabase
      .from("exams")
      .select("id, name, start_date, end_date, academic_year:academic_years(name)", { count: "exact" })
      .eq("school_id", schoolId)
      .order("start_date", { ascending: false }),
    supabase
      .from("student_profiles")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId),
    supabase
      .from("discipline_records")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId),
    supabase
      .from("attendance_records")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId),
  ]);

  const examRows = (exams ?? []).map((e) => {
    const ay = e.academic_year as unknown as { name: string } | null;
    return {
      id: e.id,
      name: e.name,
      academic_year: ay?.name ?? "—",
      start_date: e.start_date ? new Date(e.start_date).toLocaleDateString() : "—",
      end_date: e.end_date ? new Date(e.end_date).toLocaleDateString() : "—",
    };
  });

  const stats = [
    { label: "Total Students", value: studentCount ?? 0 },
    { label: "Total Exams", value: examCount ?? 0 },
    { label: "Attendance Records", value: attendanceCount ?? 0 },
    { label: "Discipline Incidents", value: disciplineCount ?? 0 },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="mt-1 text-sm text-gray-500">School-wide summary and exam schedule.</p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-3xl font-bold text-foreground">{s.value.toLocaleString("en-IN")}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-800">Exam Schedule</h2>
        <DataTable
          data={examRows}
          columns={[
            { header: "Exam Name", accessor: "name" },
            { header: "Academic Year", accessor: "academic_year" },
            { header: "Start Date", accessor: "start_date" },
            { header: "End Date", accessor: "end_date" },
          ]}
          emptyMessage="No exams scheduled yet."
        />
      </div>
    </div>
  );
}
