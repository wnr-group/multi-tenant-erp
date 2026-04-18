import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { DataTable } from "@/components/data-table";
import { CreateAnnouncementForm } from "../../admin/announcements/create-announcement-form";

export default async function PrincipalAnnouncementsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const schoolId = (await getSchoolId())!;

  const { data: announcements } = await supabase
    .from("announcements")
    .select("id, title, target_type, created_at")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Announcements</h1>
      <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
        <CreateAnnouncementForm schoolId={schoolId} createdBy={user!.id} />
      </div>
      <DataTable
        data={announcements ?? []}
        columns={[
          { header: "Title", accessor: "title" },
          { header: "Target", accessor: "target_type" },
          {
            header: "Date",
            accessor: (row) => new Date(row.created_at).toLocaleDateString(),
          },
        ]}
        emptyMessage="No announcements yet."
      />
    </div>
  );
}
