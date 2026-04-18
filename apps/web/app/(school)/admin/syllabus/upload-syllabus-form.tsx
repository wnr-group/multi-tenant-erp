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

  function handleClassChange(value: string) {
    setClassId(value);
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
        <NativeSelect
          options={classes.map((c) => ({ value: c.id, label: c.name }))}
          value={classId}
          onChange={(e) => handleClassChange(e.target.value)}
          placeholder="Select class"
        />
      </div>
      <div className="w-44">
        <Label>Subject</Label>
        <NativeSelect
          options={filteredSubjects.map((s) => ({ value: s.id, label: s.name }))}
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          placeholder="Select subject"
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
