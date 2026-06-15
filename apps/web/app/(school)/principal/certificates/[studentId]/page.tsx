export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { getAcademicYearId } from "@/lib/academic-year";
import { CertificateView } from "@/app/(school)/admin/certificates/[studentId]/certificate-view";

export default async function PrincipalCertificatePage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;
  const academicYearId = await getAcademicYearId(schoolId);

  const [{ data: student }, { data: school }, { data: enrollment }, { data: academicYear }] = await Promise.all([
    supabase.from("student_profiles").select("id, full_name, admission_number, date_of_birth, gender, parent:profiles!parent_profile_id(full_name)").eq("id", studentId).eq("school_id", schoolId).single(),
    supabase.from("schools").select("name, logo_url, address").eq("id", schoolId).single(),
    supabase.from("student_enrollments").select("roll_number, class:classes(name), section:sections(name)").eq("student_profile_id", studentId).eq("school_id", schoolId).eq("academic_year_id", academicYearId ?? "").eq("is_active", true).maybeSingle(),
    academicYearId ? supabase.from("academic_years").select("name").eq("id", academicYearId).single() : Promise.resolve({ data: null }),
  ]);

  if (!student) notFound();

  const cls = enrollment?.class as unknown as { name: string } | null;
  const sec = enrollment?.section as unknown as { name: string } | null;

  return (
    <CertificateView
      data={{
        schoolName: school?.name ?? "School",
        schoolLogoUrl: school?.logo_url ?? null,
        schoolAddress: school?.address ?? null,
        studentName: (student as any).full_name ?? "—",
        admissionNumber: student.admission_number ?? null,
        className: cls?.name ?? "—",
        sectionName: sec?.name ?? "—",
        parentName: (student as any).parent?.full_name ?? null,
        gender: (student as any).gender ?? null,
        dateOfBirth: (student as any).date_of_birth ?? null,
        academicYearName: academicYear?.name ?? "—",
        studentProfileId: student.id,
        backHref: "/principal/certificates",
      }}
    />
  );
}
