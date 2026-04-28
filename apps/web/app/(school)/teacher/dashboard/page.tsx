import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { getActiveSection } from "@/lib/section-context";
import { NoSectionPrompt } from "../no-section-prompt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionAttendanceChart } from "./section-attendance-chart";
import type { SectionAttendance } from "./section-attendance-chart";
import Link from "next/link";

function getLastNSchoolDays(n: number): Date[] {
  const days: Date[] = [];
  let d = new Date();
  d.setDate(d.getDate() - 1);
  while (days.length < n) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) days.push(new Date(d));
    d.setDate(d.getDate() - 1);
  }
  return days.reverse();
}

export default async function TeacherDashboard() {
  const sectionId = await getActiveSection();

  if (!sectionId) {
    return <NoSectionPrompt />;
  }

  const [supabase, schoolId] = await Promise.all([
    createServerSupabaseClient(),
    getSchoolId(),
  ]);

  const today = new Date().toISOString().slice(0, 10);

  // --- Parallel: section info + student count + today attendance + class teacher ---
  const [
    { data: sectionData },
    { count: studentCount },
    { data: todayAttRows },
    { data: classTeacher },
  ] = await Promise.all([
    supabase
      .from("sections")
      .select("name, class:classes(name)")
      .eq("id", sectionId)
      .single(),

    supabase
      .from("student_profiles")
      .select("*", { count: "exact", head: true })
      .eq("section_id", sectionId),

    supabase
      .from("attendance_records")
      .select("status")
      .eq("section_id", sectionId)
      .eq("date", today),

    supabase
      .from("teacher_profiles")
      .select("profile_id, profiles(full_name)")
      .eq("class_teacher_of", sectionId)
      .maybeSingle(),
  ]);

  // Section display name
  const cls = sectionData?.class as unknown as { name: string } | null;
  const className = cls?.name ?? "";
  const sectionName = sectionData?.name ?? "";
  const sectionLabel = `${className} – Section ${sectionName}`;

  // Class teacher name
  const teacherProfiles = classTeacher?.profiles as unknown as { full_name: string } | null;
  const classTeacherName = teacherProfiles?.full_name ?? null;

  // Today's attendance numbers
  const totalToday = todayAttRows?.length ?? 0;
  const presentToday = (todayAttRows ?? []).filter((r) => r.status === "present").length;

  // Mark attendance URL
  const markAttendanceHref = `/teacher/attendance/mark?sectionId=${sectionId}&date=${today}`;

  // --- 7-day attendance trend ---
  const schoolDays = getLastNSchoolDays(7);
  const earliest = schoolDays[0].toISOString().slice(0, 10);

  const { data: trendRows } = await supabase
    .from("attendance_records")
    .select("date, status")
    .eq("section_id", sectionId)
    .gte("date", earliest)
    .lte("date", today);

  const trendData: SectionAttendance[] = schoolDays.map((day) => {
    const dateStr = day.toISOString().slice(0, 10);
    const dayRows = (trendRows ?? []).filter((r) => r.date === dateStr);
    const total = dayRows.length;
    const present = dayRows.filter((r) => r.status === "present").length;
    const percent = total > 0 ? Math.round((present / total) * 100) : 0;
    // Short label: e.g. "Mon 14"
    const label = day.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" });
    return { section: label, percent };
  });

  // --- Upcoming homework (next 5, due_date >= today) ---
  const { data: homeworkRows } = await supabase
    .from("homework")
    .select("id, title, due_date, subject:subjects(name)")
    .eq("section_id", sectionId)
    .gte("due_date", today)
    .order("due_date", { ascending: true })
    .limit(5);

  // --- Recent discipline incidents (last 3) ---
  // Step 1: get student IDs in this section
  const { data: sectionStudents } = await supabase
    .from("student_profiles")
    .select("id, profiles(full_name)")
    .eq("section_id", sectionId);

  const studentIds = (sectionStudents ?? []).map((s) => s.id);

  // Step 2: query discipline records
  let disciplineRows: { category: string; severity: string; created_at: string; student_id: string }[] = [];
  if (studentIds.length > 0 && schoolId) {
    const { data } = await supabase
      .from("discipline_records")
      .select("category, severity, created_at, student_id")
      .eq("school_id", schoolId)
      .in("student_id", studentIds)
      .order("created_at", { ascending: false })
      .limit(3);
    disciplineRows = data ?? [];
  }

  // Build student name lookup
  const studentNameMap: Record<string, string> = {};
  for (const s of sectionStudents ?? []) {
    const p = s.profiles as unknown as { full_name: string } | null;
    studentNameMap[s.id] = p?.full_name ?? "Unknown Student";
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{sectionLabel}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {classTeacherName ? `Class Teacher: ${classTeacherName}` : "No class teacher assigned"}
            {" · "}
            {studentCount ?? 0} students
          </p>
        </div>
      </div>

      {/* Today's Attendance Card */}
      <Card className="transition-shadow duration-200 hover:shadow-md">
        <CardHeader>
          <CardTitle>Today&apos;s Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-6">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold text-foreground">{presentToday}</span>
              <span className="text-2xl text-muted-foreground">/ {totalToday}</span>
            </div>
            {totalToday > 0 && (
              <span className="mb-1 text-sm font-medium text-emerald-600">
                {Math.round((presentToday / totalToday) * 100)}% present
              </span>
            )}
          </div>
          <div className="mt-4">
            <Link
              href={markAttendanceHref}
              className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            >
              {totalToday > 0 ? "Edit Attendance" : "Mark Attendance"}
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* 7-Day Attendance Trend */}
      <Card className="transition-shadow duration-200 hover:shadow-md">
        <CardHeader>
          <CardTitle>7-Day Attendance Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <SectionAttendanceChart data={trendData} />
        </CardContent>
      </Card>

      {/* Upcoming Homework + Recent Discipline */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Upcoming Homework */}
        <Card className="transition-shadow duration-200 hover:shadow-md">
          <CardHeader>
            <CardTitle>Upcoming Homework</CardTitle>
          </CardHeader>
          <CardContent>
            {!homeworkRows || homeworkRows.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No upcoming homework.
              </p>
            ) : (
              <ul className="space-y-3">
                {homeworkRows.map((hw) => {
                  const subject = hw.subject as unknown as { name: string } | null;
                  return (
                    <li key={hw.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{hw.title}</p>
                        <p className="text-xs text-muted-foreground">{subject?.name ?? "—"}</p>
                      </div>
                      <span className="shrink-0 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                        {hw.due_date}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent Discipline Incidents */}
        <Card className="transition-shadow duration-200 hover:shadow-md">
          <CardHeader>
            <CardTitle>Recent Discipline Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            {disciplineRows.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No recent incidents.
              </p>
            ) : (
              <ul className="space-y-3">
                {disciplineRows.map((inc, i) => (
                  <li key={i} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {studentNameMap[inc.student_id] ?? "Unknown Student"}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">{inc.category}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${
                        inc.severity === "high"
                          ? "bg-rose-50 text-rose-700"
                          : inc.severity === "medium"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {inc.severity}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
