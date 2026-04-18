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

interface SubjectOption {
  id: string;
  name: string;
  classId: string | null;
}

interface AcademicYearOption {
  id: string;
  name: string;
}

interface UploadSyllabusFormProps {
  schoolId: string;
  classes: ClassOption[];
  subjects: SubjectOption[];
  academicYears: AcademicYearOption[];
}

export function UploadSyllabusForm({
  schoolId,
  classes,
  subjects,
  academicYears,
}: UploadSyllabusFormProps) {
  const router = useRouter();
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const filteredSubjects = classId
    ? subjects.filter((s) => s.classId === classId)
    : subjects;

  function handleClassChange(value: string | null) {
    setClassId(value ?? "");
    setSubjectId("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!classId || !subjectId || !academicYearId) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.from("syllabus").insert({
      school_id: schoolId,
      class_id: classId,
      subject_id: subjectId,
      academic_year_id: academicYearId,
      file_url: fileUrl || null,
    });
    setClassId("");
    setSubjectId("");
    setAcademicYearId("");
    setFileUrl("");
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="w-44">
        <Label>Class</Label>
        <Select value={classId} onValueChange={handleClassChange}>
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
        <Label>Subject</Label>
        <Select value={subjectId} onValueChange={(v) => setSubjectId(v ?? "")}>
          <SelectTrigger>
            <SelectValue placeholder="Select subject" />
          </SelectTrigger>
          <SelectContent>
            {filteredSubjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
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
      <div className="flex-1 min-w-48">
        <Label>File URL (paste link or storage URL)</Label>
        <Input
          type="url"
          value={fileUrl}
          onChange={(e) => setFileUrl(e.target.value)}
          placeholder="https://..."
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Saving…" : "Add Syllabus"}
      </Button>
    </form>
  );
}
