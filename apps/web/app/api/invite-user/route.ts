import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!roleRow || !["super_admin", "school_admin"].includes(roleRow.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { email, fullName, schoolId, role, extraInserts } = await request.json() as {
    email: string;
    fullName: string;
    schoolId: string;
    role: string;
    extraInserts?: { table: string; data: Record<string, unknown> }[];
  };

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Look up the school's domain so the invite redirects to the right URL
  const { data: school } = await adminClient
    .from("schools")
    .select("domain, name")
    .eq("id", schoolId)
    .single();

  // Build redirect URL — use the school's domain so the invite lands on the correct school portal
  const host = request.headers.get("host") ?? "";
  const port = host.includes(":") ? `:${host.split(":")[1]}` : "";
  const protocol = host.includes("localhost") || host.includes("lvh.me") ? "http" : "https";
  const redirectTo = school?.domain
    ? `${protocol}://${school.domain}${port}/invite`
    : undefined;

  const roleLabels: Record<string, string> = {
    school_admin: "School Admin",
    principal: "Principal",
    teacher: "Teacher",
    student: "Student",
    parent: "Parent",
  };

  const { data: inviteData, error: inviteError } =
    await adminClient.auth.admin.inviteUserByEmail(email, {
      data: {
        full_name: fullName,
        invited_role: roleLabels[role] ?? role,
        school_name: school?.name ?? "School",
      },
      redirectTo,
    });

  if (inviteError || !inviteData.user) {
    return NextResponse.json(
      { error: inviteError?.message ?? "Failed to invite user" },
      { status: 400 }
    );
  }

  const userId = inviteData.user.id;

  await adminClient.from("user_roles").insert({
    user_id: userId,
    school_id: schoolId,
    role,
  });

  await adminClient
    .from("profiles")
    .update({ school_id: schoolId, full_name: fullName })
    .eq("id", userId);

  if (extraInserts) {
    for (const { table, data } of extraInserts) {
      await adminClient.from(table).insert({ ...data, profile_id: userId });
    }
  }

  return NextResponse.json({ userId });
}
