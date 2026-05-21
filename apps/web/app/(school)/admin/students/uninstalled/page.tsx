export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { UninstalledStudentTable } from "./uninstalled-table";

export default async function UninstalledStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string }>;
}) {
  const { classId } = await searchParams;
  const supabase = await createServerSupabaseClient();
  const schoolId = await getSchoolId();
  if (!schoolId) return notFound();

  const [studentsRes, classesRes] = await Promise.all([
    supabase
      .from("student_profiles")
      .select("id, full_name, parent_phone, roll_number, class:classes(id, name), section:sections(name)")
      .eq("school_id", schoolId)
      .not("parent_phone", "is", null)
      .is("parent_profile_id", null)
      .order("full_name"),
    supabase.from("classes").select("id, name").eq("school_id", schoolId).order("order"),
  ]);

  const allStudents = (studentsRes.data ?? []).map((s: any) => ({
    id: s.id,
    full_name: s.full_name ?? "—",
    parent_phone: s.parent_phone ?? "",
    roll_number: s.roll_number ?? "",
    class_id: s.class?.id ?? "",
    class_name: s.class?.name ?? "—",
    section_name: s.section?.name ?? "—",
  }));

  const filtered = classId
    ? allStudents.filter((s) => s.class_id === classId)
    : allStudents;

  const classes = (classesRes.data ?? []) as { id: string; name: string }[];

  return (
    <div className="space-y-6">
      <Link
        href="/admin/students"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Students
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">App Not Installed</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} student{filtered.length !== 1 ? "s" : ""} whose parents have not set up the app
          </p>
        </div>
      </div>

      {/* Class filter */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/students/uninstalled"
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            !classId ? "bg-indigo-600 text-white" : "border border-border bg-white text-muted-foreground hover:bg-muted"
          }`}
        >
          All Classes
        </Link>
        {classes.map((c) => (
          <Link
            key={c.id}
            href={`/admin/students/uninstalled?classId=${c.id}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              classId === c.id ? "bg-indigo-600 text-white" : "border border-border bg-white text-muted-foreground hover:bg-muted"
            }`}
          >
            {c.name}
          </Link>
        ))}
      </div>

      <UninstalledStudentTable students={filtered} />
    </div>
  );
}
