import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { StudentAcademicsClient } from "./student-academics-client";

interface Props {
  studentId: string;
}

export async function StudentAcademicsTab({ studentId }: Props) {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  const [{ data: results }, { data: student }] = await Promise.all([
    supabase
      .from("exam_results")
      .select("id, marks_obtained, max_marks, grade, subject:subjects(name), exam:exams(name, start_date)")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false }),
    supabase
      .from("student_profiles")
      .select("class_id")
      .eq("id", studentId)
      .single(),
  ]);

  const examMap = new Map<string, { examName: string; date: string; results: { id: string; subjectName: string; marksObtained: number | null; maxMarks: number; grade: string | null }[] }>();

  for (const r of results ?? []) {
    const exam = r.exam as unknown as { name: string; start_date: string | null } | null;
    const subject = r.subject as unknown as { name: string } | null;
    const examName = exam?.name ?? "Unknown Exam";
    const date = exam?.start_date ?? "";
    if (!examMap.has(examName)) examMap.set(examName, { examName, date, results: [] });
    examMap.get(examName)!.results.push({
      id: r.id,
      subjectName: subject?.name ?? "—",
      marksObtained: r.marks_obtained !== null ? Number(r.marks_obtained) : null,
      maxMarks: Number(r.max_marks ?? 100),
      grade: r.grade ?? null,
    });
  }

  const groups = Array.from(examMap.values()).sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <StudentAcademicsClient
      groups={groups}
      studentId={studentId}
      classId={student?.class_id ?? null}
      schoolId={schoolId}
    />
  );
}
