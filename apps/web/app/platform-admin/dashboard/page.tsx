import { createServiceSupabaseClient } from "@/lib/supabase/server";

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

  const stats = [
    { label: "Total Schools", value: schoolCount ?? 0 },
    { label: "Platform Admins", value: platformAdminCount ?? 0 },
    { label: "School Users", value: schoolUserCount ?? 0 },
    { label: "Teachers", value: teacherCount ?? 0 },
    { label: "Students", value: studentCount ?? 0 },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Platform Overview</h1>
      <div className="grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
