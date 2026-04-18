import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { Building2, Shield, Users, GraduationCap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export default async function PlatformDashboard() {
  const supabase = createServiceSupabaseClient();

  const [
    { count: schoolCount },
    { count: platformAdminCount },
    { count: schoolUserCount },
    { count: teacherCount },
    { count: studentCount },
  ] = await Promise.all([
    supabase.from("schools").select("*", { count: "exact", head: true }),
    supabase.from("user_roles").select("*", { count: "exact", head: true }).is("school_id", null),
    supabase.from("user_roles").select("*", { count: "exact", head: true }).not("school_id", "is", null),
    supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "teacher"),
    supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "student"),
  ]);

  const stats: { label: string; value: number; icon: LucideIcon; iconBg: string; iconColor: string }[] = [
    { label: "Total Schools", value: schoolCount ?? 0, icon: Building2, iconBg: "bg-indigo-50", iconColor: "text-indigo-600" },
    { label: "Platform Admins", value: platformAdminCount ?? 0, icon: Shield, iconBg: "bg-violet-50", iconColor: "text-violet-600" },
    { label: "School Users", value: schoolUserCount ?? 0, icon: Users, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
    { label: "Teachers", value: teacherCount ?? 0, icon: Users, iconBg: "bg-amber-50", iconColor: "text-amber-600" },
    { label: "Students", value: studentCount ?? 0, icon: GraduationCap, iconBg: "bg-rose-50", iconColor: "text-rose-600" },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-foreground">Platform Overview</h1>
      <div className="grid grid-cols-3 gap-4">
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
    </div>
  );
}
