import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { getAcademicYearId } from "@/lib/academic-year";
import { PageHeader } from "@/components/page-header";
import { PromotionFlow } from "../promotion-flow";

export default async function PromotePage() {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;
  const activeYearId = await getAcademicYearId(schoolId);

  const { data: draftYear } = await supabase
    .from("academic_years")
    .select("id, name")
    .eq("school_id", schoolId)
    .eq("status", "draft")
    .maybeSingle();

  if (!draftYear) redirect("/admin/academics");

  const { data: enrollments } = await supabase
    .from("student_enrollments")
    .select("student_profile_id, class_id, section_id, student_profile:student_profiles(full_name), class:classes(name, order), section:sections(name)")
    .eq("school_id", schoolId)
    .eq("academic_year_id", activeYearId ?? "")
    .eq("is_active", true);

  const [{ data: classes }, { data: draftSections }] = await Promise.all([
    supabase.from("classes").select("id, name, order").eq("school_id", schoolId).order("order"),
    supabase.from("sections").select("id, name, class_id").eq("school_id", schoolId).eq("academic_year_id", draftYear.id),
  ]);

  const { data: exams } = await supabase
    .from("exams")
    .select("id")
    .eq("school_id", schoolId)
    .eq("academic_year_id", activeYearId ?? "");

  const { data: results } = await supabase
    .from("exam_results")
    .select("student_id")
    .eq("school_id", schoolId);

  const studentsWithResults = new Set((results ?? []).map((r) => r.student_id));
  const hasExams = (exams ?? []).length > 0;

  const classOrderMap = new Map((classes ?? []).map((c) => [c.id, { id: c.id, name: c.name, order: c.order }]));

  const studentRows = (enrollments ?? []).map((e) => {
    const sp = e.student_profile as unknown as { full_name: string } | null;
    const cls = e.class as unknown as { name: string; order: number } | null;
    const sec = e.section as unknown as { name: string } | null;
    const currentOrder = cls?.order ?? 0;

    const nextClass = Array.from(classOrderMap.values()).find((c) => c.order === currentOrder + 1);
    const suggestedClass = nextClass ?? Array.from(classOrderMap.values()).find((c) => c.order === currentOrder);
    const suggestedSection = (draftSections ?? []).find(
      (s) => s.class_id === suggestedClass?.id && s.name === sec?.name
    ) ?? (draftSections ?? []).find((s) => s.class_id === suggestedClass?.id);

    return {
      studentProfileId: e.student_profile_id,
      name: sp?.full_name ?? "",
      currentClass: cls?.name ?? "",
      currentSection: sec?.name ?? "",
      suggestedClassId: suggestedClass?.id ?? "",
      suggestedClassName: suggestedClass?.name ?? "",
      suggestedSectionId: suggestedSection?.id ?? "",
      suggestedSectionName: suggestedSection?.name ?? "",
      hasPendingResults: hasExams && !studentsWithResults.has(e.student_profile_id),
    };
  });

  return (
    <div>
      <PageHeader
        title={`Promote Students → ${draftYear.name}`}
        description="Review and confirm student class assignments for the new academic year."
      />
      <PromotionFlow
        students={studentRows}
        draftYearId={draftYear.id}
        classes={(classes ?? []).map((c) => ({ id: c.id, name: c.name }))}
        sections={(draftSections ?? []).map((s) => ({ id: s.id, name: s.name, classId: s.class_id }))}
      />
    </div>
  );
}
