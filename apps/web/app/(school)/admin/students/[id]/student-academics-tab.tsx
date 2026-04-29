import { createServerSupabaseClient } from "@/lib/supabase/server";

interface Props {
  studentId: string;
}

export async function StudentAcademicsTab({ studentId }: Props) {
  const supabase = await createServerSupabaseClient();

  const { data: results } = await supabase
    .from("exam_results")
    .select("id, marks_obtained, max_marks, grade, subject:subjects(name), exam:exams(name, start_date)")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  // Group by exam name
  const examMap = new Map<string, { examName: string; date: string; results: typeof results }>();
  for (const r of results ?? []) {
    const exam = r.exam as unknown as { name: string; start_date: string | null } | null;
    const examName = exam?.name ?? "Unknown Exam";
    const date = exam?.start_date ?? "";
    if (!examMap.has(examName)) examMap.set(examName, { examName, date, results: [] });
    examMap.get(examName)!.results!.push(r);
  }

  const groups = Array.from(examMap.values()).sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  if (groups.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">No exam results recorded yet.</p>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map(({ examName, date, results: groupResults }) => {
        const totalObtained = (groupResults ?? []).reduce((s, r) => s + (r.marks_obtained ?? 0), 0);
        const totalMax = (groupResults ?? []).reduce((s, r) => s + (r.max_marks ?? 0), 0);
        const pct = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;

        return (
          <div key={examName} className="rounded-lg border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center justify-between bg-muted/50 px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{examName}</h3>
                {date && <p className="text-xs text-muted-foreground">{new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>}
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${pct >= 60 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                {totalObtained}/{totalMax} · {pct}%
              </span>
            </div>
            <table className="min-w-full divide-y divide-border text-sm">
              <thead>
                <tr className="bg-muted/30">
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Subject</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Marks</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(groupResults ?? []).map((r) => {
                  const subject = r.subject as unknown as { name: string } | null;
                  return (
                    <tr key={r.id} className="hover:bg-muted/20">
                      <td className="px-4 py-2 font-medium text-foreground">{subject?.name ?? "—"}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                        {r.marks_obtained ?? "—"}/{r.max_marks ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-right font-semibold text-foreground">{r.grade ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
