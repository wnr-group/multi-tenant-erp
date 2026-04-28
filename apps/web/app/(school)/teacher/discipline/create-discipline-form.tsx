"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "behavioral", label: "Behavioral" },
  { value: "academic", label: "Academic" },
  { value: "attendance", label: "Attendance" },
];

const SEVERITIES = [
  { value: "verbal", label: "Verbal Warning" },
  { value: "written", label: "Written Warning" },
  { value: "suspension", label: "Suspension" },
];

interface Props {
  schoolId: string;
  sectionId: string;
  students: { value: string; label: string }[];
  userId: string;
}

export function CreateDisciplineForm({
  schoolId,
  sectionId: _sectionId,
  students,
  userId,
}: Props) {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [category, setCategory] = useState("");
  const [severity, setSeverity] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId || !category || !severity) return;
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("discipline_records").insert({
      school_id: schoolId,
      student_id: studentId,
      category,
      severity,
      description: description || null,
      recorded_by: userId,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Incident logged successfully.");
    setStudentId("");
    setCategory("");
    setSeverity("");
    setDescription("");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
    >
      <div>
        <Label>Student</Label>
        <NativeSelect
          options={students}
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          placeholder="Select student"
          className="w-full"
        />
      </div>

      <div>
        <Label>Category</Label>
        <NativeSelect
          options={CATEGORIES}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Select category"
          className="w-full"
        />
      </div>

      <div>
        <Label>Severity</Label>
        <NativeSelect
          options={SEVERITIES}
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
