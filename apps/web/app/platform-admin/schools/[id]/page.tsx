import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ToggleActiveButton } from "./toggle-active-button";
import { ViewAsButton } from "./view-as-button";

export default async function SchoolDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServiceSupabaseClient();
  const { data: school } = await supabase
    .from("schools")
    .select("*")
    .eq("id", id)
    .single();

  if (!school) notFound();

  // Get user IDs + roles from user_roles, then fetch their profiles
  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("user_id, role")
    .eq("school_id", id)
    .eq("is_active", true);

  const userIds = (roleRows ?? []).map((r) => r.user_id);
  const roleMap = new Map((roleRows ?? []).map((r) => [r.user_id, r.role]));

  const { data: profiles } = userIds.length > 0
    ? await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds)
    : { data: [] };

  const users = (profiles ?? []).map((p) => ({
    ...p,
    role: roleMap.get(p.id) ?? "",
  }));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{school.name}</h1>
          <p className="text-sm text-gray-500">{school.contact_email}</p>
        </div>
        <div className="flex gap-2">
          <ToggleActiveButton schoolId={school.id} isActive={school.is_active} />
          <ViewAsButton schoolDomain={school.domain ?? ""} />
        </div>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-800">Users ({users?.length ?? 0})</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-2">Name</th>
              <th className="pb-2">Email</th>
              <th className="pb-2">Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b last:border-0">
                <td className="py-2">{u.full_name}</td>
                <td className="py-2 text-gray-500">{u.email}</td>
                <td className="py-2 text-gray-500">{u.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
