export const dynamic = "force-dynamic";

import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getActiveSection } from "@/lib/section-context";
import { NoSectionPrompt } from "../no-section-prompt";

export default async function TeacherStudentsPage() {
  const sectionId = await getActiveSection();
  if (!sectionId) return <NoSectionPrompt />;

  const supabase = await createServerSupabaseClient();

  const [{ data: sectionRow }, { data: students }] = await Promise.all([
    supabase
      .from("sections")
      .select("name, class:classes(name)")
      .eq("id", sectionId)
      .single(),
    supabase
      .from("student_profiles")
      .select("id, full_name, roll_number, admission_number, photo_url, parent_phone")
      .eq("section_id", sectionId)
      .order("full_name"),
  ]);

  const cls = sectionRow?.class as unknown as { name: string } | null;
  const sectionLabel = cls ? `${cls.name} – Section ${sectionRow?.name}` : sectionRow?.name ?? "";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Students</h1>
        <p className="mt-1 text-sm text-gray-500">{sectionLabel} · {students?.length ?? 0} students</p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/50">
            <tr>
              {["Student", "Roll No.", "Admission No.", "Parent Phone", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(students ?? []).length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No students in this section.</td>
              </tr>
            ) : (students ?? []).map((s) => {
              const initials = (s.full_name ?? "?").split(" ").slice(0, 2).map((w: string) => w[0]?.toUpperCase() ?? "").join("");
              return (
                <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-600 overflow-hidden">
                        {s.photo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={s.photo_url} alt={s.full_name ?? ""} className="h-full w-full object-cover" />
                        ) : initials}
                      </div>
                      <span className="font-medium text-foreground">{s.full_name ?? "—"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{s.roll_number ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.admission_number ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.parent_phone ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Link href={`/teacher/students/${s.id}`} className="text-sm font-medium text-indigo-600 hover:underline">
                      View Profile
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
