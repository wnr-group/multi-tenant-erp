import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { findOrCreateUserByPhone, attachRole } from "@/lib/provisioning/find-or-create-user";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { phone: string; schoolId: string; parentName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { phone, schoolId, parentName } = body;

  // Caller must be school_admin/principal at this school, or super_admin.
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role, school_id")
    .eq("user_id", user.id)
    .eq("is_active", true);
  const allowed = (roles ?? []).some(
    (r) =>
      r.role === "super_admin" ||
      ((r.role === "school_admin" || r.role === "principal") && r.school_id === schoolId),
  );
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const normalized = `+91${(phone ?? "").replace(/\D/g, "").slice(-10)}`;
  if (!/^\+91\d{10}$/.test(normalized)) {
    return NextResponse.json({ error: "Invalid phone number." }, { status: 400 });
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    const { userId } = await findOrCreateUserByPhone(adminClient, normalized, parentName ?? "");
    await attachRole(adminClient, userId, schoolId, "parent");
    return NextResponse.json({ parentProfileId: userId });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to resolve parent" },
      { status: 400 },
    );
  }
}
