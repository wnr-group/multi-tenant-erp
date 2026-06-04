import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { getActiveSection } from "@/lib/section-context";
import { NoSectionPrompt } from "../../no-section-prompt";
import { MarksEntryForm } from "./marks-entry-form";

export default async function ExamMarksPage({
  params,
  searchParams,
}: {
  params: Promise<{ examId: string }>;
  searchParams: Promise<{ sectionId?: string }>;
}) {
  const { examId } = await params;
  const { sectionId: sectionIdParam } = await searchParams;

  // Prefer sectionId from query param, fallback to active section header
  const sectionId = sectionIdParam ?? (await getActiveSection());

  if (!sectionId) {
    return <NoSectionPrompt />;
  }

  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  // Look up the section to get its class_id
  const { data: sectionRow } = await supabase
    .from("sections")
    .select("id, name, class_id, class:classes(name)")
    .eq("id", sectionId)
    .single();

  const sec = sectionRow as unknown as {
    id: string;
    name: string;
    class_id: string;
    class: { name: string } | null;
  } | null;

  const sectionLabel = sec
    ? `${sec.class?.name ?? ""} – Section ${sec.name}`
    : sectionId;

  const [{ data: exam }, { data: subjects }, { data: students }, { data: existingResults }] =
    await Promise.all([
      supabase
        .from("exams")
        .select("id, name")
        .eq("id", examId)
        .single(),

      // Subjects scoped to the section's class
      sec?.class_id
        ? supabase
            .from("subjects")
            .select("id, name")
            .eq("school_id", schoolId)
            .eq("class_id", sec.class_id)
            .order("name")
        : supabase
            .from("subjects")
            .select("id, name")
            .eq("school_id", schoolId)
            .order("name"),

      // Students scoped to this section only
      supabase
        .from("student_enrollments")
        .select("student_profile_id, roll_number, student_profile:student_profiles(id, full_name)")
        .eq("section_id", sectionId)
        .eq("is_active", true)
        .order("roll_number"),

      // Existing results for this exam
      supabase
        .from("exam_results")
        .select("student_id, subject_id, marks_obtained, max_marks")
        .eq("exam_id", examId),
    ]);

  const studentRows = (students ?? []).map((s) => {
    const sp = s.student_profile as unknown as { id: string; full_name: string | null } | null;
    return {
      id: sp?.id ?? "",
      roll_number: s.roll_number ?? "",
      full_name: sp?.full_name ?? "—",
      section_label: sectionLabel,
    };
  }).filter((s) => s.id);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Enter Marks</h1>
      <p className="mb-1 text-sm text-gray-500">{exam?.name ?? examId}</p>
      <p className="mb-6 text-xs text-gray-400">{sectionLabel}</p>
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <MarksEntryForm
          examId={examId}
          subjects={(subjects ?? []).map((s) => ({ id: s.id, name: s.name }))}
          students={studentRows}
          existingResults={existingResults ?? []}
        />
      </div>
    </div>
  );
}
