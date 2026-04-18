import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { DataTable } from "@/components/data-table";
import { InviteTeacherForm } from "./invite-teacher-form";

export default async function TeachersPage() {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  const { data: teachers } = await supabase
    .from("teacher_profiles")
    .select("id, profile:profiles(full_name, email)")
    .eq("school_id", schoolId);

  const rows = (teachers ?? []).map((t) => {
    const p = (t.profile as unknown as { full_name: string; email: string } | null);
    return {
      id: t.id,
      name: p?.full_name ?? "",
      email: p?.email ?? "",
    };
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Teachers</h1>
      <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
        <InviteTeacherForm schoolId={schoolId} />
      </div>
      <DataTable data={rows} columns={[
        { header: "Name", accessor: "name" },
        { header: "Email", accessor: "email" },
      ]} emptyMessage="No teachers yet." />
    </div>
  );
}
