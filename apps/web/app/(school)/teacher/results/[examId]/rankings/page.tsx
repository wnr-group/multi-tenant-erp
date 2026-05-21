import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { getActiveSection } from "@/lib/section-context";
import { NoSectionPrompt } from "../../../no-section-prompt";
import Link from "next/link";

export default async function ExamRankingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ examId: string }>;
  searchParams: Promise<{ sectionId?: string }>;
}) {
  const { examId } = await params;
  const { sectionId: sectionIdParam } = await searchParams;
  const sectionId = sectionIdParam ?? (await getActiveSection());

  if (!sectionId) return <NoSectionPrompt />;

  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  const [{ data: examRow }, { data: resultsData }] = await Promise.all([
    supabase.from("exams").select("name, start_date, end_date").eq("id", examId).single(),
    supabase
      .from("exam_results")
      .select("student_id, marks_obtained, max_marks, grade, subjects(name), student_profiles!student_id(full_name)")
      .eq("exam_id", examId)
      .eq("school_id", schoolId),
  ]);

  // Aggregate per student
  const studentMap: Record<string, {
    name: string;
    totalObtained: number;
    totalMax: number;
    hasFail: boolean;
    subjectCount: number;
    subjects: { subject: string; marks: number; max: number; grade: string }[];
  }> = {};

  for (const r of resultsData ?? []) {
    const rr = r as any;
    const sid = rr.student_id;
    if (!studentMap[sid]) {
      studentMap[sid] = { name: rr.student_profiles?.full_name ?? "—", totalObtained: 0, totalMax: 0, hasFail: false, subjectCount: 0, subjects: [] };
    }
    studentMap[sid].totalObtained += rr.marks_obtained ?? 0;
    studentMap[sid].totalMax += rr.max_marks ?? 100;
    studentMap[sid].subjectCount += 1;
    if (rr.grade === "F") studentMap[sid].hasFail = true;
    studentMap[sid].subjects.push({
      subject: rr.subjects?.name ?? "—",
      marks: rr.marks_obtained ?? 0,
      max: rr.max_marks ?? 100,
      grade: rr.grade ?? "—",
    });
  }

  const subjectCounts = Object.values(studentMap).map((s) => s.subjectCount);
  const maxSubjectCount = subjectCounts.length > 0 ? Math.max(...subjectCounts) : 0;

  // Separate eligible (ranked) from excluded (fail/absent)
  const eligible = Object.entries(studentMap)
    .filter(([, s]) => !s.hasFail && s.subjectCount >= maxSubjectCount)
    .sort(([, a], [, b]) => b.totalObtained - a.totalObtained);

  const excluded = Object.entries(studentMap)
    .filter(([, s]) => s.hasFail || s.subjectCount < maxSubjectCount);

  const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

  // Competition ranking: tied students share rank, next rank skips (standard in Indian exams)
  let rank = 1;
  const ranked = eligible.map(([, s], i) => {
    if (i > 0 && eligible[i - 1][1].totalObtained > s.totalObtained) rank = i + 1;
    return { ...s, rankNum: rank, rank: `${MEDAL[rank] ?? `#${rank}`}` };
  });

  const unranked = excluded.map(([, s]) => ({
    ...s,
    rank: "—",
    rankLabel: s.hasFail ? "Fail" : "Absent",
  }));

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link href={`/teacher/results/${examId}?sectionId=${sectionId}`} className="text-sm text-gray-500 hover:underline">← Back to Marks Entry</Link>
        <h1 className="text-2xl font-bold text-gray-900">
          Rankings — {examRow?.name ?? "Exam"}
        </h1>
      </div>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Rank</th>
              <th className="px-4 py-3 text-left">Student</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-left">Subjects</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {ranked.map((r, i) => (
              <tr key={i} className={r.rankNum <= 3 ? "bg-amber-50" : ""}>
                <td className="px-4 py-3 font-bold text-gray-800">{r.rank}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-800">
                  {r.totalObtained}/{r.totalMax}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {r.subjects.map((s, si) => (
                    <span key={si} className="mr-3">{s.subject}: {s.marks}/{s.max} ({s.grade})</span>
                  ))}
                </td>
              </tr>
            ))}
            {unranked.map((r, i) => (
              <tr key={`u-${i}`} className="bg-gray-50 opacity-70">
                <td className="px-4 py-3">
                  <span className="text-gray-400 font-medium">—</span>
                  <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                    r.rankLabel === "Fail" ? "bg-red-100 text-red-700" : "bg-gray-200 text-gray-600"
                  }`}>{r.rankLabel}</span>
                </td>
                <td className="px-4 py-3 font-medium text-gray-500">{r.name}</td>
                <td className="px-4 py-3 text-right text-gray-400">{r.totalObtained}/{r.totalMax}</td>
                <td className="px-4 py-3 text-gray-400">
                  {r.subjects.map((s, si) => (
                    <span key={si} className={`mr-3 ${s.grade === "F" ? "text-red-400" : ""}`}>
                      {s.subject}: {s.marks}/{s.max} ({s.grade})
                    </span>
                  ))}
                </td>
              </tr>
            ))}
            {ranked.length === 0 && unranked.length === 0 && (
              <tr><td colSpan={4} className="p-8 text-center text-gray-400">No results entered for this exam yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
