import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { DataTable } from "@/components/data-table";
import { AddClassForm } from "./add-class-form";
import { AddSectionForm } from "./add-section-form";

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
    const cls = (s.class as unknown as { name: string } | null);
    return {
      id: s.id,
      class_name: cls?.name ?? "",
      section_name: s.name,
    };
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Classes</h1>
      <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
        <AddClassForm schoolId={schoolId} />
      </div>
      <DataTable
        data={classes ?? []}
        columns={[
          { header: "Class Name", accessor: "name" },
          { header: "Order", accessor: "order" },
        ]}
        emptyMessage="No classes yet."
      />

      <h2 className="mb-4 mt-10 text-xl font-bold text-gray-900">Sections</h2>
      <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
        <AddSectionForm schoolId={schoolId} classes={classes ?? []} />
      </div>
      <DataTable
        data={sectionRows}
        columns={[
          { header: "Class", accessor: "class_name" },
          { header: "Section", accessor: "section_name" },
        ]}
        emptyMessage="No sections yet."
      />
    </div>
  );
}
