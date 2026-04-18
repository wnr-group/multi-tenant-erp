import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { DataTable } from "@/components/data-table";
import { AddSubjectForm } from "./add-subject-form";

export default async function SubjectsPage() {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  const [{ data: subjects }, { data: classes }] = await Promise.all([
    supabase
      .from("subjects")
      .select("id, name, code, class:classes(name)")
      .eq("school_id", schoolId)
      .order("name"),
    supabase
      .from("classes")
      .select("id, name")
      .eq("school_id", schoolId)
      .order("order"),
  ]);

  const rows = (subjects ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    code: s.code ?? "—",
    class_name:
      (s.class as unknown as { name: string } | null)?.name ?? "—",
  }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Subjects</h1>
      <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
        <AddSubjectForm schoolId={schoolId} classes={classes ?? []} />
      </div>
      <DataTable
        data={rows}
        columns={[
          { header: "Subject", accessor: "name" },
          { header: "Code", accessor: "code" },
          { header: "Class", accessor: "class_name" },
        ]}
        emptyMessage="No subjects yet. Add subjects so teachers can assign homework and enter marks."
      />
    </div>
  );
}
