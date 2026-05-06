import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { FeedbackList } from "../../teacher/feedback/feedback-list";

export default async function PrincipalFeedbackPage() {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  const { data: feedback } = await supabase
    .from("feedback")
    .select(
      "id, subject, message, status, created_at, response, from_user:profiles!feedback_from_user_id_fkey(full_name)"
    )
    .eq("school_id", schoolId)
    .eq("to_role", "principal")
    .order("created_at", { ascending: false });

  const items = (feedback ?? []).map((f) => {
    const fromUser = f.from_user as unknown as { full_name: string } | null;
    return {
      id: f.id,
      subject: f.subject ?? "—",
      message: f.message ?? "—",
      from_name: fromUser?.full_name ?? "—",
      from_role: "parent",
      status: f.status ?? "open",
      response: f.response ?? "",
      created_at: f.created_at ? new Date(f.created_at).toLocaleDateString() : "—",
    };
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Feedback — From Parents</h1>
      <FeedbackList items={items} />
    </div>
  );
}
