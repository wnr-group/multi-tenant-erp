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

interface AddSectionFormProps {
  schoolId: string;
  classes: ClassOption[];
}

export function AddSectionForm({ schoolId, classes }: AddSectionFormProps) {
  const router = useRouter();
  const [classId, setClassId] = useState("");
  const [sectionName, setSectionName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!classId) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.from("sections").insert({
      school_id: schoolId,
      class_id: classId,
      name: sectionName,
    });
    setClassId("");
    setSectionName("");
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      <div className="w-48">
        <Label>Class</Label>
        <NativeSelect
          options={classes.map((c) => ({ value: c.id, label: c.name }))}
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          placeholder="Select class"
        />
      </div>
      <div className="flex-1">
        <Label>Section Name (e.g., "A")</Label>
        <Input
          value={sectionName}
          onChange={(e) => setSectionName(e.target.value)}
          required
        />
      </div>
      <Button type="submit" disabled={loading || !classId}>
        {loading ? "Adding…" : "Add Section"}
      </Button>
    </form>
  );
}
