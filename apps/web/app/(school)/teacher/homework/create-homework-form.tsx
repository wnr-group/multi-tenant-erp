"use client";

import { useState, useEffect } from "react";
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

interface SectionOption {
  id: string;
  name: string;
}

interface SubjectOption {
  id: string;
  name: string;
}

export function CreateHomeworkForm({
  teacherId,
  schoolId,
  classes,
  activeSectionId,
  activeSectionClassId,
}: {
  teacherId: string;
  schoolId: string;
  classes: ClassOption[];
  activeSectionId?: string;
  activeSectionClassId?: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!classId) {
      setSections([]);
      setSubjects([]);
      setSectionId("");
      setSubjectId("");
      return;
    }
    const supabase = createClient();
    Promise.all([
      supabase.from("sections").select("id, name").eq("class_id", classId),
      supabase.from("subjects").select("id, name").eq("class_id", classId),
    ]).then(([secRes, subRes]) => {
      setSections(secRes.data ?? []);
      setSubjects(subRes.data ?? []);
      setSectionId("");
      setSubjectId("");
    });
  }, [classId]);

  // Pre-fill class when active section's class is known
  useEffect(() => {
    if (activeSectionClassId) {
      setClassId(activeSectionClassId);
    }
  }, [activeSectionClassId]);

  // Pre-fill section once sections have loaded for the active class
  useEffect(() => {
    if (activeSectionId && sections.length > 0) {
      const match = sections.find((s) => s.id === activeSectionId);
      if (match) {
        setSectionId(match.id);
      }
    }
  }, [activeSectionId, sections]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !classId || !sectionId || !subjectId) return;
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.from("homework").insert({
      school_id: schoolId,
      class_id: classId,
      teacher_id: teacherId,
      section_id: sectionId,
      subject_id: subjectId,
      title,
      description: description || null,
      due_date: dueDate || null,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setTitle("");
    setDescription("");
    setDueDate("");
    setClassId("");
    setSectionId("");
    setSubjectId("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {error && <p className="col-span-2 text-sm text-red-600">{error}</p>}

      <div className="col-span-2 sm:col-span-1">
        <Label>Title</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Chapter 3 exercises"
          required
        />
      </div>

      <div>
        <Label>Due Date</Label>
        <Input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>

      <div>
        <Label>Class</Label>
        <NativeSelect
          options={classes.map((c) => ({ value: c.id, label: c.name }))}
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          placeholder="Select class"
          className="w-full"
        />
      </div>

      <div>
        <Label>Section</Label>
        <NativeSelect
          options={sections.map((s) => ({ value: s.id, label: s.name }))}
          value={sectionId}
          onChange={(e) => setSectionId(e.target.value)}
          placeholder="Select section"
          disabled={!classId}
          className="w-full"
        />
      </div>

      <div>
        <Label>Subject</Label>
        <NativeSelect
          options={subjects.map((s) => ({ value: s.id, label: s.name }))}
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          placeholder="Select subject"
          disabled={!classId}
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
          placeholder="Instructions or additional details…"
        />
      </div>

      <div className="col-span-2">
        <Button
          type="submit"
          disabled={loading || !title || !classId || !sectionId || !subjectId}
        >
          {loading ? "Assigning…" : "Assign Homework"}
        </Button>
      </div>
    </form>
  );
}
