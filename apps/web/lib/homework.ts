"use client";

import { createClient } from "@/lib/supabase";

export type HomeworkRating = "good" | "satisfactory" | "needs_improvement";
export type RosterState = "not_started" | "viewed" | "done";

export interface RosterRow {
  studentId: string;
  fullName: string;
  state: RosterState;
  rating: HomeworkRating | null;
  teacherComment: string | null;
  reviewedAt: string | null;
}

export interface AttachmentRow {
  id: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
}

export async function loadRoster(homeworkId: string, sectionId: string): Promise<RosterRow[]> {
  const supabase = createClient();
  const { data: enrollments } = await supabase
    .from("student_enrollments")
    .select("student_profiles(id, full_name)")
    .eq("section_id", sectionId)
    .eq("is_active", true);

  const { data: statuses } = await supabase
    .from("homework_status")
    .select("student_id, state, rating, teacher_comment, reviewed_at")
    .eq("homework_id", homeworkId);

  const byStudent: Record<string, any> = {};
  for (const s of statuses ?? []) byStudent[(s as any).student_id] = s;

  return (enrollments ?? [])
    .map((e: any) => e.student_profiles)
    .filter(Boolean)
    .map((sp: any): RosterRow => {
      const s = byStudent[sp.id];
      return {
        studentId: sp.id,
        fullName: sp.full_name,
        state: (s?.state as RosterState) ?? "not_started",
        rating: s?.rating ?? null,
        teacherComment: s?.teacher_comment ?? null,
        reviewedAt: s?.reviewed_at ?? null,
      };
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}

export async function loadAttachments(homeworkId: string): Promise<AttachmentRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("homework_attachments")
    .select("id, file_name, file_type, file_url")
    .eq("homework_id", homeworkId);
  return (data ?? []).map((a: any) => ({
    id: a.id, fileName: a.file_name, fileType: a.file_type, fileUrl: a.file_url,
  }));
}

export async function getSignedUrl(path: string): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.storage.from("homework-attachments").createSignedUrl(path, 60);
  return data?.signedUrl ?? null;
}

export async function reviewStudent(
  homeworkId: string, studentId: string, rating: HomeworkRating, comment: string,
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.rpc("review_homework", {
    p_homework_id: homeworkId, p_student_id: studentId, p_rating: rating, p_comment: comment,
  });
  return { error: error?.message ?? null };
}

export async function uploadAttachment(
  schoolId: string, homeworkId: string, file: File,
): Promise<{ error: string | null }> {
  if (file.size > 2 * 1024 * 1024) return { error: "File exceeds 2MB" };
  const supabase = createClient();
  const path = `homework/${schoolId}/${homeworkId}/${Date.now()}-${file.name}`;
  const up = await supabase.storage.from("homework-attachments").upload(path, file, { contentType: file.type });
  if (up.error) return { error: up.error.message };
  const ins = await supabase.from("homework_attachments").insert({
    homework_id: homeworkId, school_id: schoolId, file_url: path,
    file_name: file.name, file_type: file.type, file_size: file.size,
  });
  return { error: ins.error?.message ?? null };
}

async function callNotify(payload: object): Promise<void> {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-homework-notification`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch { /* best-effort */ }
}

export const notifyAssigned = (homeworkId: string) => callNotify({ event: "assigned", homeworkId });
export const notifyReviewed = (homeworkId: string, studentId: string) =>
  callNotify({ event: "reviewed", homeworkId, studentId });
