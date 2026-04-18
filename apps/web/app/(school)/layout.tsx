import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "../../lib/supabase/server";

const SCHOOL_ROLES = [
  "super_admin",
  "school_admin",
  "principal",
  "teacher",
] as const;

export default async function SchoolLayout({
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

  if (
    !roleRow ||
    !SCHOOL_ROLES.includes(roleRow.role as (typeof SCHOOL_ROLES)[number])
  ) {
    redirect("/login");
  }

  return <div className="min-h-screen bg-gray-50">{children}</div>;
}
