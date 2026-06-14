import { createServerSupabaseClient } from "@/lib/supabase/server";
import { RosterReview } from "./roster-review";
import { notFound } from "next/navigation";

export default async function HomeworkDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: hw } = await supabase
    .from("homework")
    .select("id, title, due_date, section_id, subject:subjects(name)")
    .eq("id", id)
    .maybeSingle();
  if (!hw) notFound();

  const subject = hw.subject as unknown as { name: string } | null;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-gray-900">{hw.title}</h1>
      <p className="mb-6 text-sm text-gray-500">
        {subject?.name ?? "—"} · due {hw.due_date ? new Date(hw.due_date).toLocaleDateString() : "—"}
      </p>
      <RosterReview homeworkId={hw.id} sectionId={hw.section_id} />
    </div>
  );
}
