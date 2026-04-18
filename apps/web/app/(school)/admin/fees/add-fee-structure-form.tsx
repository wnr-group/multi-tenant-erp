"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
        <Select value={classId} onValueChange={(v) => setClassId(v ?? "")}>
          <SelectTrigger>
            <SelectValue placeholder="Select class" />
          </SelectTrigger>
          <SelectContent>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="w-44">
        <Label>Academic Year</Label>
        <Select value={academicYearId} onValueChange={(v) => setAcademicYearId(v ?? "")}>
          <SelectTrigger>
            <SelectValue placeholder="Select year" />
          </SelectTrigger>
          <SelectContent>
            {academicYears.map((y) => (
              <SelectItem key={y.id} value={y.id}>
                {y.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
