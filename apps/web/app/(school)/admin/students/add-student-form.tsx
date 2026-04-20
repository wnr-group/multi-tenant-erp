"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

interface ClassOption { id: string; name: string }
interface SectionOption { id: string; name: string }

export function AddStudentForm({ schoolId, classes, onSuccess }: { schoolId: string; classes: ClassOption[]; onSuccess?: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!classId) return;
    const supabase = createClient();
    supabase.from("sections").select("id, name").eq("class_id", classId).then(({ data }) => {
      setSections(data ?? []);
      setSectionId("");
    });
  }, [classId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.from("student_profiles").insert({
      school_id: schoolId,
      full_name: name,
      email: email || null,
      class_id: classId || null,
      section_id: sectionId || null,
      roll_number: rollNumber || null,
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    setName(""); setEmail(""); setRollNumber(""); setClassId(""); setSectionId("");
    setLoading(false);
    toast.success("Student added.");
    router.refresh();
    onSuccess?.();
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
      <div><Label>Full Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
      <div><Label>Email (optional)</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div><Label>Roll Number</Label><Input value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} /></div>
      <div>
        <Label>Class</Label>
        <NativeSelect
          options={classes.map((c) => ({ value: c.id, label: c.name }))}
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          placeholder="Select class"
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
        />
      </div>
      <div className="col-span-2">
        <Button type="submit" disabled={loading}>{loading ? "Adding…" : "Add Student"}</Button>
      </div>
    </form>
  );
}
