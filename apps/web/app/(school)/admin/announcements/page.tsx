import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { PageHeader } from "@/components/page-header";
import { CreateAnnouncementDialog } from "./create-announcement-dialog";
import { AnnouncementsTable } from "./announcements-table";

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

      <AnnouncementsTable rows={rows} schoolId={schoolId} userId={user!.id} />
    </div>
  );
}
