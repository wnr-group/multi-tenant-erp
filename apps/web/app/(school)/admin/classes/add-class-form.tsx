"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddClassForm({ schoolId, onSuccess }: { schoolId: string; onSuccess?: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { data: maxRow } = await supabase
      .from("classes")
      .select("order")
      .eq("school_id", schoolId)
      .order("order", { ascending: false })
      .limit(1)
      .single();
    const nextOrder = (maxRow?.order ?? 0) + 1;
    await supabase.from("classes").insert({ school_id: schoolId, name, order: nextOrder });
    setName("");
    setLoading(false);
    toast.success("Class added.");
    router.refresh();
    onSuccess?.();
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      <div className="flex-1">
        <Label>Class Name (e.g., "Class 10")</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Adding…" : "Add Class"}
      </Button>
    </form>
  );
}
