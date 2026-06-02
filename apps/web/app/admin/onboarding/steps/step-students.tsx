"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface StudentRow {
  fullName: string;
  parentPhone: string;
  classId: string;
  sectionId: string;
}

interface ClassOption {
  id: string;
  name: string;
}

interface SectionOption {
  id: string;
  name: string;
  classId: string;
}

export function StepStudents({
  schoolId,
  academicYearId,
  brandColor,
  onComplete,
  onSkip,
}: {
  schoolId: string;
  academicYearId: string;
  brandColor: string;
  onComplete: () => void;
  onSkip: () => void;
}) {
  const [rows, setRows] = useState<StudentRow[]>([{ fullName: "", parentPhone: "", classId: "", sectionId: "" }]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!academicYearId) return;
    const supabase = createClient();
    Promise.all([
      supabase.from("classes").select("id, name").eq("school_id", schoolId).order("order"),
      supabase.from("sections").select("id, name, class_id").eq("school_id", schoolId).eq("academic_year_id", academicYearId),
    ]).then(([{ data: cls }, { data: sec }]) => {
      setClasses(cls ?? []);
      const mapped = (sec ?? []).map((s) => ({ id: s.id, name: s.name, classId: s.class_id }));
      setSections(mapped);
      if ((cls ?? []).length === 1) {
        const firstClass = cls![0];
        const firstSection = mapped.find((s) => s.classId === firstClass.id);
        setRows([{ fullName: "", parentPhone: "", classId: firstClass.id, sectionId: firstSection?.id ?? "" }]);
      }
    }).catch(() => toast.error("Failed to load classes. Please refresh."));
  }, [schoolId, academicYearId]);

  function updateRow(index: number, field: keyof StudentRow, value: string) {
    setRows((prev) =>
      prev.map((r, i) => {
        if (i !== index) return r;
        const updated = { ...r, [field]: value };
        if (field === "classId") updated.sectionId = sections.find((s) => s.classId === value)?.id ?? "";
        return updated;
      })
    );
  }

  function addRow() {
    const last = rows[rows.length - 1];
    setRows((prev) => [...prev, { fullName: "", parentPhone: "", classId: last?.classId ?? "", sectionId: last?.sectionId ?? "" }]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    const valid = rows.filter((r) => r.fullName.trim() && r.parentPhone.trim() && r.classId && r.sectionId);
    if (valid.length === 0) {
      toast.error("Add at least one student with name, phone, class, and section");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/onboarding/create-students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ students: valid.map((r) => ({ ...r, academicYearId })) }),
    });
    setLoading(false);
    if (!res.ok) {
      toast.error("Failed to create students");
      return;
    }
    const data = await res.json();
    toast.success(`${data.created} student${data.created !== 1 ? "s" : ""} added.`);
    onComplete();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white p-8 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground">Add Students</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add students manually or skip and use bulk import later from the Students page.
          </p>
        </div>

        {classes.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">
            No classes found. Complete Step 2 first, or skip and add students later.
          </p>
        ) : (
          <>
            <div className="space-y-3">
              {rows.map((row, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Input
                    placeholder="Student full name"
                    value={row.fullName}
                    onChange={(e) => updateRow(i, "fullName", e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Parent phone"
                    type="tel"
                    value={row.parentPhone}
                    onChange={(e) => updateRow(i, "parentPhone", e.target.value)}
                    className="w-36"
                  />
                  <select
                    value={row.classId}
                    onChange={(e) => updateRow(i, "classId", e.target.value)}
                    className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Class</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={row.sectionId}
                    onChange={(e) => updateRow(i, "sectionId", e.target.value)}
                    className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Section</option>
                    {sections
                      .filter((s) => s.classId === row.classId)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                  </select>
                  {rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      className="rounded p-1 text-muted-foreground hover:bg-muted"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addRow}
              className="mt-3 flex items-center gap-1.5 text-sm text-indigo-600 hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> Add another student
            </button>
          </>
        )}

        <div className="mt-6">
          <Button
            onClick={handleSave}
            disabled={loading || classes.length === 0}
            className="w-full"
            style={{ backgroundColor: brandColor }}
          >
            {loading ? "Saving…" : "Finish Setup →"}
          </Button>
        </div>
      </div>

      <div className="text-center">
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-muted-foreground underline hover:text-foreground"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
