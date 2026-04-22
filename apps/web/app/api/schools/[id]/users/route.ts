import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const roleLabels: Record<string, string> = {
  school_admin: "School Admin",
  principal: "Principal",
  teacher: "Teacher",
  student: "Student",
  parent: "Parent",
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!roleRow || roleRow.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: schoolId } = await params;

  const { email, fullName, role } = (await request.json()) as {
    email: string;
    fullName: string;
    role: string;
  };

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: school } = await adminClient
    .from("schools")
    .select("domain, name")
    .eq("id", schoolId)
    .single();

  const host = request.headers.get("host") ?? "";
  const port = host.includes(":") ? `:${host.split(":")[1]}` : "";
  const protocol =
    host.includes("localhost") || host.includes("lvh.me") ? "http" : "https";
  const redirectTo = school?.domain
    ? `${protocol}://${school.domain}${port}/invite`
    : undefined;

  // Students are data-only records — no auth account
  if (role === "student") {
    const { error: studentError } = await adminClient
      .from("student_profiles")
      .insert({
        school_id: schoolId,
        full_name: fullName,
        email: email || null,
      });
    if (studentError) {
      return NextResponse.json({ error: studentError.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  // All other roles get auth accounts via invite
  // Direct fetch to GoTrue — bypasses Supabase JS client JWT handling
  // which is incompatible with CLI v2's asymmetric signing keys
  const inviteRes = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/invite`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY!,
        "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
      },
      body: JSON.stringify({
        email,
        data: {
          full_name: fullName,
          invited_role: roleLabels[role] ?? role,
          school_name: school?.name ?? "School",
        },
        redirect_to: redirectTo,
      }),
    }
  );

  const inviteResult = await inviteRes.json();

  if (!inviteRes.ok || !inviteResult.id) {
    return NextResponse.json(
      { error: inviteResult.msg ?? inviteResult.error_description ?? "Failed to invite user" },
      { status: 400 }
    );
  }

  const userId = inviteResult.id;

  await adminClient.from("user_roles").insert({
    user_id: userId,
    school_id: schoolId,
    role,
  });

  await adminClient
    .from("profiles")
    .update({ school_id: schoolId, full_name: fullName })
    .eq("id", userId);

  if (role === "teacher") {
    await adminClient
      .from("teacher_profiles")
      .insert({ profile_id: userId, school_id: schoolId });
  }

  return NextResponse.json({ userId });
}
