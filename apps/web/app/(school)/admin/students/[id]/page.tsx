export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { buttonVariants } from "@/components/ui/button";
import { PhotoUpload } from "./photo-upload";
import { StudentEditForm } from "./student-edit-form";
import { StudentAttendanceTab } from "./student-attendance-tab";
import { StudentAcademicsTab } from "./student-academics-tab";
import { StudentFeesTab } from "./student-fees-tab";

type Tab = "attendance" | "academics" | "fees";

export default async function StudentDetailPage({
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

  const [{ data: student }, { data: classes }] = await Promise.all([
    supabase
      .from("student_profiles")
      .select("id, full_name, email, roll_number, admission_number, photo_url, parent_phone, class_id, section_id, class:classes(name), section:sections(name)")
      .eq("id", id)
      .single(),
    supabase
      .from("classes")
      .select("id, name")
      .eq("school_id", schoolId)
      .order("order"),
  ]);

  if (!student) notFound();

  const cls = student.class as unknown as { name: string } | null;
  const sec = student.section as unknown as { name: string } | null;

  const tabs: { key: Tab; label: string }[] = [
    { key: "attendance", label: "Attendance" },
    { key: "academics", label: "Academics" },
    { key: "fees", label: "Fees" },
  ];

  // Month nav helpers
  const prevDate = new Date(year, month - 1);
  const nextDate = new Date(year, month + 1);
  const prevHref = `?tab=attendance&month=${prevDate.getMonth()}&year=${prevDate.getFullYear()}`;
  const nextHref = `?tab=attendance&month=${nextDate.getMonth()}&year=${nextDate.getFullYear()}`;
  const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return (
    <div className="space-y-6">
      <Link href="/admin/students" className={buttonVariants({ variant: "ghost", size: "sm" }) + " -ml-2"}>
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Back to Students
      </Link>

      {/* Student card */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex items-start gap-5">
          <PhotoUpload
            studentId={student.id}
            studentName={student.full_name ?? "Student"}
            photoUrl={student.photo_url ?? null}
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-gray-900">{student.full_name ?? "—"}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
              {cls?.name && <span>{cls.name}{sec?.name ? ` · Section ${sec.name}` : ""}</span>}
              {student.roll_number && <span>Roll No: {student.roll_number}</span>}
              {student.admission_number && <span>Adm: {student.admission_number}</span>}
              {student.parent_phone && <span>📞 {student.parent_phone}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Edit form */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">Edit Profile</h2>
        <StudentEditForm
          studentId={student.id}
          schoolId={schoolId}
          initialName={student.full_name ?? ""}
          initialEmail={student.email ?? ""}
          initialRoll={student.roll_number ?? ""}
          initialAdmission={student.admission_number ?? ""}
          initialParentPhone={student.parent_phone ?? ""}
          initialClassId={student.class_id ?? ""}
          initialSectionId={student.section_id ?? ""}
          classes={classes ?? []}
        />
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
        </div>
      </div>
    </div>
  );
}
