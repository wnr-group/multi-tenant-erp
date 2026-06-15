import { Webhook } from "npm:standardwebhooks@1.0.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  const hookSecret = Deno.env.get("SEND_SMS_HOOK_SECRET");
  if (!hookSecret) {
    return new Response(JSON.stringify({ error: "SEND_SMS_HOOK_SECRET not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);

  // Verify Standard Webhooks signature (sent by Supabase Auth HTTP hook)
  const secret = hookSecret.replace("v1,whsec_", "");
  const wh = new Webhook(secret);
  let user: { phone: string };
  let sms: { otp: string };
  try {
    ({ user, sms } = wh.verify(payload, headers) as { user: { phone: string }; sms: { otp: string } });
  } catch {
    return new Response(JSON.stringify({ error: "Invalid webhook signature" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const nettyfishUser     = Deno.env.get("NETTYFISH_USER");
  const nettyfishPassword = Deno.env.get("NETTYFISH_PASSWORD");
  const senderId          = Deno.env.get("NETTYFISH_SENDER_ID");
  const channel           = Deno.env.get("NETTYFISH_CHANNEL") ?? "Trans";
  const route             = Deno.env.get("NETTYFISH_ROUTE") ?? "4";

  if (!nettyfishUser || !nettyfishPassword || !senderId) {
    return new Response(JSON.stringify({ error: "SMS provider not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Nettyfish expects phone without leading +
  const number = user.phone.replace(/^\+/, "");
  const text   = `ConnectMySkool: Your login OTP is ${sms.otp}. Valid for 10 minutes. Do not share this OTP with anyone. Thank You CMYSKL`;

  const params = new URLSearchParams({
    user:     nettyfishUser,
    password: nettyfishPassword,
    senderid: senderId,
    channel,
    DCS:      "0",
    flashsms: "0",
    number,
    text,
    route,
  });

  let result: { ErrorCode?: string; ErrorMessage?: string };
  try {
    const res = await fetch(
      `http://retailsms.nettyfish.com/api/mt/SendSMS?${params.toString()}`
    );
    result = await res.json();
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `SMS provider unreachable: ${err}` }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  if (result.ErrorCode !== "000") {
    return new Response(
      JSON.stringify({ error: `SMS provider error: ${result.ErrorMessage ?? result.ErrorCode}` }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
