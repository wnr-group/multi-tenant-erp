import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { PageHeader } from "@/components/page-header";
import { AddStudentDialog } from "./add-student-dialog";
import { BulkActions } from "./bulk-actions";
import { StudentsTable } from "./students-table";

export default async function StudentsPage() {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  const [{ data: students }, { data: classes }] = await Promise.all([
    supabase
      .from("student_profiles")
      .select(
        "id, full_name, email, roll_number, admission_number, parent_phone, class:classes(name), section:sections(name)"
      )
      .eq("school_id", schoolId)
      .limit(5000),
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
      email: s.email ?? "",
      roll: s.roll_number ?? "",
      admission_number: s.admission_number ?? "",
      class_name: c?.name ?? "",
      section: sec?.name ?? "",
      parent_phone: s.parent_phone ?? "",
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
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/admin/students/uninstalled"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-muted-foreground shadow-sm hover:bg-muted"
            >
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700">!</span>
              App Not Installed
            </Link>
            <BulkActions students={rows} />
            <AddStudentDialog schoolId={schoolId} classes={classes ?? []} />
          </div>
        }
        stats={[
          { label: "Total Students", value: rows.length },
          { label: "Classes", value: (classes ?? []).length },
        ]}
      />

      <StudentsTable rows={rows} classFilterOptions={classFilterOptions} />
    </div>
  );
}
