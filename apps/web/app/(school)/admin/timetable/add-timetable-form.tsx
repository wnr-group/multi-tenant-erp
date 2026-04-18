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

interface Option {
  id: string;
  label: string;
}

interface SubjectOption {
  id: string;
  name: string;
}

interface AddTimetableFormProps {
  schoolId: string;
  sections: Option[];
  subjects: SubjectOption[];
  teachers: Option[];
}

const DAYS = [
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

export function AddTimetableForm({
  schoolId,
  sections,
  subjects,
  teachers,
}: AddTimetableFormProps) {
  const router = useRouter();
  const [sectionId, setSectionId] = useState("");
  const [day, setDay] = useState("");
  const [period, setPeriod] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sectionId || !day || !period || !subjectId || !teacherId) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.from("timetable").insert({
      school_id: schoolId,
      section_id: sectionId,
      day_of_week: parseInt(day),
      period_number: parseInt(period),
      subject_id: subjectId,
      teacher_id: teacherId,
    });
    setSectionId("");
    setDay("");
    setPeriod("");
    setSubjectId("");
    setTeacherId("");
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      <div>
        <Label>Section</Label>
        <Select value={sectionId} onValueChange={(v) => setSectionId(v ?? "")} required>
          <SelectTrigger>
            <SelectValue placeholder="Section" />
          </SelectTrigger>
          <SelectContent>
            {sections.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Day</Label>
        <Select value={day} onValueChange={(v) => setDay(v ?? "")} required>
          <SelectTrigger>
            <SelectValue placeholder="Day" />
          </SelectTrigger>
          <SelectContent>
            {DAYS.map((d) => (
              <SelectItem key={d.value} value={d.value}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Period</Label>
        <Input
          type="number"
          min={1}
          max={10}
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          placeholder="e.g. 1"
          required
        />
      </div>
      <div>
        <Label>Subject</Label>
        <Select value={subjectId} onValueChange={(v) => setSubjectId(v ?? "")} required>
          <SelectTrigger>
            <SelectValue placeholder="Subject" />
          </SelectTrigger>
          <SelectContent>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Teacher</Label>
        <Select value={teacherId} onValueChange={(v) => setTeacherId(v ?? "")} required>
          <SelectTrigger>
            <SelectValue placeholder="Teacher" />
          </SelectTrigger>
          <SelectContent>
            {teachers.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-end">
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Adding…" : "Add Slot"}
        </Button>
      </div>
    </form>
  );
}
