"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FeeTypeSelect, type FeeType } from "@/components/fee-type-select";

interface Props {
  classes: { id: string; name: string }[];
  academicYears: { id: string; name: string }[];
  feeTypes: FeeType[];
}

export function PushFeeForm({ classes, academicYears, feeTypes }: Props) {
  const router = useRouter();
  const [feeTypeId, setFeeTypeId] = useState("");
  const [amount, setAmount] = useState("");
  const [classId, setClassId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ created: number } | null>(null);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);
    if (!classId) { setError("Please select a class."); return; }
    if (!feeTypeId) { setError("Please select a fee type."); return; }
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) { setError("Enter a valid amount."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/fees/push-to-class", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          class_id: classId,
          academic_year_id: academicYearId || null,
          fee_type_id: feeTypeId,
          total_amount: amountNum,
          due_date: dueDate || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to push fees."); return; }
      setResult({ created: data.created });
      setFeeTypeId(""); setAmount(""); setClassId(""); setAcademicYearId(""); setDueDate("");
      router.refresh();
    } catch {
      setError("Unexpected error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-48">
          <Label>Fee Type</Label>
          <FeeTypeSelect
            feeTypes={feeTypes}
            value={feeTypeId}
            onChange={setFeeTypeId}
            required
          />
        </div>
        <div className="w-36">
          <Label>Amount (₹)</Label>
          <Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="5000" required />
        </div>
        <div className="w-40">
          <Label>Class</Label>
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Select class</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="w-44">
          <Label>Academic Year</Label>
          <select
            value={academicYearId}
            onChange={(e) => setAcademicYearId(e.target.value)}
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Select year</option>
            {academicYears.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
          </select>
        </div>
        <div>
          <Label>Due Date (optional)</Label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "Pushing…" : "Push to Class"}
        </Button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {result && (
        <p className="text-sm text-green-700">
          Done — created {result.created} fee line item{result.created !== 1 ? "s" : ""}.
        </p>
      )}
    </form>
  );
}
