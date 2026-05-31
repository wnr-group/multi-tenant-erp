import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  const { phone, otp } = await req.json() as { phone: string; otp: string };

  if (!phone || !otp) {
    return new Response(JSON.stringify({ error: "phone and otp required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const authKey = Deno.env.get("MSG91_AUTH_KEY")!;
  const flowId = Deno.env.get("MSG91_FLOW_ID")!;
  const senderId = Deno.env.get("MSG91_SENDER_ID")!;

  // MSG91 expects phone without leading +
  const mobile = phone.replace(/^\+/, "");

  const res = await fetch("https://api.msg91.com/api/v5/flow/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      authkey: authKey,
    },
    body: JSON.stringify({
      flow_id: flowId,
      sender: senderId,
      mobiles: mobile,
      otp,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return new Response(JSON.stringify({ error: text }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
