import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { PageHeader } from "@/components/page-header";
import { AddSubjectDialog } from "./add-subject-dialog";
import { SubjectsTable } from "./subjects-table";

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

  const classesData = classes ?? [];

  // Unique class names for filter
  const uniqueClasses = Array.from(
    new Map(classesData.map((c) => [c.name, c])).values()
  );

  const totalSubjects = rows.length;
  const classesCovered = new Set(
    rows.filter((r) => r.class_name !== "—").map((r) => r.class_name)
  ).size;

  const classFilterOptions = uniqueClasses.map((c) => ({
    value: c.name,
    label: c.name,
  }));

  return (
    <div>
      <PageHeader
        title="Subjects"
        description="Manage subjects taught in each class."
        stats={[
          { label: "Total Subjects", value: totalSubjects },
          { label: "Classes Covered", value: classesCovered },
        ]}
        action={<AddSubjectDialog schoolId={schoolId} classes={classesData} />}
      />

      <SubjectsTable
        rows={rows}
        classFilterOptions={classFilterOptions}
        schoolId={schoolId}
        classesData={classesData}
      />
    </div>
  );
}
