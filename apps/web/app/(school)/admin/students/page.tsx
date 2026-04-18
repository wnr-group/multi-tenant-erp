import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { DataTable } from "@/components/data-table";
import { AddStudentForm } from "./add-student-form";

export default async function StudentsPage() {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  const [{ data: students }, { data: classes }] = await Promise.all([
    supabase.from("student_profiles")
      .select("id, roll_number, admission_number, profile:profiles(full_name, email), class:classes(name), section:sections(name)")
      .eq("school_id", schoolId),
    supabase.from("classes").select("id, name").eq("school_id", schoolId).order("order"),
  ]);

  const rows = (students ?? []).map((s) => {
    const p = (s.profile as unknown as { full_name: string } | null);
    const c = (s.class as unknown as { name: string } | null);
    const sec = (s.section as unknown as { name: string } | null);
    return {
      id: s.id,
      name: p?.full_name ?? "",
      roll: s.roll_number ?? "",
      class_name: c?.name ?? "",
      section: sec?.name ?? "",
    };
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Students</h1>
      <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
        <AddStudentForm schoolId={schoolId} classes={classes ?? []} />
      </div>
      <DataTable data={rows} columns={[
        { header: "Name", accessor: "name" },
        { header: "Roll No.", accessor: "roll" },
        { header: "Class", accessor: "class_name" },
        { header: "Section", accessor: "section" },
      ]} emptyMessage="No students yet." />
    </div>
  );
}
