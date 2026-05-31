"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { getGrade } from "@/lib/grades";

interface Exam {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
}

interface Props {
  studentId: string;
  classId: string | null;
  schoolId: string;
  onClose: () => void;
}

export function AddResultsModal({ studentId, classId, schoolId, onClose }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [maxMarks, setMaxMarks] = useState("100");
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [examsRes, subjectsRes] = await Promise.all([
        supabase.from("exams").select("id, name").eq("school_id", schoolId).order("start_date", { ascending: false }),
        classId
          ? supabase.from("subjects").select("id, name").eq("school_id", schoolId).eq("class_id", classId).order("name")
          : supabase.from("subjects").select("id, name").eq("school_id", schoolId).order("name"),
      ]);
      setExams(examsRes.data ?? []);
      setSubjects(subjectsRes.data ?? []);
      setLoading(false);
    }
    load();
  }, [schoolId, classId]);

  // Pre-fill existing marks when exam changes
  useEffect(() => {
    if (!selectedExamId) { setMarks({}); return; }
    async function prefill() {
      const { data } = await supabase
        .from("exam_results")
        .select("subject_id, marks_obtained, max_marks")
        .eq("exam_id", selectedExamId)
        .eq("student_id", studentId);
      const m: Record<string, string> = {};
      for (const r of data ?? []) {
        m[r.subject_id] = r.marks_obtained !== null ? String(r.marks_obtained) : "";
        if (r.max_marks) setMaxMarks(String(r.max_marks));
      }
      setMarks(m);
    }
    prefill();
  }, [selectedExamId, studentId]);

  async function handleSave() {
    if (!selectedExamId) { setError("Select an exam first."); return; }
    const filledSubjects = subjects.filter((s) => marks[s.id] !== undefined && marks[s.id] !== "");
    if (filledSubjects.length === 0) { setError("Enter marks for at least one subject."); return; }

    setSaving(true);
    setError(null);
    setSaved(false);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not authenticated."); setSaving(false); return; }

    const records = filledSubjects.map((s) => {
      const obtained = parseFloat(marks[s.id]);
      const max = parseFloat(maxMarks || "100");
      const pct = (obtained / max) * 100;
      const { grade } = getGrade(pct);
      return {
        exam_id: selectedExamId,
        student_id: studentId,
        subject_id: s.id,
        marks_obtained: obtained,
        max_marks: max,
        grade,
        school_id: schoolId,
        teacher_id: user.id,
      };
    });

    const { error: err } = await supabase
      .from("exam_results")
      .upsert(records, { onConflict: "exam_id,student_id,subject_id" });

    setSaving(false);
    if (err) { setError(err.message); return; }
    setSaved(true);
    router.refresh();
    setTimeout(onClose, 800);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Add / Update Results</h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-5 px-6 py-5">
            {/* Exam selector */}
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Exam</label>
                <select
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Select exam</option>
                  {exams.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
              <div className="w-28">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Max Marks</label>
                <input
                  type="number"
                  min={1}
                  value={maxMarks}
                  onChange={(e) => setMaxMarks(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            {/* Subjects */}
            {selectedExamId && (
              <div className="max-h-72 overflow-y-auto divide-y divide-border rounded-lg border">
                {subjects.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">No subjects found for this class.</p>
                ) : (
                  subjects.map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-4 px-4 py-2.5">
                      <span className="text-sm font-medium text-gray-900">{s.name}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={parseFloat(maxMarks || "100")}
                          placeholder={`/ ${maxMarks}`}
                          value={marks[s.id] ?? ""}
                          onChange={(e) => setMarks((prev) => ({ ...prev, [s.id]: e.target.value }))}
                          className="w-20 rounded-lg border border-input bg-background px-2 py-1 text-right text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                        <span className="w-6 text-xs font-semibold text-muted-foreground">
                          {marks[s.id] !== undefined && marks[s.id] !== ""
                            ? getGrade((parseFloat(marks[s.id]) / parseFloat(maxMarks || "100")) * 100).grade
                            : ""}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {error && <p className="text-xs text-red-600">{error}</p>}
            {saved && <p className="text-xs text-emerald-600">Results saved successfully.</p>}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !selectedExamId || loading}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Save Results
          </button>
        </div>
      </div>
    </div>
  );
}
