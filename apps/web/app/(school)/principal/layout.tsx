import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";
import { ContextSwitchBanner } from "@/components/context-switch-banner";

const NAV = [
  { label: "Dashboard", href: "/principal/dashboard" },
  { label: "Reports", href: "/principal/reports" },
  { label: "Discipline", href: "/principal/discipline" },
  { label: "Announcements", href: "/principal/announcements" },
];

export default async function PrincipalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  const allowed = ["principal", "school_admin", "super_admin"];
  if (!roleRow || !allowed.includes(roleRow.role)) redirect("/login");

  return (
    <div className="flex h-screen flex-col">
      <ContextSwitchBanner />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar title="Principal" items={NAV} />
        <main className="flex-1 overflow-y-auto bg-[#F8F9FC] px-8 py-6">{children}</main>
      </div>
    </div>
  );
}
