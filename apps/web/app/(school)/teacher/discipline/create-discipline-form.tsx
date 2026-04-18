"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

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
        <NativeSelect
          options={students.map((s) => ({ value: s.id, label: s.full_name }))}
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          placeholder="Select student"
          className="w-full"
        />
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
        <NativeSelect
          options={CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Select category"
          className="w-full"
        />
      </div>

      <div>
        <Label>Severity</Label>
        <NativeSelect
          options={SEVERITIES.map((s) => ({ value: s.value, label: s.label }))}
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          placeholder="Select severity"
          className="w-full"
        />
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
