"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function StepAcademicYear({
  schoolId,
  brandColor,
  onComplete,
}: {
  schoolId: string;
  brandColor: string;
  onComplete: (yearId: string) => void;
}) {
  const currentYear = new Date().getFullYear();
  const [name, setName] = useState(`${currentYear}-${String(currentYear + 1).slice(2)}`);
  const [startDate, setStartDate] = useState(`${currentYear}-04-01`);
  const [endDate, setEndDate] = useState(`${currentYear + 1}-03-31`);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("Year name is required"); return; }
    if (startDate >= endDate) { toast.error("Start date must be before end date"); return; }
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("academic_years")
      .insert({ school_id: schoolId, name: name.trim(), start_date: startDate, end_date: endDate, status: "active" })
      .select("id")
      .single();
    setLoading(false);
    if (error || !data) { toast.error(error?.message ?? "Failed to create year"); return; }
    onComplete(data.id);
  }

  return (
    <div className="space-y-6 rounded-xl border bg-white p-8 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Create Academic Year</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This is the current year your school is running. You can add more years later.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="year-name">Year Name</Label>
          <Input
            id="year-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="2025-26"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="start-date">Start Date</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="end-date">End Date</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
        <Button
          type="submit"
          disabled={loading}
          className="w-full"
          style={{ backgroundColor: brandColor }}
        >
          {loading ? "Creating…" : "Create & Continue →"}
        </Button>
      </form>
    </div>
  );
}
