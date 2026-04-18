import { createServerSupabaseClient } from "@/lib/supabase/server";

const DAYS = [
  "",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default async function TeacherDashboard() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .single();

  const todayIndex = new Date().getDay() || 7; // 1=Mon...7=Sun
  const todayLabel = DAYS[todayIndex];

  const { data: slots } = await supabase
    .from("timetable")
    .select(
      "id, period_number, subject:subjects(name), section:sections(name, class:classes(name))"
    )
    .eq("teacher_id", user!.id)
    .eq("day_of_week", todayIndex)
    .order("period_number");

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">
        Good morning, {profile?.full_name ?? "Teacher"}!
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        Today is {todayLabel}. Here are your periods for the day.
      </p>

      {!slots || slots.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center shadow-sm">
          <p className="text-gray-400">No periods scheduled for today.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {slots.map((slot) => {
            const subject = slot.subject as unknown as { name: string } | null;
            const section = slot.section as unknown as {
              name: string;
              class: { name: string } | null;
            } | null;
            return (
              <div
                key={slot.id}
                className="flex items-center gap-4 rounded-lg bg-white p-4 shadow-sm"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700 font-bold text-sm">
                  P{slot.period_number}
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {subject?.name ?? "—"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {section?.class?.name ?? ""}{" "}
                    {section?.name ? `· Section ${section.name}` : ""}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
