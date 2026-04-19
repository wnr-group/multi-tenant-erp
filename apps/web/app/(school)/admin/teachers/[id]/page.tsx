import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeft, Mail } from "lucide-react";

export default async function TeacherDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: teacher } = await supabase
    .from("teacher_profiles")
    .select("id, created_at, profile:profiles(full_name, email), school_id")
    .eq("id", id)
    .single();

  if (!teacher) notFound();

  const profile = teacher.profile as unknown as { full_name: string; email: string } | null;

  const initials = (profile?.full_name ?? "?")
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-6">
      <Link href="/admin/teachers" className={buttonVariants({ variant: "ghost", size: "sm" }) + " -ml-2"}>
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Back to Teachers
      </Link>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex items-start gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xl font-bold text-indigo-600">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-gray-900">{profile?.full_name ?? "—"}</h1>
            <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
              <Mail className="h-3.5 w-3.5" />
              {profile?.email ?? "—"}
            </div>
            <p className="mt-0.5 text-xs text-gray-400">
              Joined {new Date(teacher.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">Assigned Classes</h2>
          <p className="text-sm italic text-gray-400">Class assignments will appear here once teacher-class linking is implemented.</p>
        </div>
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">Subjects Taught</h2>
          <p className="text-sm italic text-gray-400">Subject assignments will appear here once teacher-class linking is implemented.</p>
        </div>
      </div>
    </div>
  );
}
