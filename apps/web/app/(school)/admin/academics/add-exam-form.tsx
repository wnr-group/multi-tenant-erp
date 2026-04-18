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

interface AcademicYearOption {
  id: string;
  name: string;
}

interface AddExamFormProps {
  schoolId: string;
  academicYears: AcademicYearOption[];
}

export function AddExamForm({ schoolId, academicYears }: AddExamFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!academicYearId) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.from("exams").insert({
      school_id: schoolId,
      name,
      academic_year_id: academicYearId,
      start_date: startDate || null,
      end_date: endDate || null,
    });
    setName("");
    setAcademicYearId("");
    setStartDate("");
    setEndDate("");
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-40">
        <Label>Exam Name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Term 1 Exam"
          required
        />
      </div>
      <div className="w-48">
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
        <Label>Start Date (optional)</Label>
        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
      </div>
      <div>
        <Label>End Date (optional)</Label>
        <Input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Adding…" : "Add Exam"}
      </Button>
    </form>
  );
}
