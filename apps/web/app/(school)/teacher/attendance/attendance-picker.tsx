"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

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
        <NativeSelect
          options={sections.map((s) => ({ value: s.id, label: s.label }))}
          value={sectionId}
          onChange={(e) => setSectionId(e.target.value)}
          placeholder="Select section"
          className="w-full"
        />
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
