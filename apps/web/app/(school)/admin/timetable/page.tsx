import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { DataTable } from "@/components/data-table";
import { AddTimetableForm } from "./add-timetable-form";

const DAY_LABELS: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

export default async function TimetablePage() {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  const { data: slots } = await supabase
    .from("timetable")
    .select("id, day_of_week, period_number, subject:subjects(name), section:sections(name, class:classes(name)), teacher:teacher_profiles(profile:profiles(full_name))")
    .eq("school_id", schoolId)
    .order("day_of_week")
    .order("period_number");

  const { data: sections } = await supabase
    .from("sections")
    .select("id, name, class:classes(name)")
    .eq("school_id", schoolId)
    .order("name");

  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name")
    .eq("school_id", schoolId)
    .order("name");

  const { data: teachers } = await supabase
    .from("teacher_profiles")
    .select("id, profile:profiles(full_name)")
    .eq("school_id", schoolId);

  const rows = (slots ?? []).map((s) => {
    const subject = (s.subject as unknown as { name: string } | null);
    const section = (s.section as unknown as { name: string; class: { name: string } | null } | null);
    const teacher = (s.teacher as unknown as { profile: { full_name: string } | null } | null);
    return {
      id: s.id,
      day: DAY_LABELS[s.day_of_week] ?? String(s.day_of_week),
      period: String(s.period_number),
      section: section ? `${section.class?.name ?? ""} - ${section.name}` : "",
      subject: subject?.name ?? "",
      teacher: teacher?.profile?.full_name ?? "",
    };
  });

  const sectionOptions = (sections ?? []).map((sec) => {
    const cls = (sec.class as unknown as { name: string } | null);
    return { id: sec.id, label: `${cls?.name ?? ""} - ${sec.name}` };
  });

  const teacherOptions = (teachers ?? []).map((t) => {
    const p = (t.profile as unknown as { full_name: string } | null);
    return { id: t.id, label: p?.full_name ?? "" };
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Timetable</h1>
      <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
        <AddTimetableForm
          schoolId={schoolId}
          sections={sectionOptions}
          subjects={(subjects ?? []).map((s) => ({ id: s.id, name: s.name }))}
          teachers={teacherOptions}
        />
      </div>
      <DataTable
        data={rows}
        columns={[
          { header: "Day", accessor: "day" },
          { header: "Period", accessor: "period" },
          { header: "Section", accessor: "section" },
          { header: "Subject", accessor: "subject" },
          { header: "Teacher", accessor: "teacher" },
        ]}
        emptyMessage="No timetable entries yet."
      />
    </div>
  );
}
