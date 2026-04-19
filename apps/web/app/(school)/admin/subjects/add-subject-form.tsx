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

export function AddSubjectForm({
  schoolId,
  classes,
  onSuccess,
}: {
  schoolId: string;
  classes: ClassOption[];
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [classId, setClassId] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    await supabase.from("subjects").insert({
      school_id: schoolId,
      class_id: classId,
      name,
      code: code || null,
    });
    setName("");
    setCode("");
    setClassId("");
    setLoading(false);
    router.refresh();
    onSuccess?.();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div>
        <Label>Class</Label>
        <NativeSelect
          options={classes.map((c) => ({ value: c.id, label: c.name }))}
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          placeholder="Select class"
          className="w-40"
        />
      </div>
      <div className="flex-1">
        <Label>Subject Name (e.g. "Mathematics")</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div>
        <Label>Code (optional, e.g. "MAT")</Label>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-28"
        />
      </div>
      <Button type="submit" disabled={loading || !classId || !name}>
        {loading ? "Adding…" : "Add Subject"}
      </Button>
    </form>
  );
}
