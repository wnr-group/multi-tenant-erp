export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { buttonVariants } from "@/components/ui/button";
import { StudentAttendanceTab } from "../../../admin/students/[id]/student-attendance-tab";
import { StudentAcademicsTab } from "../../../admin/students/[id]/student-academics-tab";
import { StudentFeesTab } from "../../../admin/students/[id]/student-fees-tab";

type Tab = "attendance" | "academics" | "fees" | "discipline";

export default async function PrincipalStudentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; month?: string; year?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const activeTab = (sp.tab ?? "attendance") as Tab;
  const now = new Date();
  const month = sp.month !== undefined ? parseInt(sp.month, 10) : now.getMonth();
  const year = sp.year !== undefined ? parseInt(sp.year, 10) : now.getFullYear();

  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  const [{ data: student }, { data: disciplineRecords }] = await Promise.all([
    supabase
      .from("student_profiles")
      .select("id, full_name, roll_number, admission_number, photo_url, parent_phone, class_id, section_id, class:classes(name), section:sections(name)")
      .eq("id", id)
      .single(),
    supabase
      .from("discipline_records")
      .select("id, category, severity, description, created_at")
      .eq("student_id", id)
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false }),
  ]);

  if (!student) notFound();

  const cls = student.class as unknown as { name: string } | null;
  const sec = student.section as unknown as { name: string } | null;

  const tabs: { key: Tab; label: string }[] = [
    { key: "attendance", label: "Attendance" },
    { key: "academics", label: "Academics" },
    { key: "fees", label: "Fees" },
    { key: "discipline", label: "Discipline" },
  ];

  const prevDate = new Date(year, month - 1);
  const nextDate = new Date(year, month + 1);
  const prevHref = `?tab=attendance&month=${prevDate.getMonth()}&year=${prevDate.getFullYear()}`;
  const nextHref = `?tab=attendance&month=${nextDate.getMonth()}&year=${nextDate.getFullYear()}`;
  const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return (
    <div className="space-y-6">
      <Link href="/principal/discipline" className={buttonVariants({ variant: "ghost", size: "sm" }) + " -ml-2"}>
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Back to Discipline
      </Link>

      {/* Student card */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex items-start gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-xl font-bold text-indigo-600">
            {(student.full_name ?? "S").charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-gray-900">{student.full_name ?? "—"}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
              {cls?.name && <span>{cls.name}{sec?.name ? ` · Section ${sec.name}` : ""}</span>}
              {student.roll_number && <span>Roll No: {student.roll_number}</span>}
              {student.admission_number && <span>Adm: {student.admission_number}</span>}
              {student.parent_phone && <span>Phone: {student.parent_phone}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div>
        <div className="flex gap-1 border-b border-border">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={`?tab=${t.key}`}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === t.key
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
        <div className="pt-6">
          {activeTab === "attendance" && (
            <>
              <div className="mb-4 flex items-center gap-3">
                <Link href={prevHref} className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted">←</Link>
                <span className="text-sm font-medium">{MONTH_NAMES[month]} {year}</span>
                <Link href={nextHref} className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted">→</Link>
              </div>
              <StudentAttendanceTab studentId={id} month={month} year={year} />
            </>
          )}
          {activeTab === "academics" && <StudentAcademicsTab studentId={id} />}
          {activeTab === "fees" && <StudentFeesTab studentId={id} studentName={student.full_name ?? "Student"} />}
          {activeTab === "discipline" && (
            <div className="grid gap-3">
              {(disciplineRecords ?? []).length === 0 ? (
                <p className="py-8 text-center text-gray-400">No discipline records for this student.</p>
              ) : (disciplineRecords ?? []).map((r) => (
                <div key={r.id} className="rounded-lg border bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${
                        r.severity === "written" ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-700"
                      }`}>
                        {r.severity}
                      </span>
                      <span className="text-sm font-medium text-gray-600 capitalize">{r.category}</span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-700">{r.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
