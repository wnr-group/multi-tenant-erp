import { supabase, supabaseUrl } from "./supabase";

export type HomeworkRating = "good" | "satisfactory" | "needs_improvement";
export type RosterState = "not_started" | "viewed" | "done";

export interface TeacherHomeworkItem {
  id: string;
  title: string;
  subject: string;
  due_date: string;
  doneCount: number;
  totalCount: number;
}

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
  fileUrl: string; // storage object path
}

// Homework list for a teacher's section, with done/total counts.
export async function loadTeacherHomework(
  sectionId: string,
  teacherId: string,
): Promise<TeacherHomeworkItem[]> {
  const { data: hw } = await supabase
    .from("homework")
    .select("id, title, due_date, subjects(name)")
    .eq("teacher_id", teacherId)
    .eq("section_id", sectionId)
    .order("due_date", { ascending: false })
    .limit(30);

  const ids = (hw ?? []).map((h: any) => h.id);

  // Total enrolled students in the section (denominator).
  const { count: totalCount } = await supabase
    .from("student_enrollments")
    .select("id", { count: "exact", head: true })
    .eq("section_id", sectionId)
    .eq("is_active", true);

  // Done counts per homework.
  const doneByHw: Record<string, number> = {};
  if (ids.length > 0) {
    const { data: statuses } = await supabase
      .from("homework_status")
      .select("homework_id, state")
      .in("homework_id", ids)
      .eq("state", "done");
    for (const s of statuses ?? []) {
      doneByHw[(s as any).homework_id] = (doneByHw[(s as any).homework_id] ?? 0) + 1;
    }
  }

  return (hw ?? []).map((h: any) => ({
    id: h.id,
    title: h.title,
    subject: h.subjects?.name ?? "—",
    due_date: h.due_date,
    doneCount: doneByHw[h.id] ?? 0,
    totalCount: totalCount ?? 0,
  }));
}

// Build the roster: all enrolled students LEFT JOINed with their status.
export async function loadRoster(homeworkId: string, sectionId: string): Promise<RosterRow[]> {
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
  const { data } = await supabase
    .from("homework_attachments")
    .select("id, file_name, file_type, file_url")
    .eq("homework_id", homeworkId);
  return (data ?? []).map((a: any) => ({
    id: a.id, fileName: a.file_name, fileType: a.file_type, fileUrl: a.file_url,
  }));
}

export async function getSignedUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage
    .from("homework-attachments")
    .createSignedUrl(path, 60);
  return data?.signedUrl ?? null;
}

// Teacher review via the column-aware RPC.
export async function reviewStudent(
  homeworkId: string, studentId: string, rating: HomeworkRating, comment: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc("review_homework", {
    p_homework_id: homeworkId,
    p_student_id: studentId,
    p_rating: rating,
    p_comment: comment,
  });
  return { error: error?.message ?? null };
}

// Upload one picked file to the private bucket; insert the attachments row.
export async function uploadAttachment(
  schoolId: string, homeworkId: string,
  file: { uri: string; name: string; mimeType: string; size: number },
): Promise<{ error: string | null }> {
  if (file.size > 2 * 1024 * 1024) return { error: "File exceeds 2MB" };
  const path = `homework/${schoolId}/${homeworkId}/${Date.now()}-${file.name}`;
  // RN: fetch the local file uri into an ArrayBuffer for upload.
  const res = await fetch(file.uri);
  const bytes = await res.arrayBuffer();
  const up = await supabase.storage
    .from("homework-attachments")
    .upload(path, bytes, { contentType: file.mimeType, upsert: false });
  if (up.error) return { error: up.error.message };
  const ins = await supabase.from("homework_attachments").insert({
    homework_id: homeworkId,
    school_id: schoolId,
    file_url: path,
    file_name: file.name,
    file_type: file.mimeType,
    file_size: file.size,
  });
  return { error: ins.error?.message ?? null };
}

// Fire the "assigned" notification fan-out (best-effort; never blocks the user).
export async function notifyAssigned(homeworkId: string): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch(`${supabaseUrl}/functions/v1/send-homework-notification`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ event: "assigned", homeworkId }),
    });
  } catch {
    // best-effort; the homework is already saved
  }
}

// Fire the "reviewed" notification for one student (best-effort).
export async function notifyReviewed(homeworkId: string, studentId: string): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch(`${supabaseUrl}/functions/v1/send-homework-notification`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ event: "reviewed", homeworkId, studentId }),
    });
  } catch {
    // best-effort
  }
}
