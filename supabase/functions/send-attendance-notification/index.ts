import { createClient } from "jsr:@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

type SendResult = "sent" | "recorded_no_app" | "error";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace("Bearer ", "").trim();
  if (!jwt) return json({ error: "unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Identify the caller from their JWT (anon client + the user's token).
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: userData, error: userErr } = await authClient.auth.getUser();
  if (userErr || !userData.user) return json({ error: "unauthorized" }, 401);
  const callerId = userData.user.id;

  let body: { recordId?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const recordId = body.recordId;
  if (!recordId) return json({ error: "missing_record_id" }, 400);

  // Service-role client for trusted reads/writes.
  const admin = createClient(supabaseUrl, serviceKey);

  return await handle(admin, callerId, recordId);
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function handle(
  admin: ReturnType<typeof createClient>,
  callerId: string,
  recordId: string,
): Promise<Response> {
  // 1. Load the attendance row.
  const { data: rec, error: recErr } = await admin
    .from("attendance_records")
    .select("id, school_id, student_id, section_id, date, status, session")
    .eq("id", recordId)
    .maybeSingle();
  if (recErr) return json({ result: "error", reason: "load_failed" }, 500);
  if (!rec) return json({ result: "error", reason: "not_found" }, 404);

  // 2. Only absences are notifiable.
  if (rec.status !== "absent") {
    return json({ result: "error", reason: "not_absent" }, 422);
  }

  // 3. Re-validate the caller is the class teacher for this section/year.
  const { data: yearId } = await admin.rpc("get_active_academic_year", {
    p_school_id: rec.school_id,
  });
  const { data: assignment } = await admin
    .from("section_assignments")
    .select("id")
    .eq("section_id", rec.section_id)
    .eq("class_teacher_id", callerId)
    .eq("academic_year_id", yearId)
    .maybeSingle();
  if (!assignment) {
    return json({ result: "error", reason: "not_authorized" }, 403);
  }

  return await deliver(admin, rec);
}

// Filled in by Task 3.
async function deliver(
  admin: ReturnType<typeof createClient>,
  rec: {
    id: string; school_id: string; student_id: string;
    date: string; status: string; session: string;
  },
): Promise<Response> {
  return json({ result: "error", reason: "not_implemented" }, 501);
}
