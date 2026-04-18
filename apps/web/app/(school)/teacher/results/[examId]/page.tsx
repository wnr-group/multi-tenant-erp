import { createServerSupabaseClient } from "@/lib/supabase/server";
import { MarksEntryForm } from "./marks-entry-form";

export default async function ExamMarksPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id")
    .eq("id", user!.id)
    .single();

  const schoolId = profile!.school_id!;

  const { data: exam } = await supabase
    .from("exams")
    .select("id, name")
    .eq("id", examId)
    .single();

  // Get subjects for this school
  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name")
    .eq("school_id", schoolId)
    .order("name");

  // Get all students for this school
  const { data: students } = await supabase
    .from("student_profiles")
    .select("id, roll_number, profile:profiles(full_name), section:sections(name, class:classes(name))")
    .eq("school_id", schoolId)
    .order("roll_number");

  // Existing results for this exam
  const { data: existingResults } = await supabase
    .from("exam_results")
    .select("student_id, subject_id, marks_obtained, max_marks")
    .eq("exam_id", examId);

  const studentRows = (students ?? []).map((s) => {
    const profile = s.profile as unknown as { full_name: string } | null;
    const section = s.section as unknown as {
      name: string;
      class: { name: string } | null;
    } | null;
    return {
      id: s.id,
      roll_number: s.roll_number ?? "",
      full_name: profile?.full_name ?? "—",
      section_label: section
        ? `${section.class?.name ?? ""} – ${section.name}`
        : "—",
    };
  });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Enter Marks</h1>
      <p className="mb-6 text-sm text-gray-500">{exam?.name ?? examId}</p>
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
