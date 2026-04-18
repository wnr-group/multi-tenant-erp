import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SwitchRolePanel } from "@/components/switch-role-panel";

export default async function AdminDashboard() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id")
    .eq("id", user!.id)
    .single();

  const schoolId = profile?.school_id;

  const [{ count: teacherCount }, { count: studentCount }] = await Promise.all([
    supabase.from("teacher_profiles").select("*", { count: "exact", head: true }).eq("school_id", schoolId!),
    supabase.from("student_profiles").select("*", { count: "exact", head: true }).eq("school_id", schoolId!),
  ]);

  const stats = [
    { label: "Teachers", value: teacherCount ?? 0 },
    { label: "Students", value: studentCount ?? 0 },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">School Overview</h1>
      <div className="grid grid-cols-2 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>
      <SwitchRolePanel roles={["principal", "teacher"]} />
    </div>
  );
}
