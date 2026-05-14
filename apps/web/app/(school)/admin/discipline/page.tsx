import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";

type SeverityVariant = "default" | "secondary" | "destructive" | "outline";

function severityVariant(severity: string | null): SeverityVariant {
  if (severity === "suspension") return "destructive";
  if (severity === "written") return "secondary";
  return "outline";
}

export default async function AdminDisciplinePage() {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  const { data: records } = await supabase
    .from("discipline_records")
    .select("id, category, severity, description, created_at, student:student_profiles(full_name, roll_number, section:sections(name, class:classes(name)))")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });

  const rows = (records ?? []).map((r) => {
    const sp = r.student as unknown as {
      full_name: string;
      roll_number: string | null;
      section: { name: string; class: { name: string } | null } | null;
    } | null;
    const className = sp?.section?.class?.name ?? "";
    const sectionName = sp?.section?.name ?? "";
    return {
      id: r.id,
      student_name: sp?.full_name ?? "—",
      roll_number: sp?.roll_number ?? "—",
      class_section: className && sectionName ? `${className} – ${sectionName}` : "—",
      category: r.category ?? "—",
      severity: r.severity as string | null,
      description: r.description ?? "—",
      date: r.created_at ? new Date(r.created_at).toLocaleDateString() : "—",
    };
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Discipline</h1>
        <p className="mt-1 text-sm text-gray-500">All discipline incidents across the school.</p>
      </div>
      <DataTable
        data={rows}
        columns={[
          { header: "Student", accessor: "student_name" },
          { header: "Roll No.", accessor: "roll_number" },
          { header: "Class / Section", accessor: "class_section" },
          { header: "Category", accessor: "category" },
          {
            header: "Severity",
            accessor: (row) => (
              <Badge variant={severityVariant(row.severity)}>
                {row.severity ?? "verbal"}
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
