import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";

type SeverityVariant = "default" | "secondary" | "destructive" | "outline";

function severityVariant(severity: string | null): SeverityVariant {
  if (severity === "high" || severity === "severe") return "destructive";
  if (severity === "medium") return "secondary";
  return "outline";
}

export default async function DisciplinePage() {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  const { data: records } = await supabase
    .from("discipline_records")
    .select(
      "id, category, severity, description, date, student:student_profiles(profile:profiles(full_name))"
    )
    .eq("school_id", schoolId)
    .order("date", { ascending: false });

  const rows = (records ?? []).map((r) => {
    const sp = r.student as unknown as { profile: { full_name: string } | null } | null;
    const studentName = sp?.profile?.full_name ?? "—";
    return {
      id: r.id,
      student_name: studentName,
      category: r.category ?? "—",
      severity: r.severity,
      description: r.description ?? "—",
      date: r.date ? new Date(r.date).toLocaleDateString() : "—",
    };
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Discipline</h1>
      <DataTable
        data={rows}
        columns={[
          { header: "Student", accessor: "student_name" },
          { header: "Category", accessor: "category" },
          {
            header: "Severity",
            accessor: (row) => (
              <Badge variant={severityVariant(row.severity)}>
                {row.severity ?? "low"}
              </Badge>
            ),
          },
          { header: "Description", accessor: "description" },
          { header: "Date", accessor: "date" },
        ]}
        emptyMessage="No discipline records found."
      />
    </div>
  );
}
