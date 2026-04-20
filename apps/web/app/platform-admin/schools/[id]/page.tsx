import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ToggleActiveButton } from "./toggle-active-button";
import { ViewAsButton } from "./view-as-button";
import { SchoolTabs } from "./school-tabs";
import { OverviewTab } from "./overview-tab";
import { UsersTab } from "./users-tab";
import { ImportTab } from "./import-tab";

export default async function SchoolDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const activeTab = tab ?? "overview";

  const supabase = createServiceSupabaseClient();
  const { data: school } = await supabase
    .from("schools")
    .select("*")
    .eq("id", id)
    .single();

  if (!school) notFound();

  // Fetch all role rows (including inactive) for the users tab
  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("id, user_id, role, is_active")
    .eq("school_id", id);

  const userIds = [...new Set((roleRows ?? []).map((r) => r.user_id))];
  const { data: profiles } = userIds.length > 0
    ? await supabase.from("profiles").select("id, full_name, email").in("id", userIds)
    : { data: [] };

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  const users = (roleRows ?? []).map((r) => {
    const profile = profileMap.get(r.user_id);
    return {
      id: r.user_id,
      roleId: r.id,
      full_name: profile?.full_name ?? "",
      email: profile?.email ?? "",
      role: r.role,
      is_active: r.is_active,
    };
  });

  // Compute role counts for overview
  const roleCounts = {
    school_admin: users.filter((u) => u.role === "school_admin" && u.is_active).length,
    principal: users.filter((u) => u.role === "principal" && u.is_active).length,
    teacher: users.filter((u) => u.role === "teacher" && u.is_active).length,
    student: users.filter((u) => u.role === "student" && u.is_active).length,
    parent: users.filter((u) => u.role === "parent" && u.is_active).length,
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{school.name}</h1>
          <p className="text-sm text-gray-500">{school.contact_email} · {school.domain}</p>
        </div>
        <div className="flex gap-2">
          <ToggleActiveButton schoolId={school.id} isActive={school.is_active} />
          <ViewAsButton schoolDomain={school.domain ?? ""} />
        </div>
      </div>

      <SchoolTabs schoolId={school.id} />

      {activeTab === "overview" && (
        <OverviewTab school={school} roleCounts={roleCounts} />
      )}
      {activeTab === "users" && (
        <UsersTab schoolId={school.id} users={users} />
      )}
      {activeTab === "import" && (
        <ImportTab schoolId={school.id} />
      )}
    </div>
  );
}
