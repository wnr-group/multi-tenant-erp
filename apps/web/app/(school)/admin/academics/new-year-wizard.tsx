"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Section {
  id: string;
  name: string;
  class_name: string;
  class_id: string;
}

interface FeeStructure {
  id: string;
  fee_type: string;
  amount: number;
  class_id: string;
  class_name: string;
}

interface Props {
  schoolId: string;
  activeYearId: string | null;
  onClose: () => void;
}

export function NewYearWizard({ schoolId, activeYearId, onClose }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [newYearId, setNewYearId] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();
  const [yearName, setYearName] = useState(`${currentYear}-${String(currentYear + 1).slice(2)}`);
  const [startDate, setStartDate] = useState(`${currentYear}-04-01`);
  const [endDate, setEndDate] = useState(`${currentYear + 1}-03-31`);

  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSectionIds, setSelectedSectionIds] = useState<Set<string>>(new Set());

  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [feeAmounts, setFeeAmounts] = useState<Record<string, number>>({});

  async function handleCreateYear() {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("academic_years")
      .insert({ school_id: schoolId, name: yearName, start_date: startDate, end_date: endDate, status: "draft" })
      .select("id")
      .single();
    if (error || !data) { toast.error(error?.message ?? "Failed to create year"); setLoading(false); return; }
    setNewYearId(data.id);

    if (activeYearId) {
      const { data: prevSections } = await supabase
        .from("sections")
        .select("id, name, class_id, class:classes(name)")
        .eq("school_id", schoolId)
        .eq("academic_year_id", activeYearId);
      const mapped = (prevSections ?? []).map((s) => ({
        id: s.id,
        name: s.name,
        class_id: s.class_id,
        class_name: (s.class as unknown as { name: string } | null)?.name ?? "",
      }));
      setSections(mapped);
      setSelectedSectionIds(new Set(mapped.map((s) => s.id)));
    }
    setLoading(false);
    setStep(2);
  }

  async function handleCopySections() {
    if (!newYearId) return;
    setLoading(true);
    const supabase = createClient();
    const toCreate = sections.filter((s) => selectedSectionIds.has(s.id));
    if (toCreate.length > 0) {
      const { error } = await supabase.from("sections").insert(
        toCreate.map((s) => ({
          school_id: schoolId,
          class_id: s.class_id,
          name: s.name,
          academic_year_id: newYearId,
        }))
      );
      if (error) { toast.error("Failed to copy sections: " + error.message); setLoading(false); return; }
    }

    if (activeYearId) {
      const { data: prevFees } = await supabase
        .from("fee_structures")
        .select("id, fee_type, amount, class_id, class:classes(name)")
        .eq("school_id", schoolId)
        .eq("academic_year_id", activeYearId);
      const mapped = (prevFees ?? []).map((f) => ({
        id: f.id,
        fee_type: f.fee_type,
        amount: Number(f.amount),
        class_id: f.class_id,
        class_name: (f.class as unknown as { name: string } | null)?.name ?? "",
      }));
      setFeeStructures(mapped);
      const amounts: Record<string, number> = {};
      mapped.forEach((f) => { amounts[f.id] = f.amount; });
      setFeeAmounts(amounts);
    }
    setLoading(false);
    setStep(3);
  }

  async function handleCopyFees() {
    if (!newYearId) return;
    setLoading(true);
    const supabase = createClient();
    if (feeStructures.length > 0) {
      const { error } = await supabase.from("fee_structures").insert(
        feeStructures.map((f) => ({
          school_id: schoolId,
          class_id: f.class_id,
          academic_year_id: newYearId,
          fee_type: f.fee_type,
          amount: feeAmounts[f.id] ?? f.amount,
        }))
      );
      if (error) { toast.error("Failed to copy fee structures: " + error.message); setLoading(false); return; }
    }
    setLoading(false);
    toast.success(`Draft year "${yearName}" created. Review timetable and teacher assignments, then activate when ready.`);
    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative w-full max-w-2xl rounded-xl bg-white p-8 shadow-xl">
        <button onClick={onClose} className="absolute right-4 top-4 rounded p-1 hover:bg-muted">
          <X className="h-4 w-4" />
        </button>

        <div className="mb-6 flex items-center gap-2 text-sm">
          {["Create Year", "Review Sections", "Review Fees"].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              {i > 0 && <span className="text-muted-foreground">→</span>}
              <span className={`font-medium ${step === i + 1 ? "text-indigo-600" : step > i + 1 ? "text-emerald-600" : "text-muted-foreground"}`}>
                {step > i + 1 ? "✓ " : ""}{label}
              </span>
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">New Academic Year</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-3 sm:col-span-1">
                <Label>Year Name</Label>
                <Input value={yearName} onChange={(e) => setYearName(e.target.value)} placeholder="2025-26" />
              </div>
              <div>
                <Label>Start Date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleCreateYear} disabled={loading || !yearName}>
                {loading ? "Creating…" : "Create & Continue"}
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Review Sections</h2>
            <p className="text-sm text-muted-foreground">
              These sections are copied from the previous year. Deselect any you don&apos;t need.
            </p>
            {sections.length === 0 && (
              <p className="text-sm text-muted-foreground italic">No sections found in previous year. Sections can be added from the Classes page.</p>
            )}
            <div className="max-h-64 overflow-y-auto space-y-1">
              {sections.map((s) => (
                <label key={s.id} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-muted cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSectionIds.has(s.id)}
                    onChange={() => {
                      setSelectedSectionIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(s.id)) next.delete(s.id); else next.add(s.id);
                        return next;
                      });
                    }}
                  />
                  <span className="text-sm">{s.class_name} — {s.name}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={handleCopySections} disabled={loading}>
                {loading ? "Copying…" : "Confirm & Continue"}
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Review Fee Structures</h2>
            <p className="text-sm text-muted-foreground">
              Edit fee amounts for the new year. All fee types are copied from the previous year.
            </p>
            {feeStructures.length === 0 && (
              <p className="text-sm text-muted-foreground italic">No fee structures found. They can be added from the Fees page.</p>
            )}
            <div className="max-h-64 overflow-y-auto space-y-2">
              {feeStructures.map((f) => (
                <div key={f.id} className="flex items-center justify-between gap-4 rounded border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{f.fee_type}</p>
                    <p className="text-xs text-muted-foreground">{f.class_name}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">₹</span>
                    <Input
                      type="number"
                      className="w-28"
                      value={feeAmounts[f.id] ?? f.amount}
                      onChange={(e) => setFeeAmounts((prev) => ({ ...prev, [f.id]: Number(e.target.value) }))}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={handleCopyFees} disabled={loading}>
                {loading ? "Saving…" : "Finish — Create Draft Year"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
