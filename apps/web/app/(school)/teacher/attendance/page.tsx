import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AttendancePicker } from "./attendance-picker";

export default async function AttendancePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: slots }, { data: teacherProfile }] = await Promise.all([
    supabase
      .from("timetable")
      .select("section_id, section:sections(id, name, class:classes(name))")
      .eq("teacher_id", user!.id),
    supabase
      .from("teacher_profiles")
      .select("class_teacher_of, section:sections(id, name, class:classes(name))")
      .eq("profile_id", user!.id)
      .single(),
  ]);

  // Deduplicate sections — include class-teacher section + timetable sections
  const seen = new Set<string>();
  const sections: { id: string; label: string }[] = [];

  // Add class-teacher section first
  const ctSec = teacherProfile?.section as unknown as {
    id: string; name: string; class: { name: string } | null;
  } | null;
  if (ctSec && !seen.has(ctSec.id)) {
    seen.add(ctSec.id);
    sections.push({ id: ctSec.id, label: `${ctSec.class?.name ?? ""} – Section ${ctSec.name}` });
  }

  for (const slot of slots ?? []) {
    const sec = slot.section as unknown as {
      id: string;
      name: string;
      class: { name: string } | null;
    } | null;
    if (sec && !seen.has(sec.id)) {
      seen.add(sec.id);
      sections.push({
        id: sec.id,
        label: `${sec.class?.name ?? ""} – Section ${sec.name}`,
      });
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Attendance</h1>
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <AttendancePicker sections={sections} />
      </div>
    </div>
  );
}
