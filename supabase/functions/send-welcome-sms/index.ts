interface Recipient {
  phone: string;        // "+91XXXXXXXXXX" or "91XXXXXXXXXX"
  parentName: string;
  studentName: string;
}

interface WelcomePayload {
  recipients: Recipient[];
  schoolDomain: string; // e.g. "school1"
}

interface SendResult {
  phone: string;
  ok: boolean;
  jobId?: string;
  error?: string;
}

async function sendOne(
  r: Recipient,
  schoolDomain: string,
  creds: { user: string; password: string; senderId: string; channel: string; route: string },
): Promise<SendResult> {
  const number  = r.phone.replace(/^\+/, "");
  const appLink = `${schoolDomain}.connectmyskool.com/download-app`;
  const text    = `Dear ${r.parentName || "Parent"}, Welcome to ConnectMySkool. Your child ${r.studentName} has been registered on the platform. Download the app and stay connected with school updates: ${appLink} Thank you, CMYSKL`;

  const params = new URLSearchParams({
    user:     creds.user,
    password: creds.password,
    senderid: creds.senderId,
    channel:  creds.channel,
    DCS:      "0",
    flashsms: "0",
    number,
    text,
    route:    creds.route,
  });

  try {
    const res    = await fetch(`http://retailsms.nettyfish.com/api/mt/SendSMS?${params.toString()}`);
    const result = await res.json() as { ErrorCode?: string; ErrorMessage?: string; JobId?: string };
    if (result.ErrorCode !== "000") {
      console.error(`[welcome-sms] FAILED for ${number}: ${result.ErrorCode} ${result.ErrorMessage}`);
      return { phone: number, ok: false, error: result.ErrorMessage ?? result.ErrorCode };
    }
    console.log(`[welcome-sms] SENT to ${number} for "${r.studentName}" (JobId: ${result.JobId})`);
    return { phone: number, ok: true, jobId: result.JobId };
  } catch (err) {
    console.error(`[welcome-sms] provider unreachable for ${number}:`, err);
    return { phone: number, ok: false, error: String(err) };
  }
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

  const { recipients, schoolDomain } = body;
  if (!Array.isArray(recipients) || recipients.length === 0 || !schoolDomain) {
    console.error("[welcome-sms] missing recipients or schoolDomain");
    return new Response(JSON.stringify({ error: "recipients[] and schoolDomain required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const user     = Deno.env.get("NETTYFISH_USER");
  const password = Deno.env.get("NETTYFISH_PASSWORD");
  const senderId = Deno.env.get("NETTYFISH_SENDER_ID");
  const channel  = Deno.env.get("NETTYFISH_CHANNEL") ?? "Trans";
  const route    = Deno.env.get("NETTYFISH_ROUTE") ?? "4";

  if (!user || !password || !senderId) {
    console.error("[welcome-sms] SMS provider not configured");
    return new Response(JSON.stringify({ error: "SMS provider not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const creds = { user, password, senderId, channel, route };
  const valid = recipients.filter((r) => r.phone && r.studentName);

  console.log(`[welcome-sms] batch of ${valid.length} recipient(s) for ${schoolDomain}`);

  const results: SendResult[] = [];
  for (const r of valid) {
    results.push(await sendOne(r, schoolDomain, creds));
  }

  const sent   = results.filter((r) => r.ok).length;
  const failed = results.length - sent;
  console.log(`[welcome-sms] batch done: ${sent} sent, ${failed} failed`);

  return new Response(JSON.stringify({ sent, failed, results }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
