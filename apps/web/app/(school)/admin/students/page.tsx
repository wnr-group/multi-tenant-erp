import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { PageHeader } from "@/components/page-header";
import { AddStudentDialog } from "./add-student-dialog";
import { StudentsTable } from "./students-table";

export default async function StudentsPage() {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  const [{ data: students }, { data: classes }] = await Promise.all([
    supabase
      .from("student_profiles")
      .select(
        "id, full_name, email, roll_number, admission_number, class:classes(name), section:sections(name)"
      )
      .eq("school_id", schoolId),
    supabase
      .from("classes")
      .select("id, name")
      .eq("school_id", schoolId)
      .order("order"),
  ]);

  const rows = (students ?? []).map((s) => {
    const c = s.class as unknown as { name: string } | null;
    const sec = s.section as unknown as { name: string } | null;
    return {
      id: s.id,
      name: s.full_name ?? "",
      roll: s.roll_number ?? "",
      class_name: c?.name ?? "",
      section: sec?.name ?? "",
    };
  });

  const classFilterOptions = (classes ?? []).map((c) => ({
    label: c.name,
    value: c.name,
  }));

  return (
    <div>
      <PageHeader
        title="Students"
        description="Manage student enrollment and profiles."
        action={<AddStudentDialog schoolId={schoolId} classes={classes ?? []} />}
        stats={[
          { label: "Total Students", value: rows.length },
          { label: "Classes", value: (classes ?? []).length },
        ]}
      />

      <StudentsTable rows={rows} classFilterOptions={classFilterOptions} />
    </div>
  );
}
