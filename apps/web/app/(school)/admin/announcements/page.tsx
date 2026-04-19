import { Megaphone } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { PageHeader } from "@/components/page-header";
import { FilterableDataTable } from "@/components/filterable-data-table";
import { EmptyState } from "@/components/empty-state";
import { CreateAnnouncementDialog } from "./create-announcement-dialog";

export default async function AnnouncementsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const schoolId = (await getSchoolId())!;

  const { data: announcements } = await supabase
    .from("announcements")
    .select("id, title, target_type, created_at")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const rows = (announcements ?? []).map((a) => ({
    id: a.id,
    title: a.title as string,
    target_type: a.target_type as string,
    date: new Date(a.created_at).toLocaleDateString(),
    created_at: a.created_at as string,
  }));

  const thisMonthCount = rows.filter((r) => r.created_at >= thisMonthStart).length;

  return (
    <div>
      <PageHeader
        title="Announcements"
        description="Broadcast messages to students, teachers, or everyone."
        action={<CreateAnnouncementDialog schoolId={schoolId} createdBy={user!.id} />}
        stats={[
          { label: "Total Sent", value: rows.length },
          { label: "This Month", value: thisMonthCount },
        ]}
      />

      <FilterableDataTable
        data={rows}
        columns={[
          { header: "Title", accessor: "title" },
          { header: "Target", accessor: "target_type" },
          { header: "Date", accessor: "date" },
        ]}
        searchKeys={["title"]}
        searchPlaceholder="Search by title…"
        filter={{
          label: "All Targets",
          options: [
            { label: "School", value: "school" },
            { label: "Students", value: "students" },
            { label: "Teachers", value: "teachers" },
          ],
          filterFn: (row, value) => row.target_type === value,
        }}
        emptyState={
          <EmptyState
            icon={Megaphone}
            title="No announcements yet"
            description="Post your first announcement to reach your school community."
            action={<CreateAnnouncementDialog schoolId={schoolId} createdBy={user!.id} />}
          />
        }
      />
    </div>
  );
}
