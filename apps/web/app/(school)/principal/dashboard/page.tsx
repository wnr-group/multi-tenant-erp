import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { UserCheck, UserX, GraduationCap, ShieldAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WeeklyAttendanceChart } from "./weekly-attendance-chart";
import { ClassAttendanceChart } from "./class-attendance-chart";
import { DisciplineChart } from "./discipline-chart";
import type { DayAttendance } from "./weekly-attendance-chart";
import type { ClassAttendance } from "./class-attendance-chart";
import type { DisciplineMonth } from "./discipline-chart";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const BADGE_COLORS: Record<string, string> = {
  Event: "bg-indigo-100 text-indigo-700",
  Exam: "bg-amber-100 text-amber-700",
  Holiday: "bg-emerald-100 text-emerald-700",
  General: "bg-gray-100 text-gray-700",
};

function announcementType(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("exam") || t.includes("test") || t.includes("result")) return "Exam";
  if (t.includes("holiday") || t.includes("vacation") || t.includes("closed")) return "Holiday";
  if (t.includes("sports") || t.includes("exhibition") || t.includes("day") || t.includes("meeting")) return "Event";
  return "General";
}

function getLastNSchoolDays(n: number): Date[] {
  const days: Date[] = [];
  let d = new Date();
  d.setDate(d.getDate() - 1); // start from yesterday
  while (days.length < n) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) days.push(new Date(d));
    d.setDate(d.getDate() - 1);
  }
  return days.reverse();
}

export default async function PrincipalDashboard() {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;
  const today = new Date().toISOString().slice(0, 10);

  const schoolDays = getLastNSchoolDays(7);
  const earliest = schoolDays[0].toISOString().slice(0, 10);
  const monthStart = new Date();
  monthStart.setDate(1);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);

  const [
    { count: presentCount },
    { count: absentCount },
    { count: studentCount },
    { count: disciplineThisMonth },
    { data: attendanceRows },
    { data: classRows },
    { data: disciplineRows },
    { data: announcements },
  ] = await Promise.all([
    supabase.from("attendance_records").select("*", { count: "exact", head: true })
      .eq("school_id", schoolId).eq("date", today).eq("status", "present"),
    supabase.from("attendance_records").select("*", { count: "exact", head: true })
      .eq("school_id", schoolId).eq("date", today).eq("status", "absent"),
    supabase.from("student_profiles").select("*", { count: "exact", head: true })
      .eq("school_id", schoolId),
    supabase.from("discipline_records").select("*", { count: "exact", head: true })
      .eq("school_id", schoolId).gte("created_at", monthStart.toISOString()),
    supabase.from("attendance_records")
      .select("date, status")
      .eq("school_id", schoolId)
      .gte("date", earliest)
      .lte("date", today),
    supabase.from("student_enrollments")
      .select("class_id, classes(name, order)")
      .eq("school_id", schoolId)
      .eq("is_active", true),
    supabase.from("discipline_records")
      .select("created_at")
      .eq("school_id", schoolId)
      .gte("created_at", sixMonthsAgo.toISOString()),
    supabase.from("announcements")
      .select("title, created_at")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  // Weekly attendance trend
  const weeklyAttendance: DayAttendance[] = schoolDays.map((d) => {
    const key = d.toISOString().slice(0, 10);
    const dayRecords = (attendanceRows ?? []).filter((r) => r.date === key);
    if (dayRecords.length === 0) return null;
    const present = dayRecords.filter((r) => r.status === "present").length;
    const pct = Math.round((present / dayRecords.length) * 100);
    return { day: DAY_LABELS[d.getDay()], percent: pct };
  }).filter(Boolean) as DayAttendance[];

  // Attendance by class (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyKey = thirtyDaysAgo.toISOString().slice(0, 10);

  const { data: classAttendanceRows } = await supabase
    .from("attendance_records")
    .select("status, student_enrollments(class_id, classes(name, order))")
    .eq("school_id", schoolId)
    .gte("date", thirtyKey);

  const classAttMap = new Map<string, { name: string; order: number; present: number; total: number }>();
  for (const r of classAttendanceRows ?? []) {
    const sp = r.student_enrollments as unknown as { class_id: string; classes: { name: string; order: number } } | null;
    if (!sp?.classes) continue;
    const key = sp.class_id;
    if (!classAttMap.has(key)) classAttMap.set(key, { name: sp.classes.name, order: sp.classes.order, present: 0, total: 0 });
    const entry = classAttMap.get(key)!;
    entry.total++;
    if (r.status === "present") entry.present++;
  }
  const classAttendance: ClassAttendance[] = Array.from(classAttMap.values())
    .sort((a, b) => a.order - b.order)
    .map((c) => ({
      class: c.name.replace("Class ", "Cls "),
      percent: c.total > 0 ? Math.round((c.present / c.total) * 100) : 0,
    }));

  // Discipline by month (last 6 months)
  const disciplineByMonth = new Map<string, number>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    disciplineByMonth.set(MONTHS[d.getMonth()], 0);
  }
  for (const r of disciplineRows ?? []) {
    const label = MONTHS[new Date(r.created_at).getMonth()];
    if (disciplineByMonth.has(label)) disciplineByMonth.set(label, (disciplineByMonth.get(label) ?? 0) + 1);
  }
  const disciplineData: DisciplineMonth[] = Array.from(disciplineByMonth.entries())
    .map(([month, incidents]) => ({ month, incidents }));

  const formattedAnnouncements = (announcements ?? []).map((a) => ({
    title: a.title,
    date: new Date(a.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    type: announcementType(a.title),
  }));

  const stats: { label: string; value: string | number; icon: LucideIcon; iconBg: string; iconColor: string }[] = [
    { label: "Present Today",    value: presentCount ?? 0,         icon: UserCheck,   iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
    { label: "Absent Today",     value: absentCount ?? 0,          icon: UserX,       iconBg: "bg-rose-50",    iconColor: "text-rose-600"    },
    { label: "Total Students",   value: studentCount ?? 0,         icon: GraduationCap, iconBg: "bg-indigo-50", iconColor: "text-indigo-600" },
    { label: "Discipline (Month)", value: disciplineThisMonth ?? 0, icon: ShieldAlert, iconBg: "bg-amber-50",   iconColor: "text-amber-600"   },
  ];

  // suppress unused variable warning for classRows (used implicitly via classAttendanceRows)
  void classRows;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Principal Dashboard</h1>

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

      {/* Row 2 — Weekly Attendance Trend + Class Attendance */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 transition-shadow duration-200 hover:shadow-md animate-fade-in-up" style={{ animationDelay: "240ms" }}>
          <CardHeader><CardTitle>Weekly Attendance Trend</CardTitle></CardHeader>
          <CardContent><WeeklyAttendanceChart data={weeklyAttendance} /></CardContent>
        </Card>
        <Card className="transition-shadow duration-200 hover:shadow-md animate-fade-in-up" style={{ animationDelay: "300ms" }}>
          <CardHeader><CardTitle>Attendance by Class</CardTitle></CardHeader>
          <CardContent><ClassAttendanceChart data={classAttendance} /></CardContent>
        </Card>
      </div>

      {/* Row 3 — Discipline + Announcements */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="transition-shadow duration-200 hover:shadow-md animate-fade-in-up" style={{ animationDelay: "360ms" }}>
          <CardHeader><CardTitle>Discipline Incidents</CardTitle></CardHeader>
          <CardContent><DisciplineChart data={disciplineData} /></CardContent>
        </Card>
        <Card className="transition-shadow duration-200 hover:shadow-md animate-fade-in-up" style={{ animationDelay: "420ms" }}>
          <CardHeader><CardTitle>Recent Announcements</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {formattedAnnouncements.map((a) => (
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

    </div>
  );
}
