"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, X, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { getGrade } from "@/lib/grades";
import { AddResultsModal } from "./add-results-modal";

interface ResultRow {
  id: string;
  subjectName: string;
  marksObtained: number | null;
  maxMarks: number;
  grade: string | null;
}

interface ExamGroup {
  examName: string;
  date: string;
  results: ResultRow[];
}

interface Props {
  groups: ExamGroup[];
  studentId: string;
  classId: string | null;
  schoolId: string;
}

export function StudentAcademicsClient({ groups, studentId, classId, schoolId }: Props) {
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit(r: ResultRow) {
    setEditingId(r.id);
    setEditValue(r.marksObtained !== null ? String(r.marksObtained) : "");
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue("");
    setError(null);
  }

  async function saveEdit(r: ResultRow) {
    const parsed = parseFloat(editValue);
    if (isNaN(parsed) || parsed < 0 || parsed > r.maxMarks) {
      setError(`Enter a number between 0 and ${r.maxMarks}`);
      return;
    }
    setSaving(true);
    setError(null);
    const pct = (parsed / r.maxMarks) * 100;
    const { grade } = getGrade(pct);
    const supabase = createClient();
    const { error: err } = await supabase
      .from("exam_results")
      .update({ marks_obtained: parsed, grade })
      .eq("id", r.id);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setEditingId(null);
    setEditValue("");
    router.refresh();
  }

  if (groups.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="mb-4 text-sm text-muted-foreground">No exam results recorded yet.</p>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Add Results
        </button>
        {showAddModal && (
          <AddResultsModal studentId={studentId} classId={classId} schoolId={schoolId} onClose={() => setShowAddModal(false)} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Results
        </button>
      </div>

      {showAddModal && (
        <AddResultsModal studentId={studentId} classId={classId} schoolId={schoolId} onClose={() => setShowAddModal(false)} />
      )}

      {groups.map(({ examName, date, results }) => {
        const totalObtained = results.reduce((s, r) => s + (r.marksObtained ?? 0), 0);
        const totalMax = results.reduce((s, r) => s + r.maxMarks, 0);
        const pct = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;

        return (
          <div key={examName} className="rounded-lg border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center justify-between bg-muted/50 px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{examName}</h3>
                {date && (
                  <p className="text-xs text-muted-foreground">
                    {new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                )}
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${pct >= 60 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                {totalObtained}/{totalMax} · {pct}%
              </span>
            </div>
            <table className="min-w-full divide-y divide-border text-sm">
              <thead>
                <tr className="bg-muted/30">
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Subject</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Marks</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Grade</th>
                  <th className="w-16 px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {results.map((r) => {
                  const isEditing = editingId === r.id;
                  return (
                    <tr key={r.id} className="group hover:bg-muted/20">
                      <td className="px-4 py-2 font-medium text-foreground">{r.subjectName}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              min={0}
                              max={r.maxMarks}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-16 rounded border border-input bg-background px-2 py-0.5 text-right text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-ring"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveEdit(r);
                                if (e.key === "Escape") cancelEdit();
                              }}
                            />
                            <span className="text-muted-foreground">/{r.maxMarks}</span>
                          </div>
                        ) : (
                          <span>{r.marksObtained ?? "—"}/{r.maxMarks}</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right font-semibold text-foreground">
                        {isEditing
                          ? (() => {
                              const v = parseFloat(editValue);
                              if (isNaN(v)) return "—";
                              return getGrade((v / r.maxMarks) * 100).grade;
                            })()
                          : (r.grade ?? "—")}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => saveEdit(r)}
                              disabled={saving}
                              className="rounded p-1 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                              title="Save"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              disabled={saving}
                              className="rounded p-1 text-muted-foreground hover:bg-muted"
                              title="Cancel"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(r)}
                            className="rounded p-1 text-muted-foreground opacity-0 hover:bg-muted hover:text-foreground group-hover:opacity-100 transition-opacity"
                            title="Edit marks"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {error && editingId && results.some((r) => r.id === editingId) && (
              <p className="px-4 py-2 text-xs text-red-600">{error}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
