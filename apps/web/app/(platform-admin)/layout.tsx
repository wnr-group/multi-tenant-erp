import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "../../lib/supabase/server";

export default async function PlatformAdminLayout({
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

  if (roleRow?.role !== "super_admin") redirect("/login");

  return <div className="min-h-screen bg-gray-100">{children}</div>;
}
