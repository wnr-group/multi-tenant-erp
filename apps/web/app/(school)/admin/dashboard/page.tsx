import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { SwitchRolePanel } from "@/components/switch-role-panel";
import { Users, GraduationCap, BookOpen, IndianRupee } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeeCollectionChart } from "./fee-collection-chart";
import { AttendanceChart } from "./attendance-chart";
import { StudentsByClassChart } from "./students-by-class-chart";
import type { FeeMonth } from "./fee-collection-chart";
import type { AttendanceData } from "./attendance-chart";
import type { ClassCount } from "./students-by-class-chart";

// ---------------------------------------------------------------------------
// Mock data — replace each const with a real Supabase query when wiring backend
// See: docs/superpowers/specs/2026-04-22-admin-dashboard-charts-design.md
// ---------------------------------------------------------------------------

const MOCK_FEE_DATA: FeeMonth[] = [
  { month: "Nov", collected: 320000, due: 380000 },
  { month: "Dec", collected: 290000, due: 350000 },
  { month: "Jan", collected: 350000, due: 400000 },
  { month: "Feb", collected: 310000, due: 360000 },
  { month: "Mar", collected: 370000, due: 420000 },
  { month: "Apr", collected: 384000, due: 430000 },
];

const MOCK_ATTENDANCE: AttendanceData = { present: 84, absent: 16 };

const MOCK_CLASS_DATA: ClassCount[] = [
  { class: "Cls 1", students: 95 },
  { class: "Cls 2", students: 102 },
  { class: "Cls 3", students: 88 },
  { class: "Cls 4", students: 110 },
  { class: "Cls 5", students: 98 },
  { class: "Cls 6", students: 105 },
  { class: "Cls 7", students: 92 },
  { class: "Cls 8", students: 87 },
  { class: "Cls 9", students: 115 },
  { class: "Cls 10", students: 108 },
  { class: "Cls 11", students: 72 },
  { class: "Cls 12", students: 68 },
];

type Announcement = { title: string; date: string; type: "Event" | "Exam" | "Holiday" | "General" };

const MOCK_ANNOUNCEMENTS: Announcement[] = [
  { title: "Annual Sports Day", date: "Apr 18, 2026", type: "Event" },
  { title: "Mid-Term Exam Schedule Released", date: "Apr 10, 2026", type: "Exam" },
  { title: "Summer Vacation Notice", date: "Apr 5, 2026", type: "Holiday" },
  { title: "Parent-Teacher Meeting", date: "Mar 28, 2026", type: "General" },
  { title: "Science Exhibition", date: "Mar 20, 2026", type: "Event" },
];

const BADGE_COLORS: Record<string, string> = {
  Event: "bg-indigo-100 text-indigo-700",
  Exam: "bg-amber-100 text-amber-700",
  Holiday: "bg-emerald-100 text-emerald-700",
  General: "bg-gray-100 text-gray-700",
};

// ---------------------------------------------------------------------------

export default async function AdminDashboard() {
  const supabase = await createServerSupabaseClient();
  const schoolId = await getSchoolId();

  const [{ count: teacherCount }, { count: studentCount }] = await Promise.all([
    supabase.from("teacher_profiles").select("*", { count: "exact", head: true }).eq("school_id", schoolId!),
    supabase.from("student_profiles").select("*", { count: "exact", head: true }).eq("school_id", schoolId!),
  ]);

  // Use real counts for Teachers/Students; mock for Classes and Fees for demo
  const stats: { label: string; value: string | number; icon: LucideIcon; iconBg: string; iconColor: string }[] = [
    { label: "Students", value: studentCount ?? 1240, icon: GraduationCap, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
    { label: "Teachers", value: teacherCount ?? 48, icon: Users, iconBg: "bg-indigo-50", iconColor: "text-indigo-600" },
    { label: "Classes", value: 12, icon: BookOpen, iconBg: "bg-violet-50", iconColor: "text-violet-600" },
    { label: "Fee Collected", value: "₹3,84,000", icon: IndianRupee, iconBg: "bg-amber-50", iconColor: "text-amber-600" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">School Overview</h1>

      {/* Row 1 — Stat Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s, index) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md animate-fade-in-up" style={{ animationDelay: `${index * 60}ms` }}>
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${s.iconBg} ${s.iconColor}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-foreground truncate">{s.value}</p>
                <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Row 2 — Fee Collection + Attendance */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 transition-shadow duration-200 hover:shadow-md animate-fade-in-up" style={{ animationDelay: "240ms" }}>
          <CardHeader>
            <CardTitle>Monthly Fee Collection</CardTitle>
          </CardHeader>
          <CardContent>
            <FeeCollectionChart data={MOCK_FEE_DATA} />
          </CardContent>
        </Card>

        <Card className="transition-shadow duration-200 hover:shadow-md animate-fade-in-up" style={{ animationDelay: "300ms" }}>
          <CardHeader>
            <CardTitle>Attendance</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <AttendanceChart data={MOCK_ATTENDANCE} />
          </CardContent>
        </Card>
      </div>

      {/* Row 3 — Students by Class + Announcements */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="transition-shadow duration-200 hover:shadow-md animate-fade-in-up" style={{ animationDelay: "360ms" }}>
          <CardHeader>
            <CardTitle>Students by Class</CardTitle>
          </CardHeader>
          <CardContent>
            <StudentsByClassChart data={MOCK_CLASS_DATA} />
          </CardContent>
        </Card>

        <Card className="transition-shadow duration-200 hover:shadow-md animate-fade-in-up" style={{ animationDelay: "420ms" }}>
          <CardHeader>
            <CardTitle>Recent Announcements</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {MOCK_ANNOUNCEMENTS.map((a) => (
                <li key={a.title} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.date}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${BADGE_COLORS[a.type] ?? BADGE_COLORS.General}`}>
                    {a.type}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <SwitchRolePanel roles={["principal", "teacher"]} />
    </div>
  );
}
