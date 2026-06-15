import { createClient } from "jsr:@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

// Invoked daily by pg_cron (service-role, no user JWT). Finds students whose
// birthday (month + day of date_of_birth) is today and pushes a wish to the
// linked parent's device. Guarded by a shared secret so it can't be triggered
// by anyone.
Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const secret = Deno.env.get("CRON_SECRET");
  if (secret && req.headers.get("x-cron-secret") !== secret) {
    return json({ error: "unauthorized" }, 401);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Today's month/day in IST (birthdays are date-only; evaluate in the school's
  // local calendar so a UTC midnight job doesn't fire on the wrong day).
  const nowIst = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const month = nowIst.getUTCMonth() + 1; // 1-12
  const day = nowIst.getUTCDate();

  // Students with a birthday today and a linked parent. Filtering by month/day
  // is done in SQL via an RPC-free approach: fetch candidates with a DOB, then
  // match in code (student counts per school are small enough; date functions
  // aren't exposed through PostgREST filters).
  const { data: students } = await admin
    .from("student_profiles")
    .select("id, full_name, parent_profile_id, school_id, date_of_birth")
    .not("date_of_birth", "is", null)
    .not("parent_profile_id", "is", null);

  const schoolNameCache: Record<string, string> = {};
  let notified = 0;

  for (const sp of students ?? []) {
    const dob = (sp as any).date_of_birth as string; // "YYYY-MM-DD"
    const [, m, d] = dob.split("-").map((n) => parseInt(n, 10));
    if (m !== month || d !== day) continue;

    const schoolId = (sp as any).school_id as string;
    if (!(schoolId in schoolNameCache)) {
      const { data: school } = await admin
        .from("schools").select("name").eq("id", schoolId).maybeSingle();
      schoolNameCache[schoolId] = school?.name ?? "School";
    }
    const schoolName = schoolNameCache[schoolId];

    const firstName = ((sp as any).full_name ?? "").trim().split(/\s+/)[0] || "your child";
    const title = "🎂 Happy Birthday!";
    const body = `Happy Birthday, ${firstName}! Have a fantastic day from ${schoolName}.`;

    await admin.from("notifications").insert({
      school_id: schoolId,
      user_id: (sp as any).parent_profile_id,
      student_id: (sp as any).id,
      title,
      body,
      type: "birthday",
    });

    const { data: parent } = await admin
      .from("profiles").select("push_token").eq("id", (sp as any).parent_profile_id).maybeSingle();
    if (parent?.push_token) {
      await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: parent.push_token, title, body, sound: "default" }),
      }).catch(() => {});
    }
    notified++;
  }

  return json({ result: "ok", notified });
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });
}
