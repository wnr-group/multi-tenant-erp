import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function AdminLayout({
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
    .limit(1)
    .single();

  const allowed = ["school_admin", "super_admin"];
  if (!roleRow || !allowed.includes(roleRow.role)) redirect("/login");

  return <>{children}</>;
}
