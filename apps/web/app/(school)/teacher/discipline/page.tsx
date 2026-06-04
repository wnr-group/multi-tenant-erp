import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { getActiveSection } from "@/lib/section-context";
import { NoSectionPrompt } from "../no-section-prompt";
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
  const sectionId = await getActiveSection();
  if (!sectionId) return <NoSectionPrompt />;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const schoolId = (await getSchoolId())!;

  // Fetch students enrolled in the active section
  const { data: enrollments } = await supabase
    .from("student_enrollments")
    .select("student_profile_id, roll_number, student_profile:student_profiles(id, full_name)")
    .eq("section_id", sectionId)
    .eq("is_active", true);

  // Build student lookup map and dropdown options
  const studentMap = new Map<string, { name: string; roll: string }>();
  const studentOptions: { value: string; label: string }[] = [];

  for (const e of enrollments ?? []) {
    const sp = e.student_profile as unknown as { id: string; full_name: string | null } | null;
    if (!sp) continue;
    const name = sp.full_name ?? "—";
    const roll = e.roll_number ?? "—";
    studentMap.set(sp.id, { name, roll });
    studentOptions.push({ value: sp.id, label: name });
  }

  const studentIds = Array.from(studentMap.keys());

  // Fetch discipline records for students in this section
  const { data: records } = await supabase
    .from("discipline_records")
    .select("id, student_id, category, severity, description, created_at")
    .eq("school_id", schoolId)
    .in(
      "student_id",
      studentIds.length > 0
        ? studentIds
        : ["00000000-0000-0000-0000-000000000000"]
    )
    .order("created_at", { ascending: false });

  const rows = (records ?? []).map((r) => {
    const student = studentMap.get(r.student_id);
    return {
      id: r.id,
      student_name: student?.name ?? "—",
      roll_number: student?.roll ?? "—",
      category: r.category ?? "—",
      severity: r.severity as string | null,
      description: r.description ?? "—",
      date: r.created_at ? new Date(r.created_at).toLocaleDateString() : "—",
    };
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Discipline</h1>
        <p className="mt-1 text-sm text-muted-foreground">Discipline records for your section.</p>
      </div>

      <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">
          Log Incident
        </h2>
        <CreateDisciplineForm
          schoolId={schoolId}
          sectionId={sectionId}
          students={studentOptions}
          userId={user!.id}
        />
      </div>

      <DataTable
        data={rows}
        columns={[
          { header: "Student", accessor: "student_name" },
          { header: "Roll No.", accessor: "roll_number" },
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
