interface WelcomePayload {
  phone: string;        // "+91XXXXXXXXXX" or "91XXXXXXXXXX"
  parentName: string;
  studentName: string;
  schoolDomain: string; // e.g. "school1"
}

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

  // App-level auth: only our backend (holding the service-role key) may call this.
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey || req.headers.get("Authorization") !== `Bearer ${serviceKey}`) {
    console.error("[welcome-sms] unauthorized call");
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: WelcomePayload;
  try {
    body = await req.json() as WelcomePayload;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { phone, parentName, studentName, schoolDomain } = body;
  if (!phone || !studentName || !schoolDomain) {
    console.error("[welcome-sms] missing fields", { phone: !!phone, studentName: !!studentName, schoolDomain: !!schoolDomain });
    return new Response(JSON.stringify({ error: "phone, studentName and schoolDomain required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const nettyfishUser     = Deno.env.get("NETTYFISH_USER");
  const nettyfishPassword = Deno.env.get("NETTYFISH_PASSWORD");
  const senderId          = Deno.env.get("NETTYFISH_SENDER_ID");
  const channel           = Deno.env.get("NETTYFISH_CHANNEL") ?? "Trans";
  const route             = Deno.env.get("NETTYFISH_ROUTE") ?? "4";

  if (!nettyfishUser || !nettyfishPassword || !senderId) {
    console.error("[welcome-sms] SMS provider not configured");
    return new Response(JSON.stringify({ error: "SMS provider not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const number  = phone.replace(/^\+/, "");
  const appLink = `${schoolDomain}.connectmyskool.com/download-app`;
  const text    = `Dear ${parentName || "Parent"}, Welcome to ConnectMySkool. Your child ${studentName} has been registered on the platform. Download the app and stay connected with school updates: ${appLink} Thank you, CMYSKL`;

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

  console.log(`[welcome-sms] sending to ${number} for student "${studentName}"`);

  let result: { ErrorCode?: string; ErrorMessage?: string; JobId?: string };
  try {
    const res  = await fetch(`http://retailsms.nettyfish.com/api/mt/SendSMS?${params.toString()}`);
    result = await res.json();
  } catch (err) {
    console.error(`[welcome-sms] provider unreachable for ${number}:`, err);
    return new Response(JSON.stringify({ error: `SMS provider unreachable: ${err}` }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (result.ErrorCode !== "000") {
    console.error(`[welcome-sms] FAILED for ${number}: ${result.ErrorCode} ${result.ErrorMessage}`);
    return new Response(
      JSON.stringify({ error: `SMS provider error: ${result.ErrorMessage ?? result.ErrorCode}` }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  console.log(`[welcome-sms] SENT to ${number} (JobId: ${result.JobId})`);
  return new Response(JSON.stringify({ ok: true, jobId: result.JobId }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
