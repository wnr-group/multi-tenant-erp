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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (!roleRow || !["school_admin", "super_admin"].includes(roleRow.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const svc = createServiceSupabaseClient();
  let created = 0;
  const failed: string[] = [];

  for (const s of students) {
    const uid = crypto.randomUUID();
    const { data: authUser, error: authError } = await svc.auth.admin.createUser({
      email: `student-${uid}@noreply.internal`,
      user_metadata: { full_name: s.fullName },
    });

    if (authError || !authUser.user) { failed.push(s.fullName); continue; }

    const userId = authUser.user.id;

    const { error: profileErr } = await svc.from("profiles").update({
      full_name: s.fullName,
      school_id: schoolId,
    }).eq("id", userId);

    if (profileErr) {
      failed.push(s.fullName);
      await svc.auth.admin.deleteUser(userId);
      continue;
    }

    const { data: sp, error: spErr } = await svc.from("student_profiles").insert({
      profile_id: userId,
      school_id: schoolId,
      admission_number: `ADM-${uid.slice(0, 8).toUpperCase()}`,
    }).select("id").single();

    if (spErr || !sp) {
      failed.push(s.fullName);
      await svc.auth.admin.deleteUser(userId);
      continue;
    }

    const { error: enrollErr } = await svc.from("student_enrollments").insert({
      student_profile_id: sp.id,
      academic_year_id: s.academicYearId,
      school_id: schoolId,
      class_id: s.classId,
      section_id: s.sectionId,
      is_active: true,
    });

    if (enrollErr) {
      failed.push(s.fullName);
      await svc.auth.admin.deleteUser(userId);
      continue;
    }

    created++;
  }

  return NextResponse.json({ created, failed: failed.length > 0 ? failed : undefined });
}
