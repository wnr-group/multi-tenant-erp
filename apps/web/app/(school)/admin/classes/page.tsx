import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { PageHeader } from "@/components/page-header";
import { AddClassDialog, AddSectionDialog } from "./class-dialogs";
import { ClassesDataTable, SectionsDataTable } from "./classes-table";
import { ClassesQuickSetup } from "./classes-quick-setup";

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
      <ClassesQuickSetup schoolId={schoolId} />

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
        <ClassesDataTable classes={classes ?? []} schoolId={schoolId} />
      </div>

      <div>
        <PageHeader
          title="Sections"
          description="Assign sections to classes."
          action={<AddSectionDialog schoolId={schoolId} classes={classes ?? []} />}
        />
        <SectionsDataTable sectionRows={sectionRows} schoolId={schoolId} classes={(classes ?? []).map(c => ({ id: c.id, name: c.name }))} />
      </div>
    </div>
  );
}
