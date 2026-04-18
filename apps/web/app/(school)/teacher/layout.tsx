import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";
import { ContextSwitchBanner } from "@/components/context-switch-banner";
import { getSchoolBrand } from "@/lib/school-brand";

const NAV = [
  { label: "Dashboard", href: "/teacher/dashboard" },
  { label: "Attendance", href: "/teacher/attendance" },
  { label: "Homework", href: "/teacher/homework" },
  { label: "Results", href: "/teacher/results" },
  { label: "Discipline", href: "/teacher/discipline" },
  { label: "Feedback", href: "/teacher/feedback" },
];

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
    .single();

  const allowed = ["teacher", "principal", "school_admin", "super_admin"];
  if (!roleRow || !allowed.includes(roleRow.role)) redirect("/login");

  const brand = await getSchoolBrand();
  const brandStyle = brand?.primaryColor
    ? ({ "--school-color": brand.primaryColor } as React.CSSProperties)
    : undefined;

  return (
    <div className="flex h-screen flex-col" style={brandStyle}>
      <ContextSwitchBanner />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar title={brand?.name ?? "Teacher"} items={NAV} brandColor={brand?.primaryColor} />
        <main className="flex-1 overflow-y-auto bg-[#F8F9FC] px-8 py-6">{children}</main>
      </div>
    </div>
  );
}
