import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { CreateDisciplineForm } from "./create-discipline-form";

type SeverityVariant = "default" | "secondary" | "destructive" | "outline";

function severityVariant(severity: string | null): SeverityVariant {
  if (severity === "suspension") return "destructive";
  if (severity === "written") return "secondary";
  return "outline";
}

export default async function TeacherDisciplinePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const schoolId = (await getSchoolId())!;

  const [{ data: records }, { data: students }] = await Promise.all([
    supabase
      .from("discipline_records")
      .select(
        "id, category, severity, description, date, student:student_profiles(profile:profiles(full_name))"
      )
      .eq("teacher_id", user!.id)
      .order("date", { ascending: false }),
    supabase
      .from("student_profiles")
      .select("id, profile:profiles(full_name)")
      .eq("school_id", schoolId),
  ]);

  const rows = (records ?? []).map((r) => {
    const sp = r.student as unknown as {
      profile: { full_name: string } | null;
    } | null;
    return {
      id: r.id,
      student_name: sp?.profile?.full_name ?? "—",
      category: r.category ?? "—",
      severity: r.severity,
      description: r.description ?? "—",
      date: r.date ? new Date(r.date).toLocaleDateString() : "—",
    };
  });

  const studentOptions = (students ?? []).map((s) => {
    const p = s.profile as unknown as { full_name: string } | null;
    return { id: s.id, full_name: p?.full_name ?? "—" };
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Discipline</h1>

      <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">
          Log Incident
        </h2>
        <CreateDisciplineForm
          teacherId={user!.id}
          schoolId={schoolId}
          students={studentOptions}
        />
      </div>

      <DataTable
        data={rows}
        columns={[
          { header: "Student", accessor: "student_name" },
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
        emptyMessage="No discipline records yet."
      />
    </div>
  );
}
