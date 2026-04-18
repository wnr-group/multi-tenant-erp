"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SectionOption {
  id: string;
  label: string;
}

export function AttendancePicker({
  sections,
}: {
  sections: SectionOption[];
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [sectionId, setSectionId] = useState("");
  const [date, setDate] = useState(today);

  function handleMark() {
    if (!sectionId || !date) return;
    router.push(
      `/teacher/attendance/mark?sectionId=${sectionId}&date=${date}`
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div>
        <Label>Section</Label>
        <Select value={sectionId} onValueChange={(v) => setSectionId(v ?? "")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select section" />
          </SelectTrigger>
          <SelectContent>
            {sections.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Date</Label>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <div className="flex items-end">
        <Button onClick={handleMark} disabled={!sectionId || !date} className="w-full">
          Mark Attendance
        </Button>
      </div>
    </div>
  );
}
