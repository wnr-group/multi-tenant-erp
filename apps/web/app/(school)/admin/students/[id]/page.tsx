import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: student } = await supabase
    .from("student_profiles")
    .select("id, roll_number, admission_number, created_at, profile:profiles(full_name, email), class:classes(name), section:sections(name)")
    .eq("id", id)
    .single();

  if (!student) notFound();

  const profile = student.profile as unknown as { full_name: string; email: string } | null;
  const cls = student.class as unknown as { name: string } | null;
  const sec = student.section as unknown as { name: string } | null;

  const initials = (profile?.full_name ?? "?")
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-6">
      <Link href="/admin/students" className={buttonVariants({ variant: "ghost", size: "sm" }) + " -ml-2"}>
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Back to Students
      </Link>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex items-start gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-600">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-gray-900">{profile?.full_name ?? "—"}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
              {cls?.name && <span>{cls.name}{sec?.name ? ` · Section ${sec.name}` : ""}</span>}
              {student.roll_number && <span>Roll No: {student.roll_number}</span>}
              {student.admission_number && <span>Adm: {student.admission_number}</span>}
            </div>
            <p className="mt-0.5 text-xs text-gray-400">
              Admitted {new Date(student.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">Fee Status</h2>
          <p className="text-sm italic text-gray-400">Fee information will appear here once fee payments are implemented (Plan 3.5).</p>
        </div>
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">Attendance</h2>
          <p className="text-sm italic text-gray-400">Attendance summary will appear here once attendance records are linked.</p>
        </div>
      </div>
    </div>
  );
}
