import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { PageHeader } from "@/components/page-header";
import { FilterableDataTable } from "@/components/filterable-data-table";
import { EmptyState } from "@/components/empty-state";
import { AddClassDialog, AddSectionDialog } from "./class-dialogs";
import { School } from "lucide-react";

export default async function ClassesPage() {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, \"order\"")
    .eq("school_id", schoolId)
    .order("order");

  const { data: sections } = await supabase
    .from("sections")
    .select("id, name, class_id, class:classes(name)")
    .eq("school_id", schoolId)
    .order("name");

  const sectionRows = (sections ?? []).map((s) => {
    const cls = s.class as unknown as { name: string } | null;
    return { id: s.id, class_name: cls?.name ?? "", section_name: s.name };
  });

  return (
    <div className="space-y-10">
      <div>
        <PageHeader
          title="Classes"
          description="Manage classes and sections for your school."
          action={<AddClassDialog schoolId={schoolId} />}
          stats={[
            { label: "Total Classes", value: (classes ?? []).length },
            { label: "Total Sections", value: sectionRows.length },
          ]}
        />
        <FilterableDataTable
          data={classes ?? []}
          columns={[
            { header: "Class Name", accessor: "name" },
            { header: "Order", accessor: "order" },
          ]}
          searchKeys={["name"]}
          searchPlaceholder="Search classes..."
          emptyState={<EmptyState icon={School} title="No classes yet" description="Add your first class to get started." />}
        />
      </div>

      <div>
        <PageHeader
          title="Sections"
          description="Assign sections to classes."
          action={<AddSectionDialog schoolId={schoolId} classes={classes ?? []} />}
        />
        <FilterableDataTable
          data={sectionRows}
          columns={[
            { header: "Class", accessor: "class_name" },
            { header: "Section", accessor: "section_name" },
          ]}
          searchKeys={["class_name", "section_name"]}
          searchPlaceholder="Search sections..."
          emptyState={<EmptyState icon={School} title="No sections yet" description="Add sections after creating classes." />}
        />
      </div>
    </div>
  );
}
