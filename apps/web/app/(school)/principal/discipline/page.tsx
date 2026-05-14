import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

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
      "id, student_id, category, severity, description, created_at, student:student_profiles(full_name, roll_number)"
    )
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });

  const rows = (records ?? []).map((r) => {
    const sp = r.student as unknown as { full_name: string; roll_number: string | null } | null;
    return {
      id: r.id,
      student_id: (r as any).student_id ?? "",
      student_name: sp?.full_name ?? "—",
      roll_number: sp?.roll_number ?? "—",
      category: r.category ?? "—",
      severity: r.severity,
      description: r.description ?? "—",
      date: r.created_at ? new Date(r.created_at).toLocaleDateString() : "—",
    };
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Discipline</h1>
        <p className="mt-1 text-sm text-muted-foreground">All discipline incidents across the school.</p>
      </div>
      <DataTable
        data={rows}
        columns={[
          {
            header: "Student",
            accessor: (row) => (
              <Link
                href={`/principal/students/${row.student_id}`}
                className="font-medium text-indigo-600 hover:underline"
              >
                {row.student_name}
              </Link>
            ),
          },
          { header: "Roll No.", accessor: "roll_number" },
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
