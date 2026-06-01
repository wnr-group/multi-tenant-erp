"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TeacherRow {
  fullName: string;
  phone: string;
}

export function StepTeachers({
  schoolId,
  brandColor,
  onComplete,
  onSkip,
}: {
  schoolId: string;
  brandColor: string;
  onComplete: () => void;
  onSkip: () => void;
}) {
  const [rows, setRows] = useState<TeacherRow[]>([{ fullName: "", phone: "" }]);
  const [loading, setLoading] = useState(false);

  function updateRow(index: number, field: keyof TeacherRow, value: string) {
    setRows((prev) => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  }

  function addRow() {
    setRows((prev) => [...prev, { fullName: "", phone: "" }]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    const valid = rows.filter((r) => r.fullName.trim() && r.phone.trim().length === 10);
    const hasPartial = rows.some((r) => r.fullName.trim() || r.phone.trim());
    if (valid.length === 0) {
      if (hasPartial) { toast.error("Each teacher needs a name and a 10-digit phone number"); return; }
      onComplete();
      return;
    }
    setLoading(true);
    const res = await fetch("/api/onboarding/create-teachers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teachers: valid }),
    });
    setLoading(false);
    if (!res.ok) { toast.error("Failed to create teachers"); return; }
    const data = await res.json();
    toast.success(`${data.created} teacher${data.created !== 1 ? "s" : ""} added.`);
    onComplete();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white p-8 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground">Add Teachers</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Teachers will be able to log in with their phone number. Subject and class assignments can be done later.
          </p>
        </div>

        <div className="space-y-3">
          {rows.map((row, i) => (
            <div key={i} className="flex items-center gap-3">
              <Input
                placeholder="Full name"
                value={row.fullName}
                onChange={(e) => updateRow(i, "fullName", e.target.value)}
                className="flex-1"
              />
              <div className="flex w-44 items-center overflow-hidden rounded-lg border border-border focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
                <span className="flex items-center bg-muted px-2 text-sm text-muted-foreground">+91</span>
                <Input
                  type="tel"
                  inputMode="numeric"
                  pattern="\d{10}"
                  maxLength={10}
                  placeholder="9876543210"
                  value={row.phone}
                  onChange={(e) => updateRow(i, "phone", e.target.value.replace(/\D/g, ""))}
                  className="border-0 shadow-none focus-visible:ring-0"
                />
              </div>
              {rows.length > 1 && (
                <button type="button" onClick={() => removeRow(i)} className="rounded p-1 text-muted-foreground hover:bg-muted">
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
          <Plus className="h-3.5 w-3.5" /> Add another teacher
        </button>

        <div className="mt-6">
          <Button onClick={handleSave} disabled={loading} className="w-full" style={{ backgroundColor: brandColor }}>
            {loading ? "Saving…" : "Save & Continue →"}
          </Button>
        </div>
      </div>

      <div className="text-center">
        <button type="button" onClick={onSkip} className="text-sm text-muted-foreground underline hover:text-foreground">
          Skip for now
        </button>
      </div>
    </div>
  );
}
