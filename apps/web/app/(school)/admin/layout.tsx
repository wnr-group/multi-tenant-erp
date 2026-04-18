import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";
import { ContextSwitchBanner } from "@/components/context-switch-banner";

const NAV = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Classes", href: "/admin/classes" },
  { label: "Teachers", href: "/admin/teachers" },
  { label: "Students", href: "/admin/students" },
  { label: "Timetable", href: "/admin/timetable" },
  { label: "Academics", href: "/admin/academics" },
  { label: "Syllabus", href: "/admin/syllabus" },
  { label: "Fees", href: "/admin/fees" },
  { label: "Announcements", href: "/admin/announcements" },
  { label: "Settings", href: "/admin/settings" },
];

export default async function AdminLayout({
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

  const allowed = ["school_admin", "super_admin"];
  if (!roleRow || !allowed.includes(roleRow.role)) redirect("/login");

  return (
    <div className="flex h-screen flex-col">
      <ContextSwitchBanner />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar title="School Admin" items={NAV} />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-8">{children}</main>
      </div>
    </div>
  );
}
