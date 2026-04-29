"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

interface ClassOption { id: string; name: string }
interface SectionOption { id: string; name: string }

interface Props {
  studentId: string;
  schoolId: string;
  initialName: string;
  initialEmail: string;
  initialRoll: string;
  initialAdmission: string;
  initialParentPhone: string;
  initialClassId: string;
  initialSectionId: string;
  classes: ClassOption[];
}

export function StudentEditForm({
  studentId,
  schoolId,
  initialName,
  initialEmail,
  initialRoll,
  initialAdmission,
  initialParentPhone,
  initialClassId,
  initialSectionId,
  classes,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [roll, setRoll] = useState(initialRoll);
  const [admission, setAdmission] = useState(initialAdmission);
  const [parentPhone, setParentPhone] = useState(initialParentPhone);
  const [classId, setClassId] = useState(initialClassId);
  const [sectionId, setSectionId] = useState(initialSectionId);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!classId) return;
    const supabase = createClient();
    supabase
      .from("sections")
      .select("id, name")
      .eq("class_id", classId)
      .then(({ data }) => setSections(data ?? []));
  }, [classId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("student_profiles")
      .update({
        full_name: name,
        email: email || null,
        roll_number: roll || null,
        admission_number: admission || null,
        parent_phone: parentPhone || null,
        class_id: classId || null,
        section_id: sectionId || null,
      })
      .eq("id", studentId);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Student profile updated.");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
      <div><Label>Full Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
      <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div><Label>Roll Number</Label><Input value={roll} onChange={(e) => setRoll(e.target.value)} /></div>
      <div><Label>Admission Number</Label><Input value={admission} onChange={(e) => setAdmission(e.target.value)} /></div>
      <div className="col-span-2">
        <Label>Parent Phone</Label>
        <Input type="tel" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} placeholder="+91 98765 43210" />
      </div>
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
        <Button type="submit" disabled={loading}>{loading ? "Saving…" : "Save Changes"}</Button>
      </div>
    </form>
  );
}
