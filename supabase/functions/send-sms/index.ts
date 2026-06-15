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

  // Gateway validates Authorization as JWT (service_role_key).
  // We do app-level verification via x-hook-secret.
  const incomingSecret = req.headers.get("x-hook-secret");
  if (incomingSecret !== hookSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let phone: string | undefined;
  let otp: string | undefined;
  try {
    const body = await req.json() as { phone?: string; otp?: string };
    phone = body.phone;
    otp = body.otp;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!phone || !otp) {
    return new Response(JSON.stringify({ error: "phone and otp required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const nettyfishUser     = Deno.env.get("NETTYFISH_USER");
  const nettyfishPassword = Deno.env.get("NETTYFISH_PASSWORD");
  const senderId          = Deno.env.get("NETTYFISH_SENDER_ID");
  const channel           = Deno.env.get("NETTYFISH_CHANNEL") ?? "Trans";
  const route             = Deno.env.get("NETTYFISH_ROUTE") ?? "##";

  if (!nettyfishUser || !nettyfishPassword || !senderId) {
    return new Response(JSON.stringify({ error: "SMS provider not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Nettyfish expects phone without leading +
  const number = phone.replace(/^\+/, "");
  const text   = `ConnectMySkool: Your login OTP is ${otp}. Valid for 10 minutes. Do not share this OTP with anyone. Thank You CMYSKL`;

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

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
