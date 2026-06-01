import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";

interface StudentInput {
  fullName: string;
  classId: string;
  sectionId: string;
  academicYearId: string;
}

export async function POST(request: NextRequest) {
  const { students }: { students: StudentInput[] } = await request.json();
  if (!students?.length) return NextResponse.json({ created: 0 });

  const schoolId = await getSchoolId();
  if (!schoolId) return NextResponse.json({ error: "No school context" }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = createServiceSupabaseClient();
  let created = 0;

  for (const s of students) {
    const { data: authUser, error: authError } = await svc.auth.admin.createUser({
      email: `student-${Date.now()}-${Math.random().toString(36).slice(2)}@noreply.internal`,
      user_metadata: { full_name: s.fullName },
    });

    if (authError || !authUser.user) continue;

    const userId = authUser.user.id;

    await svc
      .from("profiles")
      .update({
        full_name: s.fullName,
        school_id: schoolId,
      })
      .eq("id", userId);

    const { data: sp } = await svc
      .from("student_profiles")
      .insert({
        profile_id: userId,
        school_id: schoolId,
        admission_number: `ADM-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
      })
      .select("id")
      .single();

    if (!sp) continue;

    await svc.from("student_enrollments").insert({
      student_profile_id: sp.id,
      academic_year_id: s.academicYearId,
      school_id: schoolId,
      class_id: s.classId,
      section_id: s.sectionId,
      is_active: true,
    });

    created++;
  }

  return NextResponse.json({ created });
}
