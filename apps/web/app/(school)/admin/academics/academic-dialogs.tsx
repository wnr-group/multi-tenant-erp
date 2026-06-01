"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ActionDialog } from "@/components/action-dialog";
import { AddExamForm } from "./add-exam-form";
import { NewYearWizard } from "./new-year-wizard";

export function NewYearButton({ schoolId, activeYearId }: { schoolId: string; activeYearId: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
      >
        + New Academic Year
      </button>
      {open && (
        <NewYearWizard schoolId={schoolId} activeYearId={activeYearId} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

export function ActivateYearButton({ draftYearId, schoolId }: { draftYearId: string; schoolId: string }) {
  void schoolId;
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleActivate() {
    if (!confirm("Activate this draft year? The current active year will be archived. This cannot be undone.")) return;
    setLoading(true);
    const res = await fetch("/api/academics/activate-year", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draftYearId }),
    });
    setLoading(false);
    if (!res.ok) { toast.error("Failed to activate year"); return; }
    toast.success("Year activated.");
    router.refresh();
  }

  return (
    <button
      onClick={handleActivate}
      disabled={loading}
      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
    >
      {loading ? "Activating…" : "Activate Draft Year"}
    </button>
  );
}

export function AddExamDialog({
  schoolId,
  academicYears,
}: {
  schoolId: string;
  academicYears: { id: string; name: string }[];
}) {
  return (
    <ActionDialog trigger="+ Add Exam" title="Add Exam">
      {(onSuccess) => (
        <AddExamForm schoolId={schoolId} academicYears={academicYears} onSuccess={onSuccess} />
      )}
    </ActionDialog>
  );
}
