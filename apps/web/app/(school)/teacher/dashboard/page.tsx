import { createServerSupabaseClient } from "@/lib/supabase/server";
import { BookOpen } from "lucide-react";

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
      <h1 className="mb-2 text-2xl font-semibold text-foreground">
        Good morning, {profile?.full_name ?? "Teacher"}!
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Today is {todayLabel}. Here are your periods for the day.
      </p>

      {!slots || slots.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">No periods scheduled for today.</p>
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
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-4"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 font-bold text-sm">
                  P{slot.period_number}
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {subject?.name ?? "—"}
                  </p>
                  <p className="text-sm text-muted-foreground">
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
