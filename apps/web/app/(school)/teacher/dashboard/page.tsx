import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Clock, BookOpen, GraduationCap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionAttendanceChart } from "./section-attendance-chart";
import { HomeworkChart } from "./homework-chart";
import type { SectionAttendance } from "./section-attendance-chart";
import type { HomeworkData } from "./homework-chart";

const DAYS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// ---------------------------------------------------------------------------
// Mock data — replace each const with a real Supabase query when wiring backend
// See: docs/superpowers/specs/2026-04-22-principal-teacher-dashboard-charts-design.md
// ---------------------------------------------------------------------------

const MOCK_SECTION_ATTENDANCE: SectionAttendance[] = [
  { section: "8A", percent: 91 },
  { section: "9B", percent: 84 },
  { section: "10C", percent: 78 },
];

const MOCK_HOMEWORK: HomeworkData = { submitted: 78, pending: 22 };

// ---------------------------------------------------------------------------

export default async function TeacherDashboard() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .single();

  const todayIndex = new Date().getDay() || 7;
  const todayLabel = DAYS[todayIndex];

  const { data: slots } = await supabase
    .from("timetable")
    .select("id, period_number, subject:subjects(name), section:sections(name, class:classes(name))")
    .eq("teacher_id", user!.id)
    .eq("day_of_week", todayIndex)
    .order("period_number");

  const periodsToday = slots?.length ?? 0;

  const stats: { label: string; value: string | number; icon: LucideIcon; iconBg: string; iconColor: string }[] = [
    { label: "Periods Today", value: periodsToday, icon: Clock, iconBg: "bg-indigo-50", iconColor: "text-indigo-600" },
    { label: "My Sections", value: 3, icon: BookOpen, iconBg: "bg-violet-50", iconColor: "text-violet-600" },
    { label: "My Students", value: 127, icon: GraduationCap, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Good morning, {profile?.full_name || "Teacher"}!
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Today is {todayLabel}. Here are your periods for the day.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s, index) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md animate-fade-in-up" style={{ animationDelay: `${index * 60}ms` }}>
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${s.iconBg} ${s.iconColor}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Today's Schedule */}
      {!slots || slots.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">No periods scheduled for today.</p>
        </div>
      ) : (
        <div className="grid gap-3 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
          {slots.map((slot) => {
            const subject = slot.subject as unknown as { name: string } | null;
            const section = slot.section as unknown as { name: string; class: { name: string } | null } | null;
            return (
              <div key={slot.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 font-bold text-sm">
                  P{slot.period_number}
                </div>
                <div>
                  <p className="font-medium text-foreground">{subject?.name ?? "—"}</p>
                  <p className="text-sm text-muted-foreground">
                    {section?.class?.name ?? ""}{section?.name ? ` · Section ${section.name}` : ""}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Row 2 — Section Attendance + Homework */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 transition-shadow duration-200 hover:shadow-md animate-fade-in-up" style={{ animationDelay: "300ms" }}>
          <CardHeader>
            <CardTitle>Section Attendance Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <SectionAttendanceChart data={MOCK_SECTION_ATTENDANCE} />
          </CardContent>
        </Card>
        <Card className="transition-shadow duration-200 hover:shadow-md animate-fade-in-up" style={{ animationDelay: "360ms" }}>
          <CardHeader>
            <CardTitle>Homework</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <HomeworkChart data={MOCK_HOMEWORK} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
