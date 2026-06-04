import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { getGrade } from "@/lib/grades";
import { ReportCardView } from "./report-card-view";

interface Props {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ examId?: string }>;
}

export default async function ReportCardPage({ params, searchParams }: Props) {
  const { studentId } = await params;
  const { examId } = await searchParams;
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  const [{ data: student }, { data: enrollment }, { data: exam }, { data: results }, { data: school }] = await Promise.all([
    supabase
      .from("student_profiles")
      .select("id, full_name, admission_number, photo_url")
      .eq("id", studentId)
      .single(),
    supabase
      .from("student_enrollments")
      .select("roll_number, class:classes(name), section:sections(name)")
      .eq("student_profile_id", studentId)
      .eq("school_id", schoolId)
      .eq("is_active", true)
      .maybeSingle(),
    examId
      ? supabase.from("exams").select("id, name, start_date, end_date, academic_year:academic_years(name)").eq("id", examId).single()
      : Promise.resolve({ data: null }),
    examId
      ? supabase
          .from("exam_results")
          .select("subject_id, marks_obtained, max_marks, subject:subjects(name)")
          .eq("exam_id", examId)
          .eq("student_id", studentId)
      : Promise.resolve({ data: [] }),
    supabase.from("schools").select("name, primary_color").eq("id", schoolId).single(),
  ]);

  if (!student) {
    return <p className="p-8 text-muted-foreground">Student not found.</p>;
  }

  const { count: totalDays } = await supabase
    .from("attendance_records")
    .select("*", { count: "exact", head: true })
    .eq("school_id", schoolId)
    .eq("student_id", studentId);

  const { count: presentDays } = await supabase
    .from("attendance_records")
    .select("*", { count: "exact", head: true })
    .eq("school_id", schoolId)
    .eq("student_id", studentId)
    .eq("status", "present");

  const attendancePercent = totalDays ? Math.round(((presentDays ?? 0) / totalDays) * 100) : null;

  const subjectResults = (results ?? []).map((r) => {
    const subj = r.subject as unknown as { name: string } | null;
    const obtained = Number(r.marks_obtained ?? 0);
    const max = Number(r.max_marks ?? 100);
    const pct = max > 0 ? (obtained / max) * 100 : 0;
    const gradeInfo = getGrade(pct);
    return {
      subject: subj?.name ?? "—",
      marks_obtained: obtained,
      max_marks: max,
      percentage: Math.round(pct * 10) / 10,
      grade: gradeInfo.grade,
    };
  });

  const totalObtained = subjectResults.reduce((s, r) => s + r.marks_obtained, 0);
  const totalMax = subjectResults.reduce((s, r) => s + r.max_marks, 0);
  const overallPct = totalMax > 0 ? Math.round((totalObtained / totalMax) * 1000) / 10 : 0;
  const overallGrade = getGrade(overallPct);

  const cls = enrollment?.class as unknown as { name: string } | null;
  const sec = enrollment?.section as unknown as { name: string } | null;
  const ay = exam?.academic_year as unknown as { name: string } | null;

  const reportData = {
    schoolName: school?.name ?? "School",
    schoolColor: school?.primary_color ?? "#4f46e5",
    studentName: student.full_name ?? "—",
    rollNumber: enrollment?.roll_number ?? "—",
    admissionNumber: student.admission_number ?? "—",
    className: cls?.name ?? "—",
    section: sec?.name ?? "—",
    examName: exam?.name ?? "—",
    academicYear: ay?.name ?? "—",
    subjects: subjectResults,
    totalObtained,
    totalMax,
    overallPercentage: overallPct,
    overallGrade: overallGrade.grade,
    overallLabel: overallGrade.label,
    attendancePercent,
  };

  return <ReportCardView data={reportData} />;
}
