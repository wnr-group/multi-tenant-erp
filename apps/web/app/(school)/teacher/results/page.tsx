import { createServerSupabaseClient } from "@/lib/supabase/server";
import Link from "next/link";
import { DataTable } from "@/components/data-table";

export default async function ResultsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id")
    .eq("id", user!.id)
    .single();

  const schoolId = profile!.school_id!;

  const { data: exams } = await supabase
    .from("exams")
    .select("id, name, start_date, end_date, academic_year:academic_years(name)")
    .eq("school_id", schoolId)
    .order("start_date", { ascending: false });

  const rows = (exams ?? []).map((e) => {
    const ay = e.academic_year as unknown as { name: string } | null;
    return {
      id: e.id,
      name: e.name ?? "—",
      academic_year: ay?.name ?? "—",
      start_date: e.start_date ?? "—",
      end_date: e.end_date ?? "—",
    };
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Results / Exam Marks</h1>
      <DataTable
        data={rows}
        columns={[
          { header: "Exam", accessor: "name" },
          { header: "Academic Year", accessor: "academic_year" },
          { header: "Start", accessor: "start_date" },
          { header: "End", accessor: "end_date" },
          {
            header: "Action",
            accessor: (row) => (
              <Link
                href={`/teacher/results/${row.id}`}
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                Enter Marks
              </Link>
            ),
          },
        ]}
        emptyMessage="No exams found."
      />
    </div>
  );
}
