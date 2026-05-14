import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "../../lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/top-bar";
import { SectionSwitcher } from "@/components/section-switcher";
import type { SectionOption } from "@/components/section-switcher";

const SCHOOL_ROLES = [
  "super_admin",
  "school_admin",
  "principal",
  "teacher",
] as const;

const NAV_ITEMS: Record<string, { label: string; href: string }[]> = {
  school_admin: [
    { label: "Dashboard",      href: "/admin/dashboard" },
    { label: "Teachers",       href: "/admin/teachers" },
    { label: "Students",       href: "/admin/students" },
    { label: "Classes",        href: "/admin/classes" },
    { label: "Subjects",       href: "/admin/subjects" },
    { label: "Timetable",      href: "/admin/timetable" },
    { label: "Academics",      href: "/admin/academics" },
    { label: "Fees",           href: "/admin/fees" },
    { label: "Syllabus",       href: "/admin/syllabus" },
    { label: "Announcements",  href: "/admin/announcements" },
    { label: "Gallery",        href: "/admin/gallery" },
    { label: "Discipline",     href: "/admin/discipline" },
    { label: "Feedback",       href: "/admin/feedback" },
    { label: "Reports",        href: "/admin/reports" },
    { label: "Report Cards",   href: "/admin/report-cards" },
    { label: "Settings",       href: "/admin/settings" },
  ],
  teacher: [
    { label: "Dashboard",  href: "/teacher/dashboard" },
    { label: "Students",   href: "/teacher/students" },
    { label: "Attendance", href: "/teacher/attendance" },
    { label: "Homework",   href: "/teacher/homework" },
    { label: "Results",    href: "/teacher/results" },
    { label: "Discipline", href: "/teacher/discipline" },
    { label: "Fees",       href: "/teacher/fees" },
    { label: "Feedback",   href: "/teacher/feedback" },
  ],
  teacher_no_feedback: [
    { label: "Dashboard",  href: "/teacher/dashboard" },
    { label: "Students",   href: "/teacher/students" },
    { label: "Attendance", href: "/teacher/attendance" },
    { label: "Homework",   href: "/teacher/homework" },
    { label: "Results",    href: "/teacher/results" },
    { label: "Discipline", href: "/teacher/discipline" },
    { label: "Fees",       href: "/teacher/fees" },
  ],
  principal: [
    { label: "Dashboard",     href: "/principal/dashboard" },
    { label: "Announcements", href: "/principal/announcements" },
    { label: "Discipline",    href: "/principal/discipline" },
    { label: "Feedback",      href: "/principal/feedback" },
    { label: "Reports",       href: "/principal/reports" },
  ],
  super_admin: [
    { label: "Dashboard", href: "/platform-admin/dashboard" },
    { label: "Schools",   href: "/platform-admin/schools" },
  ],
};

const EXIT_URLS: Record<string, string> = {
  school_admin: "/admin/dashboard",
  super_admin: "/admin/dashboard",
  principal: "/principal/dashboard",
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
      .limit(1)
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
  const userName = profile?.full_name || user.email || "User";

  let brandColor: string | undefined;
  let schoolName = "School ERP";
  const schoolId = profile?.school_id ?? (await getSchoolId());
  if (schoolId) {
    const { data: school } = await supabase
      .from("schools")
      .select("name, primary_color")
      .eq("id", schoolId)
      .single();
    brandColor = school?.primary_color ?? undefined;
    schoolName = school?.name ?? "School ERP";
  }

  // Read active section cookie
  const cookieStore = await cookies();
  const activeSectionId = cookieStore.get("active_section")?.value ?? null;

  // Query available sections based on role
  let sections: SectionOption[] = [];
  if (schoolId) {
    if (realRole === "teacher") {
      const [{ data: teacherProfile }, { data: timetableRows }] = await Promise.all([
        supabase
          .from("teacher_profiles")
          .select("class_teacher_of, section:sections!teacher_profiles_class_teacher_of_fkey(id, name, class:classes(name, order))")
          .eq("profile_id", user.id)
          .maybeSingle(),
        supabase
          .from("timetable")
          .select("section:sections(id, name, class:classes(name, order))")
          .eq("teacher_id", user.id),
      ]);

      const seen = new Set<string>();

      if (teacherProfile?.section) {
        const sec = teacherProfile.section as unknown as { id: string; name: string; class: { name: string; order: number } | null };
        if (sec?.id) {
          seen.add(sec.id);
          sections.push({ id: sec.id, name: sec.name, className: sec.class?.name ?? "", classOrder: sec.class?.order ?? 0 });
        }
      }

      for (const row of timetableRows ?? []) {
        const sec = row.section as unknown as { id: string; name: string; class: { name: string; order: number } | null };
        if (sec?.id && !seen.has(sec.id)) {
          seen.add(sec.id);
          sections.push({ id: sec.id, name: sec.name, className: sec.class?.name ?? "", classOrder: sec.class?.order ?? 0 });
        }
      }
    } else {
      const { data: allSections } = await supabase
        .from("sections")
        .select("id, name, class:classes(name, order)")
        .eq("school_id", schoolId);

      for (const sec of allSections ?? []) {
        const cls = sec.class as unknown as { name: string; order: number } | null;
        sections.push({ id: sec.id, name: sec.name, className: cls?.name ?? "", classOrder: cls?.order ?? 0 });
      }
    }
  }

  // When a non-teacher has an active section they're viewing teacher context
  const inTeacherContext = !!activeSectionId && realRole !== "teacher";

  // If in teacher context, look up the class teacher for the active section
  let sidebarUserName = userName;
  if (inTeacherContext && activeSectionId && schoolId) {
    const { data: ct } = await supabase
      .from("teacher_profiles")
      .select("profile_id, profile:profiles!teacher_profiles_profile_id_fkey(full_name)")
      .eq("class_teacher_of", activeSectionId)
      .maybeSingle();
    const ctProfile = ct?.profile as { full_name: string } | null;
    if (ctProfile?.full_name) sidebarUserName = ctProfile.full_name;
  }

  // Nav items switch to teacher view when a section is active (for non-teacher roles)
  let navItems: { label: string; href: string }[];
  let displayRole: string;

  if (inTeacherContext) {
    navItems = NAV_ITEMS.teacher_no_feedback;
    displayRole = "teacher";
  } else if (realRole === "teacher") {
    navItems = NAV_ITEMS.teacher;
    displayRole = "teacher";
  } else {
    navItems = NAV_ITEMS[realRole] ?? [];
    displayRole = realRole;
  }

  const exitUrl = EXIT_URLS[realRole];
  const sectionSwitcherEl = sections.length > 0 || realRole === "teacher" ? (
    <SectionSwitcher
      sections={sections}
      activeSectionId={activeSectionId}
      userRole={realRole}
      exitUrl={realRole !== "teacher" ? exitUrl : undefined}
    />
  ) : null;

  return (
    <div className="flex h-screen overflow-hidden bg-muted">
      <Sidebar
        title={schoolName}
        items={navItems}
        brandColor={brandColor}
        userName={sidebarUserName}
        userRole={displayRole}
        sectionSwitcher={sectionSwitcherEl}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar
          userName={sidebarUserName}
          userRole={displayRole}
          brandColor={brandColor}
        />
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
