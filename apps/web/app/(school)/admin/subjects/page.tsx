import { BookOpen } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { PageHeader } from "@/components/page-header";
import { ActionDialog } from "@/components/action-dialog";
import { FilterableDataTable } from "@/components/filterable-data-table";
import { EmptyState } from "@/components/empty-state";
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

  const classesData = classes ?? [];

  // Unique class names for filter
  const uniqueClasses = Array.from(
    new Map(classesData.map((c) => [c.name, c])).values()
  );

  const totalSubjects = rows.length;
  const classesCovered = new Set(
    rows.filter((r) => r.class_name !== "—").map((r) => r.class_name)
  ).size;

  return (
    <div>
      <PageHeader
        title="Subjects"
        description="Manage subjects taught in each class."
        stats={[
          { label: "Total Subjects", value: totalSubjects },
          { label: "Classes Covered", value: classesCovered },
        ]}
        action={
          <ActionDialog trigger="+ Add Subject" title="Add Subject">
            {(onSuccess) => (
              <AddSubjectForm
                schoolId={schoolId}
                classes={classesData}
                onSuccess={onSuccess}
              />
            )}
          </ActionDialog>
        }
      />

      <FilterableDataTable
        data={rows}
        columns={[
          { header: "Subject", accessor: "name" },
          { header: "Code", accessor: "code" },
          { header: "Class", accessor: "class_name" },
        ]}
        searchKeys={["name", "code"]}
        searchPlaceholder="Search subjects..."
        filter={
          uniqueClasses.length > 0
            ? {
                label: "All Classes",
                options: uniqueClasses.map((c) => ({
                  value: c.name,
                  label: c.name,
                })),
                filterFn: (row, value) => row.class_name === value,
              }
            : undefined
        }
        emptyState={
          <EmptyState
            icon={BookOpen}
            title="No subjects yet"
            description="Add subjects so teachers can assign homework and enter marks."
            action={
              <ActionDialog trigger="+ Add Subject" title="Add Subject">
                {(onSuccess) => (
                  <AddSubjectForm
                    schoolId={schoolId}
                    classes={classesData}
                    onSuccess={onSuccess}
                  />
                )}
              </ActionDialog>
            }
          />
        }
      />
    </div>
  );
}
