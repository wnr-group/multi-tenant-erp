import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    await supabase.from("audit_log").insert({
      performed_by: user.id,
      acting_as_role: "super_admin",
      action: "context_switch.exit",
      entity_type: "session",
      metadata: {},
    });
  }

  const host = request.headers.get("host") ?? "";
  const isLvh = host.includes("lvh.me");
  const isBalaji = host.includes("balajierp.com");
  const cookieDomain = isLvh ? ".lvh.me" : isBalaji ? ".balajierp.com" : undefined;

  const response = NextResponse.json({ ok: true });
  response.cookies.set("acting_as", "", {
    path: "/",
    domain: cookieDomain,
    maxAge: 0,
  });
  return response;
}
