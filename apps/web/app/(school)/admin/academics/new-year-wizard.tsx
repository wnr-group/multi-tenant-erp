"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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

interface FeeLineItem {
  id: string;
  fee_type_name: string;
  fee_type_id: string;
  total_amount: number;
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
  const [mounted, setMounted] = useState(false);
  const portalRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    portalRef.current = document.body;
    setMounted(true);
  }, []);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [newYearId, setNewYearId] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();
  const [yearName, setYearName] = useState(`${currentYear}-${String(currentYear + 1).slice(2)}`);
  const [startDate, setStartDate] = useState(`${currentYear}-04-01`);
  const [endDate, setEndDate] = useState(`${currentYear + 1}-03-31`);

  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSectionIds, setSelectedSectionIds] = useState<Set<string>>(new Set());

  const [feeLineItems, setFeeLineItems] = useState<FeeLineItem[]>([]);
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

    // Copy section_assignments (teacher→section mappings) from the previous year to the new year
    if (activeYearId && newYearId) {
      const { data: prevAssignments } = await supabase
        .from("section_assignments")
        .select("section_id, class_teacher_id")
        .eq("school_id", schoolId)
        .eq("academic_year_id", activeYearId);

      if (prevAssignments?.length) {
        // Map old section IDs to new ones by matching class_id + section name
        const { data: newSections } = await supabase
          .from("sections")
          .select("id, name, class_id")
          .eq("school_id", schoolId)
          .eq("academic_year_id", newYearId);

        const { data: oldSections } = await supabase
          .from("sections")
          .select("id, name, class_id")
          .eq("school_id", schoolId)
          .eq("academic_year_id", activeYearId);

        const oldSectionMap = new Map((oldSections ?? []).map((s) => [s.id, s]));
        const newAssignments = prevAssignments
          .map((a) => {
            const oldSec = oldSectionMap.get(a.section_id);
            if (!oldSec) return null;
            const matchingNew = (newSections ?? []).find(
              (ns) => ns.class_id === oldSec.class_id && ns.name === oldSec.name
            );
            if (!matchingNew) return null;
            return {
              school_id: schoolId,
              section_id: matchingNew.id,
              class_teacher_id: a.class_teacher_id,
              academic_year_id: newYearId,
            };
          })
          .filter(Boolean);

        if (newAssignments.length > 0) {
          await supabase.from("section_assignments").insert(newAssignments);
        }

        // Copy timetable entries, mapping old section IDs to new ones
        const { data: prevTimetable } = await supabase
          .from("timetable")
          .select("section_id, day_of_week, period, subject_id, teacher_id")
          .eq("school_id", schoolId)
          .eq("academic_year_id", activeYearId);

        if (prevTimetable?.length) {
          const newTimetable = prevTimetable
            .map((t) => {
              const oldSec = oldSectionMap.get(t.section_id);
              if (!oldSec) return null;
              const matchingNew = (newSections ?? []).find(
                (ns) => ns.class_id === oldSec.class_id && ns.name === oldSec.name
              );
              if (!matchingNew) return null;
              return {
                school_id: schoolId,
                section_id: matchingNew.id,
                day_of_week: t.day_of_week,
                period: t.period,
                subject_id: t.subject_id,
                teacher_id: t.teacher_id,
                academic_year_id: newYearId,
              };
            })
            .filter(Boolean);

          if (newTimetable.length > 0) {
            await supabase.from("timetable").insert(newTimetable);
          }
        }
      }
    }

    if (activeYearId) {
      // Fetch distinct fee_type + class combinations from previous year's line items
      const { data: prevFees } = await supabase
        .from("fee_line_items")
        .select("id, total_amount, class_id, fee_type_id, fee_types(name), class:classes(name)")
        .eq("school_id", schoolId)
        .eq("academic_year_id", activeYearId);
      // Deduplicate by fee_type_id + class_id to get one representative per combo
      const seen = new Set<string>();
      const mapped: FeeLineItem[] = [];
      for (const f of prevFees ?? []) {
        const key = `${f.fee_type_id}__${f.class_id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        mapped.push({
          id: f.id,
          fee_type_name: (f.fee_types as unknown as { name: string } | null)?.name ?? "",
          fee_type_id: f.fee_type_id,
          total_amount: Number(f.total_amount),
          class_id: f.class_id,
          class_name: (f.class as unknown as { name: string } | null)?.name ?? "",
        });
      }
      setFeeLineItems(mapped);
      const amounts: Record<string, number> = {};
      mapped.forEach((f) => { amounts[f.id] = f.total_amount; });
      setFeeAmounts(amounts);
    }
    setLoading(false);
    setStep(3);
  }

  async function handleCopyFees() {
    if (!newYearId) return;
    setLoading(true);
    const supabase = createClient();
    // Fee types are school-wide — no need to copy them.
    // Create template fee_line_items for the new academic year (one per fee_type+class combo).
    if (feeLineItems.length > 0) {
      const { error } = await supabase.from("fee_line_items").insert(
        feeLineItems.map((f) => ({
          school_id: schoolId,
          class_id: f.class_id,
          academic_year_id: newYearId,
          fee_type_id: f.fee_type_id,
          total_amount: feeAmounts[f.id] ?? f.total_amount,
          status: "pending",
        }))
      );
      if (error) { toast.error("Failed to copy fee line items: " + error.message); setLoading(false); return; }
    }
    setLoading(false);
    toast.success(`Draft year "${yearName}" created. Review timetable and teacher assignments, then activate when ready.`);
    router.refresh();
    onClose();
  }

  const content = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        {/* Fixed header — always visible */}
        <div className="shrink-0 border-b px-8 pb-4 pt-6">
          <button onClick={onClose} className="absolute right-4 top-4 rounded p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 text-sm">
            {["Create Year", "Review Sections", "Review Fees"].map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                {i > 0 && <span className="text-muted-foreground">→</span>}
                <span className={`font-medium ${step === i + 1 ? "text-indigo-600" : step > i + 1 ? "text-emerald-600" : "text-muted-foreground"}`}>
                  {step > i + 1 ? "✓ " : ""}{label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-8 py-6">

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
            {feeLineItems.length === 0 && (
              <p className="text-sm text-muted-foreground italic">No fee line items found. They can be added from the Fees page.</p>
            )}
            <div className="max-h-64 overflow-y-auto space-y-2">
              {feeLineItems.map((f) => (
                <div key={f.id} className="flex items-center justify-between gap-4 rounded border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{f.fee_type_name}</p>
                    <p className="text-xs text-muted-foreground">{f.class_name}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">₹</span>
                    <Input
                      type="number"
                      className="w-28"
                      value={feeAmounts[f.id] ?? f.total_amount}
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

        </div>{/* end scrollable body */}
      </div>
    </div>
  );

  if (!mounted || !portalRef.current) return null;
  return createPortal(content, portalRef.current);
}
