import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { SwitchRolePanel } from "@/components/switch-role-panel";
import { Users, GraduationCap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export default async function AdminDashboard() {
  const supabase = await createServerSupabaseClient();
  const schoolId = await getSchoolId();

  const [{ count: teacherCount }, { count: studentCount }] = await Promise.all([
    supabase.from("teacher_profiles").select("*", { count: "exact", head: true }).eq("school_id", schoolId!),
    supabase.from("student_profiles").select("*", { count: "exact", head: true }).eq("school_id", schoolId!),
  ]);

  const stats: { label: string; value: number; icon: LucideIcon; iconBg: string; iconColor: string }[] = [
    { label: "Teachers", value: teacherCount ?? 0, icon: Users, iconBg: "bg-indigo-50", iconColor: "text-indigo-600" },
    { label: "Students", value: studentCount ?? 0, icon: GraduationCap, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-foreground">School Overview</h1>
      <div className="grid grid-cols-2 gap-4 mb-6">
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
      <SwitchRolePanel roles={["principal", "teacher"]} />
    </div>
  );
}
