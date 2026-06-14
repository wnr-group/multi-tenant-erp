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

  // 3. Re-validate the caller teaches this section in the active year — either as
  // its homeroom teacher (section_assignments) or via a timetable entry. This mirrors
  // the marking UI, which lets a teacher mark any section they teach (not just homeroom).
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

  let authorized = !!assignment;
  if (!authorized) {
    const { data: tt } = await admin
      .from("timetable")
      .select("id")
      .eq("section_id", rec.section_id)
      .eq("teacher_id", callerId)
      .eq("academic_year_id", yearId)
      .limit(1)
      .maybeSingle();
    authorized = !!tt;
  }

  if (!authorized) {
    return json({ result: "error", reason: "not_authorized" }, 403);
  }

  return await deliver(admin, rec);
}

async function deliver(
  admin: ReturnType<typeof createClient>,
  rec: {
    id: string; school_id: string; student_id: string;
    date: string; status: string; session: string;
  },
): Promise<Response> {
  // Resolve student + parent. attendance.student_id holds a student_profiles.id.
  const { data: sp } = await admin
    .from("student_profiles")
    .select("full_name, parent_profile_id")
    .eq("id", rec.student_id)
    .maybeSingle();
  if (!sp || !sp.parent_profile_id) {
    return json({ result: "error", reason: "no_parent_linked" }, 422);
  }

  const { data: parent } = await admin
    .from("profiles")
    .select("id, push_token")
    .eq("id", sp.parent_profile_id)
    .maybeSingle();
  if (!parent) {
    return json({ result: "error", reason: "no_parent_linked" }, 422);
  }

  const { data: school } = await admin
    .from("schools")
    .select("name")
    .eq("id", rec.school_id)
    .maybeSingle();
  const schoolName = school?.name ?? "School";

  const sessionLabel =
    rec.session === "FN" ? "forenoon" :
    rec.session === "AN" ? "afternoon" : "full day";
  const dateLabel = new Date(rec.date + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric", month: "short",
  });
  const title = schoolName;
  const messageBody =
    `${sp.full_name} was marked absent for the ${sessionLabel} session on ${dateLabel}.`;

  // Always write the in-app notification (survives app reinstall).
  // student_id scopes it to the absent child so a multi-child parent sees it
  // only in that child's context.
  await admin.from("notifications").insert({
    school_id: rec.school_id,
    user_id: parent.id,
    student_id: rec.student_id,
    title,
    body: messageBody,
    type: "attendance_absence",
  });

  let result: SendResult = "recorded_no_app";

  if (parent.push_token) {
    const pushRes = await sendExpoPush(parent.push_token, title, messageBody);
    if (pushRes === "device_not_registered") {
      // Stale token: clear it so the "uninstalled" view stays accurate.
      await admin.from("profiles").update({ push_token: null }).eq("id", parent.id);
      result = "recorded_no_app";
    } else if (pushRes === "ok") {
      result = "sent";
    } else {
      result = "recorded_no_app";
    }
  }

  // Stamp notified_at for both sent and recorded_no_app.
  await admin
    .from("attendance_records")
    .update({ notified_at: new Date().toISOString() })
    .eq("id", rec.id);

  return json({ result });
}

async function sendExpoPush(
  token: string,
  title: string,
  body: string,
): Promise<"ok" | "device_not_registered" | "failed"> {
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: token, title, body, sound: "default" }),
    });
    const data = await res.json();
    const status = data?.data?.status;
    const errType = data?.data?.details?.error;
    if (status === "ok") return "ok";
    if (errType === "DeviceNotRegistered") return "device_not_registered";
    return "failed";
  } catch {
    return "failed";
  }
}
