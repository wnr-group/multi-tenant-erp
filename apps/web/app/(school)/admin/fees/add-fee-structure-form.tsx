"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

interface ClassOption {
  id: string;
  name: string;
}

interface AcademicYearOption {
  id: string;
  name: string;
}

interface AddFeeStructureFormProps {
  schoolId: string;
  classes: ClassOption[];
  academicYears: AcademicYearOption[];
}

export function AddFeeStructureForm({
  schoolId,
  classes,
  academicYears,
}: AddFeeStructureFormProps) {
  const router = useRouter();
  const [feeType, setFeeType] = useState("");
  const [amount, setAmount] = useState("");
  const [classId, setClassId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!classId || !academicYearId) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.from("fee_structures").insert({
      school_id: schoolId,
      fee_type: feeType,
      amount: parseFloat(amount),
      class_id: classId,
      academic_year_id: academicYearId,
      due_date: dueDate || null,
    });
    setFeeType("");
    setAmount("");
    setClassId("");
    setAcademicYearId("");
    setDueDate("");
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-36">
        <Label>Fee Type</Label>
        <Input
          value={feeType}
          onChange={(e) => setFeeType(e.target.value)}
          placeholder="e.g., Tuition Fee"
          required
        />
      </div>
      <div className="w-36">
        <Label>Amount (₹)</Label>
        <Input
          type="number"
          min={0}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="5000"
          required
        />
      </div>
      <div className="w-40">
        <Label>Class</Label>
        <NativeSelect
          options={classes.map((c) => ({ value: c.id, label: c.name }))}
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          placeholder="Select class"
        />
      </div>
      <div className="w-44">
        <Label>Academic Year</Label>
        <NativeSelect
          options={academicYears.map((y) => ({ value: y.id, label: y.name }))}
          value={academicYearId}
          onChange={(e) => setAcademicYearId(e.target.value)}
          placeholder="Select year"
        />
      </div>
      <div>
        <Label>Due Date (optional)</Label>
        <Input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Adding…" : "Add Fee Structure"}
      </Button>
    </form>
  );
}
