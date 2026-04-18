import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { role } = await request.json() as { role: string };

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await supabase.from("audit_log").insert({
    performed_by: user.id,
    acting_as_role: role,
    action: "context_switch.enter",
    entity_type: "session",
    metadata: { target_role: role },
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set("acting_as", role, {
    httpOnly: false,
    path: "/",
    maxAge: 60 * 60 * 8,
    sameSite: "lax",
  });
  return response;
}
