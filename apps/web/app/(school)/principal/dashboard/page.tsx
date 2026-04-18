import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { SwitchRolePanel } from "@/components/switch-role-panel";

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

  const stats = [
    { label: "Present Today", value: presentCount ?? 0 },
    { label: "Absent Today", value: absentCount ?? 0 },
    { label: "Total Students", value: studentCount ?? 0 },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        Principal Dashboard
      </h1>
      <div className="mb-6 grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>
      <SwitchRolePanel roles={["teacher"]} />
    </div>
  );
}
