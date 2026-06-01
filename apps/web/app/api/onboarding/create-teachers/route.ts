import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";

interface TeacherInput {
  fullName: string;
  phone: string;
}

export async function POST(request: NextRequest) {
  const { teachers }: { teachers: TeacherInput[] } = await request.json();
  if (!teachers?.length) return NextResponse.json({ created: 0 });

  const schoolId = await getSchoolId();
  if (!schoolId) return NextResponse.json({ error: "No school context" }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = createServiceSupabaseClient();
  const created: string[] = [];

  for (const t of teachers) {
    const phone = `+91${t.phone.replace(/\D/g, "").slice(-10)}`;

    const { data: authUser, error: authError } = await svc.auth.admin.createUser({
      phone,
      phone_confirm: true,
      user_metadata: { full_name: t.fullName },
    });

    if (authError || !authUser.user) continue;

    const userId = authUser.user.id;

    await svc.from("profiles").update({
      full_name: t.fullName,
      school_id: schoolId,
      phone,
    }).eq("id", userId);

    await svc.from("teacher_profiles").insert({
      profile_id: userId,
      school_id: schoolId,
    });

    await svc.from("user_roles").insert({
      user_id: userId,
      school_id: schoolId,
      role: "teacher",
      is_active: true,
    });

    created.push(userId);
  }

  return NextResponse.json({ created: created.length });
}
