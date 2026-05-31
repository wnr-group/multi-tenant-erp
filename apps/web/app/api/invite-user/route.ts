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

  if (!roleRow) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { phone, fullName, schoolId, role, extraInserts } = await request.json() as {
    phone: string;
    fullName: string;
    schoolId: string;
    role: string;
    extraInserts?: { table: string; data: Record<string, unknown> }[];
  };

  // school_admin must belong to the target school
  if (roleRow.role === "school_admin") {
    const { data: schoolRoleRow } = await supabase
      .from("user_roles")
      .select("school_id")
      .eq("user_id", user.id)
      .eq("role", "school_admin")
      .eq("school_id", schoolId)
      .eq("is_active", true)
      .single();
    if (!schoolRoleRow) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (roleRow.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Restrict what roles each caller can assign
  const callerRole = roleRow.role;
  const allowedRoles: Record<string, string[]> = {
    school_admin: ["teacher", "parent"],
    super_admin: ["school_admin", "principal", "teacher", "parent"],
  };
  if (!allowedRoles[callerRole]?.includes(role)) {
    return NextResponse.json({ error: "Forbidden: cannot assign that role" }, { status: 403 });
  }

  if (!/^\+91\d{10}$/.test(phone)) {
    return NextResponse.json({ error: "Invalid phone number. Must be +91 followed by 10 digits." }, { status: 400 });
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
    phone,
    phone_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createError || !userData.user) {
    return NextResponse.json(
      { error: createError?.message ?? "Failed to create user" },
      { status: 400 }
    );
  }

  const userId = userData.user.id;

  const { error: roleError } = await adminClient.from("user_roles").insert({ user_id: userId, school_id: schoolId, role });
  if (roleError) {
    await adminClient.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: `Failed to assign role: ${roleError.message}` }, { status: 500 });
  }
  const { error: profileError } = await adminClient.from("profiles").update({ school_id: schoolId, full_name: fullName, phone }).eq("id", userId);
  if (profileError) {
    await adminClient.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: `Failed to update profile: ${profileError.message}` }, { status: 500 });
  }

  if (extraInserts) {
    for (const { table, data } of extraInserts) {
      await adminClient.from(table).insert({ ...data, profile_id: userId });
    }
  }

  return NextResponse.json({ userId });
}
