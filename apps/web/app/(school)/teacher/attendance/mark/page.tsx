import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AttendanceMarkForm } from "./attendance-mark-form";

export default async function AttendanceMarkPage({
  searchParams,
}: {
  searchParams: Promise<{ sectionId?: string; date?: string }>;
}) {
  const { sectionId, date } = await searchParams;

  if (!sectionId || !date) {
    return (
      <div className="rounded-lg bg-white p-8 text-center shadow-sm">
        <p className="text-gray-400">Missing section or date.</p>
      </div>
    );
  }

  const supabase = await createServerSupabaseClient();

  const { data: sectionRow } = await supabase
    .from("sections")
    .select("name, class:classes(name)")
    .eq("id", sectionId)
    .single();

  const { data: students } = await supabase
    .from("student_profiles")
    .select("id, roll_number, profile:profiles(full_name)")
    .eq("section_id", sectionId)
    .order("roll_number");

  const { data: existing } = await supabase
    .from("attendance_records")
    .select("student_id, status")
    .eq("section_id", sectionId)
    .eq("date", date);

  const existingMap: Record<string, string> = {};
  for (const rec of existing ?? []) {
    existingMap[rec.student_id] = rec.status ?? "present";
  }

  const studentRows = (students ?? []).map((s) => {
    const profile = s.profile as unknown as { full_name: string } | null;
    return {
      id: s.id,
      roll_number: s.roll_number ?? "",
      full_name: profile?.full_name ?? "—",
      status: existingMap[s.id] ?? "present",
    };
  });

  const sec = sectionRow as unknown as {
    name: string;
    class: { name: string } | null;
  } | null;

  const sectionLabel = sec
    ? `${sec.class?.name ?? ""} – Section ${sec.name}`
    : sectionId;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Mark Attendance</h1>
      <p className="mb-6 text-sm text-gray-500">
        {sectionLabel} &nbsp;·&nbsp; {date}
      </p>
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <AttendanceMarkForm
          students={studentRows}
          sectionId={sectionId}
          date={date}
        />
      </div>
    </div>
  );
}
