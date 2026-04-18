import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { SwitchRolePanel } from "@/components/switch-role-panel";
import { UserCheck, UserX, GraduationCap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

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

  const stats: { label: string; value: number; icon: LucideIcon; iconBg: string; iconColor: string }[] = [
    { label: "Present Today", value: presentCount ?? 0, icon: UserCheck, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
    { label: "Absent Today", value: absentCount ?? 0, icon: UserX, iconBg: "bg-rose-50", iconColor: "text-rose-600" },
    { label: "Total Students", value: studentCount ?? 0, icon: GraduationCap, iconBg: "bg-indigo-50", iconColor: "text-indigo-600" },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-foreground">
        Principal Dashboard
      </h1>
      <div className="mb-6 grid grid-cols-3 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="flex items-center gap-4 rounded-xl border border-border bg-card p-5">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${s.iconBg} ${s.iconColor}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>
      <SwitchRolePanel roles={["teacher"]} />
    </div>
  );
}
