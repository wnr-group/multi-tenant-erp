import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getActiveSection } from "@/lib/section-context";

export default async function TeacherLayout({
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

  const allowed = ["teacher", "principal", "school_admin", "super_admin"];
  if (!roleRow || !allowed.includes(roleRow.role)) redirect("/login");

  if (roleRow.role !== "teacher") {
    const activeSection = await getActiveSection();
    if (!activeSection) {
      const dest = roleRow.role === "principal" ? "/principal/dashboard" : "/admin/dashboard";
      redirect(dest);
    }
  }

  return <>{children}</>;
}
