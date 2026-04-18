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

  // Determine cookie domain so it's shared across subdomains
  const host = request.headers.get("host") ?? "";
  const isLvh = host.includes("lvh.me");
  const isBalaji = host.includes("balajierp.com");
  const cookieDomain = isLvh ? ".lvh.me" : isBalaji ? ".balajierp.com" : undefined;

  const response = NextResponse.json({ ok: true });
  response.cookies.set("acting_as", role, {
    httpOnly: false,
    path: "/",
    domain: cookieDomain,
    maxAge: 60 * 60 * 8,
    sameSite: "lax",
  });
  return response;
}
