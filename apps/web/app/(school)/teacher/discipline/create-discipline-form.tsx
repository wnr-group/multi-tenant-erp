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

interface StudentOption {
  id: string;
  full_name: string;
}

const CATEGORIES = [
  { value: "behavioral", label: "Behavioral" },
  { value: "academic", label: "Academic" },
  { value: "attendance", label: "Attendance" },
];

const SEVERITIES = [
  { value: "verbal", label: "Verbal Warning" },
  { value: "written", label: "Written Notice" },
  { value: "suspension", label: "Suspension" },
];

export function CreateDisciplineForm({
  teacherId,
  schoolId,
  students,
}: {
  teacherId: string;
  schoolId: string;
  students: StudentOption[];
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [studentId, setStudentId] = useState("");
  const [category, setCategory] = useState("");
  const [severity, setSeverity] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId || !category || !severity) return;
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.from("discipline_records").insert({
      school_id: schoolId,
      teacher_id: teacherId,
      student_id: studentId,
      category,
      severity,
      description: description || null,
      date: date || today,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setStudentId("");
    setCategory("");
    setSeverity("");
    setDescription("");
    setDate(today);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {error && <p className="col-span-2 text-sm text-red-600">{error}</p>}

      <div>
        <Label>Student</Label>
        <Select value={studentId} onValueChange={(v) => setStudentId(v ?? "")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select student" />
          </SelectTrigger>
          <SelectContent>
            {students.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Date</Label>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div>
        <Label>Category</Label>
        <Select value={category} onValueChange={(v) => setCategory(v ?? "")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Severity</Label>
        <Select value={severity} onValueChange={(v) => setSeverity(v ?? "")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select severity" />
          </SelectTrigger>
          <SelectContent>
            {SEVERITIES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="col-span-2">
        <Label>Description</Label>
        <textarea
          className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the incident…"
        />
      </div>

      <div className="col-span-2">
        <Button
          type="submit"
          disabled={loading || !studentId || !category || !severity}
        >
          {loading ? "Logging…" : "Log Incident"}
        </Button>
      </div>
    </form>
  );
}
