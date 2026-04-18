import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DataTable } from "@/components/data-table";

export default async function ReportsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id")
    .eq("id", user!.id)
    .single();

  const schoolId = profile?.school_id!;

  const { data: exams } = await supabase
    .from("exams")
    .select("id, name, start_date, end_date")
    .eq("school_id", schoolId)
    .order("start_date", { ascending: false });

  const rows = (exams ?? []).map((e) => ({
    id: e.id,
    name: e.name,
    start_date: e.start_date ? new Date(e.start_date).toLocaleDateString() : "—",
    end_date: e.end_date ? new Date(e.end_date).toLocaleDateString() : "—",
  }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Reports</h1>
      <DataTable
        data={rows}
        columns={[
          { header: "Exam Name", accessor: "name" },
          { header: "Start Date", accessor: "start_date" },
          { header: "End Date", accessor: "end_date" },
        ]}
        emptyMessage="No exams found."
      />
    </div>
  );
}
