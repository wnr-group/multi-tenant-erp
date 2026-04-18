import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AttendancePicker } from "./attendance-picker";

export default async function AttendancePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: slots } = await supabase
    .from("timetable")
    .select("section_id, section:sections(id, name, class:classes(name))")
    .eq("teacher_id", user!.id);

  // Deduplicate sections
  const seen = new Set<string>();
  const sections: { id: string; label: string }[] = [];

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
