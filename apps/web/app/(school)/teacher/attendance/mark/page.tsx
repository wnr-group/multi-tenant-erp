import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { getActiveSection } from "@/lib/section-context";
import { AttendanceMarkForm } from "./attendance-mark-form";

export default async function AttendanceMarkPage({
  searchParams,
}: {
  searchParams: Promise<{ sectionId?: string; date?: string }>;
}) {
  const { sectionId: paramSectionId, date } = await searchParams;
  const activeSectionId = await getActiveSection();
  const sectionId = paramSectionId ?? activeSectionId;

  if (!sectionId || !date) {
    return (
      <div className="rounded-lg bg-white p-8 text-center shadow-sm">
        <p className="text-gray-400">Missing section or date.</p>
      </div>
    );
  }

  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;
  const { data: { user } } = await supabase.auth.getUser();

  const { data: sectionRow } = await supabase
    .from("sections")
    .select("name, class:classes(name)")
    .eq("id", sectionId)
    .single();

  const { data: studentEnrollments } = await supabase
    .from("student_enrollments")
    .select("student_profile_id, roll_number, student_profile:student_profiles(id, full_name)")
    .eq("section_id", sectionId)
    .eq("is_active", true);

  const { data: existing } = await supabase
    .from("attendance_records")
    .select("student_id, status")
    .eq("section_id", sectionId)
    .eq("date", date);

  const existingMap: Record<string, string> = {};
  for (const rec of existing ?? []) {
    existingMap[rec.student_id] = rec.status ?? "present";
  }

  const studentRows = (studentEnrollments ?? []).map((e) => {
    const sp = e.student_profile as unknown as { id: string; full_name: string | null } | null;
    return {
      id: sp?.id ?? "",
      roll_number: e.roll_number ?? "",
      full_name: sp?.full_name ?? "—",
      status: existingMap[sp?.id ?? ""] ?? "present",
    };
  }).filter((s) => s.id);

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
          schoolId={schoolId}
          markedBy={user!.id}
        />
      </div>
    </div>
  );
}
