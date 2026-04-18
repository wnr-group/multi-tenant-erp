import { createServiceSupabaseClient } from "@/lib/supabase/server";

export default async function PlatformDashboard() {
  const supabase = createServiceSupabaseClient();

  const [{ count: schoolCount }, { count: userCount }] = await Promise.all([
    supabase.from("schools").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
  ]);

  const stats = [
    { label: "Total Schools", value: schoolCount ?? 0 },
    { label: "Total Users", value: userCount ?? 0 },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Platform Overview</h1>
      <div className="grid grid-cols-2 gap-4">
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
