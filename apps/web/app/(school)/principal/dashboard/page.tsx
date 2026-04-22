import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { SwitchRolePanel } from "@/components/switch-role-panel";
import { UserCheck, UserX, GraduationCap, ShieldAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WeeklyAttendanceChart } from "./weekly-attendance-chart";
import { ClassAttendanceChart } from "./class-attendance-chart";
import { DisciplineChart } from "./discipline-chart";
import type { DayAttendance } from "./weekly-attendance-chart";
import type { ClassAttendance } from "./class-attendance-chart";
import type { DisciplineMonth } from "./discipline-chart";

// ---------------------------------------------------------------------------
// Mock data — replace each const with a real Supabase query when wiring backend
// See: docs/superpowers/specs/2026-04-22-principal-teacher-dashboard-charts-design.md
// ---------------------------------------------------------------------------

const MOCK_WEEKLY_ATTENDANCE: DayAttendance[] = [
  { day: "Mon", percent: 87 },
  { day: "Tue", percent: 84 },
  { day: "Wed", percent: 89 },
  { day: "Thu", percent: 82 },
  { day: "Fri", percent: 78 },
  { day: "Sat", percent: 91 },
  { day: "Sun", percent: 85 },
];

const MOCK_CLASS_ATTENDANCE: ClassAttendance[] = [
  { class: "Cls 1", percent: 92 },
  { class: "Cls 2", percent: 88 },
  { class: "Cls 3", percent: 79 },
  { class: "Cls 4", percent: 85 },
  { class: "Cls 5", percent: 91 },
  { class: "Cls 6", percent: 76 },
  { class: "Cls 7", percent: 83 },
  { class: "Cls 8", percent: 88 },
  { class: "Cls 9", percent: 94 },
  { class: "Cls 10", percent: 80 },
  { class: "Cls 11", percent: 73 },
  { class: "Cls 12", percent: 69 },
];

const MOCK_DISCIPLINE_DATA: DisciplineMonth[] = [
  { month: "Nov", incidents: 8 },
  { month: "Dec", incidents: 5 },
  { month: "Jan", incidents: 11 },
  { month: "Feb", incidents: 7 },
  { month: "Mar", incidents: 9 },
  { month: "Apr", incidents: 12 },
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

export default async function PrincipalDashboard() {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;
  const today = new Date().toISOString().slice(0, 10);

  const [
    { count: presentCount },
    { count: absentCount },
    { count: studentCount },
  ] = await Promise.all([
    supabase
      .from("attendance_records")
      .select("*", { count: "exact", head: true })
      .eq("school_id", schoolId)
      .eq("date", today)
      .eq("status", "present"),
    supabase
      .from("attendance_records")
      .select("*", { count: "exact", head: true })
      .eq("school_id", schoolId)
      .eq("date", today)
      .eq("status", "absent"),
    supabase
      .from("student_profiles")
      .select("*", { count: "exact", head: true })
      .eq("school_id", schoolId),
  ]);

  const stats: { label: string; value: string | number; icon: LucideIcon; iconBg: string; iconColor: string }[] = [
    { label: "Present Today", value: presentCount ?? 0, icon: UserCheck, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
    { label: "Absent Today", value: absentCount ?? 0, icon: UserX, iconBg: "bg-rose-50", iconColor: "text-rose-600" },
    { label: "Total Students", value: studentCount ?? 0, icon: GraduationCap, iconBg: "bg-indigo-50", iconColor: "text-indigo-600" },
    { label: "Discipline (Apr)", value: 12, icon: ShieldAlert, iconBg: "bg-amber-50", iconColor: "text-amber-600" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Principal Dashboard</h1>

      {/* Row 1 — Stat Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="flex items-center gap-4 rounded-xl border border-border bg-card p-5">
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

      {/* Row 2 — Weekly Attendance Trend + Class Attendance */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Weekly Attendance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <WeeklyAttendanceChart data={MOCK_WEEKLY_ATTENDANCE} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Attendance by Class</CardTitle>
          </CardHeader>
          <CardContent>
            <ClassAttendanceChart data={MOCK_CLASS_ATTENDANCE} />
          </CardContent>
        </Card>
      </div>

      {/* Row 3 — Discipline Incidents + Announcements */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Discipline Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <DisciplineChart data={MOCK_DISCIPLINE_DATA} />
          </CardContent>
        </Card>
        <Card>
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

      <SwitchRolePanel roles={["teacher"]} />
    </div>
  );
}
