import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DataTable } from "@/components/data-table";
import { AddClassForm } from "./add-class-form";

export default async function ClassesPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("school_id").eq("id", user!.id).single();

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, \"order\"")
    .eq("school_id", profile!.school_id!)
    .order("order");

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Classes</h1>
      <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
        <AddClassForm schoolId={profile!.school_id!} />
      </div>
      <DataTable
        data={classes ?? []}
        columns={[
          { header: "Class Name", accessor: "name" },
          { header: "Order", accessor: "order" },
        ]}
        emptyMessage="No classes yet."
      />
    </div>
  );
}
