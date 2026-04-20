import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";

const NAV = [
  { label: "Dashboard", href: "/platform-admin/dashboard" },
  { label: "Schools", href: "/platform-admin/schools" },
];

export default async function PlatformAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (roleRow?.role !== "super_admin") redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const userName = profile?.full_name ?? user.email ?? "Admin";

  return (
    <div className="flex h-screen">
      <Sidebar title="WnR Platform" items={NAV} userName={userName} userRole="super_admin" />
      <main className="flex-1 overflow-y-auto bg-[#F8F9FC] px-8 py-6">{children}</main>
    </div>
  );
}
