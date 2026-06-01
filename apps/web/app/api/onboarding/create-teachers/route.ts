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
  const created: string[] = [];
  const failed: string[] = [];

  for (const t of teachers) {
    const phone = `+91${t.phone.replace(/\D/g, "").slice(-10)}`;

    const { data: authUser, error: authError } = await svc.auth.admin.createUser({
      phone,
      phone_confirm: true,
      user_metadata: { full_name: t.fullName },
    });

    if (authError || !authUser.user) { failed.push(t.fullName); continue; }

    const userId = authUser.user.id;

    const [{ error: profileErr }, { error: tpErr }, { error: roleErr }] = await Promise.all([
      svc.from("profiles").update({ full_name: t.fullName, school_id: schoolId, phone }).eq("id", userId),
      svc.from("teacher_profiles").insert({ profile_id: userId, school_id: schoolId }),
      svc.from("user_roles").insert({ user_id: userId, school_id: schoolId, role: "teacher", is_active: true }),
    ]);

    if (profileErr || tpErr || roleErr) {
      failed.push(t.fullName);
      // Clean up the orphaned auth user
      await svc.auth.admin.deleteUser(userId);
      continue;
    }

    created.push(userId);
  }

  return NextResponse.json({ created: created.length, failed: failed.length > 0 ? failed : undefined });
}
