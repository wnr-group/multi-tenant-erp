import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getActiveSection } from "@/lib/section-context";
import { NoSectionPrompt } from "../no-section-prompt";
import Link from "next/link";

export default async function AttendancePage() {
  const sectionId = await getActiveSection();

  if (!sectionId) {
    return <NoSectionPrompt />;
  }

  const supabase = await createServerSupabaseClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: sectionRow }, { data: enrollments }, { data: existing }] =
    await Promise.all([
      supabase
        .from("sections")
        .select("name, class:classes(name)")
        .eq("id", sectionId)
        .single(),
      supabase
        .from("student_enrollments")
        .select("student_profile_id, student_profiles(id, full_name)")
        .eq("section_id", sectionId)
        .eq("is_active", true),
      supabase
        .from("attendance_records")
        .select("student_id, status, session")
        .eq("section_id", sectionId)
        .eq("date", today),
    ]);

  const students = (enrollments ?? [])
    .map((e) => {
      const sp = e.student_profiles as unknown as {
        id: string;
        full_name: string;
      } | null;
      return sp ? { id: sp.id, full_name: sp.full_name } : null;
    })
    .filter(Boolean)
    .sort((a, b) => (a!.full_name ?? "").localeCompare(b!.full_name ?? "")) as {
    id: string;
    full_name: string;
  }[];

  const sec = sectionRow as unknown as {
    name: string;
    class: { name: string } | null;
  } | null;

  const sectionLabel = sec
    ? `${sec.class?.name ?? ""} – Section ${sec.name}`
    : sectionId;

  const fullDayRows = (existing ?? []).filter((r) => r.session === "FULL_DAY");
  const fnRows = (existing ?? []).filter((r) => r.session === "FN");
  const anRows = (existing ?? []).filter((r) => r.session === "AN");
  const isMarked = (existing?.length ?? 0) > 0;

  // For the table, prefer full-day; else show forenoon as the representative view.
  const displayRows = fullDayRows.length > 0 ? fullDayRows : fnRows.length > 0 ? fnRows : anRows;
  const existingMap: Record<string, string> = {};
  for (const rec of displayRows) existingMap[rec.student_id] = rec.status ?? "present";

  const markedSummary = fullDayRows.length > 0
    ? "Full day marked"
    : [fnRows.length > 0 ? "Forenoon" : null, anRows.length > 0 ? "Afternoon" : null].filter(Boolean).join(" + ") + " marked";

  const markHref = `/teacher/attendance/mark?sectionId=${sectionId}&date=${today}&session=FULL_DAY`;

  const statusBadge: Record<string, string> = {
    present: "bg-emerald-100 text-emerald-700",
    absent: "bg-rose-100 text-rose-700",
    late: "bg-amber-100 text-amber-700",
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
          <p className="mt-1 text-sm text-gray-500">
            {sectionLabel}&nbsp;&nbsp;·&nbsp;&nbsp;{today}
          </p>
          {isMarked && <p className="mt-1 text-xs font-medium text-emerald-600">{markedSummary}</p>}
        </div>
        <Link
          href={markHref}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          {isMarked ? "Edit Attendance" : "Mark Attendance"}
        </Link>
      </div>

      {/* Content */}
      {!isMarked ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-white p-12 text-center shadow-sm">
          <p className="text-base font-medium text-gray-500">
            Attendance not marked yet for today
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Click &ldquo;Mark Attendance&rdquo; to record today&apos;s attendance.
          </p>
        </div>
      ) : (
        <div className="rounded-lg bg-white shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(students ?? []).map((s) => {
                const status = existingMap[s.id] ?? "present";
                const badge =
                  statusBadge[status] ?? "bg-gray-100 text-gray-600";
                return (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm text-gray-900">
                      {s.full_name ?? "—"}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${badge}`}
                      >
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
