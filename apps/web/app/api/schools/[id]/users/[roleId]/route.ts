import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function requireSuperAdmin() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, error: "Unauthorized", status: 401 };

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!roleRow || roleRow.role !== "super_admin") {
    return { user: null, error: "Forbidden", status: 403 };
  }

  return { user, error: null, status: 200 };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; roleId: string }> }
) {
  const { error, status } = await requireSuperAdmin();
  if (error) return NextResponse.json({ error }, { status });

  const { roleId } = await params;

  const body = (await request.json()) as { role?: string; is_active?: boolean };
  const updates: Record<string, unknown> = {};
  if ("role" in body) updates.role = body.role;
  if ("is_active" in body) updates.is_active = body.is_active;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const adminClient = await getAdminClient();

  const { data, error: dbError } = await adminClient
    .from("user_roles")
    .update(updates)
    .eq("id", roleId)
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; roleId: string }> }
) {
  const { error, status } = await requireSuperAdmin();
  if (error) return NextResponse.json({ error }, { status });

  const { roleId } = await params;

  const adminClient = await getAdminClient();

  const { error: dbError } = await adminClient
    .from("user_roles")
    .delete()
    .eq("id", roleId);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
