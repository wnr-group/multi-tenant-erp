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

export function AddStudentForm({
  schoolId,
  academicYearId,
  classes,
  onSuccess,
}: {
  schoolId: string;
  academicYearId: string;
  classes: ClassOption[];
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!classId || !academicYearId) return;
    const supabase = createClient();
    supabase
      .from("sections")
      .select("id, name")
      .eq("class_id", classId)
      .eq("academic_year_id", academicYearId)
      .then(({ data, error }) => {
        if (!error) {
          setSections(data ?? []);
          setSectionId("");
        }
      });
  }, [classId, academicYearId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!parentPhone.trim()) {
      toast.error("Parent phone is required.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();

      // Resolve parent identity (creates auth user + parent role if needed) server-side.
      let parentProfileId: string | null = null;
      const resp = await fetch("/api/students/resolve-parent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: parentPhone, schoolId }),
      });
      const resolveJson = await resp.json();
      if (!resp.ok) {
        toast.error(resolveJson.error ?? "Failed to resolve parent.");
        return;
      }
      parentProfileId = resolveJson.parentProfileId;

      const { data: sp, error: spErr } = await supabase
        .from("student_profiles")
        .insert({
          school_id: schoolId,
          full_name: name,
          admission_number: admissionNumber || null,
          parent_profile_id: parentProfileId,
        })
        .select("id")
        .single();

      if (spErr || !sp) {
        toast.error(spErr?.message ?? "Failed to create student.");
        return;
      }

      const { error: enrollErr } = await supabase.from("student_enrollments").insert({
        student_profile_id: sp.id,
        academic_year_id: academicYearId,
        school_id: schoolId,
        class_id: classId || null,
        section_id: sectionId || null,
        roll_number: rollNumber || null,
        is_active: true,
      });

      if (enrollErr) {
        toast.error(enrollErr.message);
        await supabase.from("student_profiles").delete().eq("id", sp.id);
        return;
      }

      setName(""); setRollNumber(""); setAdmissionNumber("");
      setParentPhone(""); setClassId(""); setSectionId("");
      toast.success("Student added.");
      router.refresh();
      onSuccess?.();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
      <div><Label>Full Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
      <div><Label>Parent Phone *</Label><Input type="tel" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} placeholder="+91 98765 43210" required /></div>
      <div><Label>Roll Number</Label><Input value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} /></div>
      <div><Label>Admission Number</Label><Input value={admissionNumber} onChange={(e) => setAdmissionNumber(e.target.value)} /></div>
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
