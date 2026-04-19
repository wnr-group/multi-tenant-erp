"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddAcademicYearForm({
  schoolId,
  onSuccess,
}: {
  schoolId: string;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    await supabase.from("academic_years").insert({
      school_id: schoolId,
      name,
      start_date: startDate || null,
      end_date: endDate || null,
    });
    setName("");
    setStartDate("");
    setEndDate("");
    setLoading(false);
    router.refresh();
    onSuccess?.();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-40">
        <Label>Year Name (e.g., "2024-25")</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="2024-25"
          required
        />
      </div>
      <div>
        <Label>Start Date</Label>
        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
      </div>
      <div>
        <Label>End Date</Label>
        <Input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Adding…" : "Add Year"}
      </Button>
    </form>
  );
}
