import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "../../lib/supabase/server";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/top-bar";

const SCHOOL_ROLES = [
  "super_admin",
  "school_admin",
  "principal",
  "teacher",
] as const;

const NAV_ITEMS: Record<string, { label: string; href: string }[]> = {
  school_admin: [
    { label: "Dashboard", href: "/admin/dashboard" },
    { label: "Teachers", href: "/admin/teachers" },
    { label: "Students", href: "/admin/students" },
    { label: "Classes", href: "/admin/classes" },
    { label: "Subjects", href: "/admin/subjects" },
    { label: "Academics", href: "/admin/academics" },
    { label: "Fees", href: "/admin/fees" },
    { label: "Syllabus", href: "/admin/syllabus" },
    { label: "Announcements", href: "/admin/announcements" },
    { label: "Settings", href: "/admin/settings" },
  ],
  teacher: [
    { label: "Dashboard", href: "/teacher/dashboard" },
    { label: "Attendance", href: "/teacher/attendance" },
    { label: "Homework", href: "/teacher/homework" },
    { label: "Results", href: "/teacher/results" },
    { label: "Feedback", href: "/teacher/feedback" },
  ],
  principal: [
    { label: "Dashboard", href: "/principal/dashboard" },
    { label: "Reports", href: "/principal/reports" },
    { label: "Discipline", href: "/principal/discipline" },
    { label: "Announcements", href: "/principal/announcements" },
  ],
  super_admin: [
    { label: "Dashboard", href: "/platform-admin/dashboard" },
    { label: "Schools", href: "/platform-admin/schools" },
  ],
};

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

  const [{ data: roleRow }, { data: profile }] = await Promise.all([
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single(),
    supabase
      .from("profiles")
      .select("full_name, school_id")
      .eq("id", user.id)
      .single(),
  ]);

  if (
    !roleRow ||
    !SCHOOL_ROLES.includes(roleRow.role as (typeof SCHOOL_ROLES)[number])
  ) {
    redirect("/login");
  }

  const realRole = roleRow.role as string;
  const cookieStore = await cookies();
  const actingAs = cookieStore.get("acting_as")?.value;
  const VALID_ROLES = ["super_admin", "school_admin", "principal", "teacher", "student", "parent"];
  const effectiveRole = actingAs && VALID_ROLES.includes(actingAs) ? actingAs : realRole;
  const userName = profile?.full_name ?? user.email ?? "User";

  let brandColor: string | undefined;
  let schoolName = "School ERP";

  if (profile?.school_id) {
    const { data: school } = await supabase
      .from("schools")
      .select("name, primary_color")
      .eq("id", profile.school_id)
      .single();
    brandColor = school?.primary_color ?? undefined;
    schoolName = school?.name ?? "School ERP";
  }

  const navItems = NAV_ITEMS[effectiveRole] ?? [];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar
        title={schoolName}
        items={navItems}
        brandColor={brandColor}
        userName={userName}
        userRole={effectiveRole}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar
          userName={userName}
          userRole={effectiveRole}
          brandColor={brandColor}
        />
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
