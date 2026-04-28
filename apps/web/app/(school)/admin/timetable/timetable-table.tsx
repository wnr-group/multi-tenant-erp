"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { FilterableDataTable } from "@/components/filterable-data-table";
import { toast } from "sonner";

interface Row {
  id: string;
  teacher: string;
  class: string;
  classOrder: number;
  section: string;
  subject: string;
  day: string;
  dayOfWeek: number;
  period: number;
}

interface TimetableTableProps {
  rows: Row[];
  schoolId: string;
}

export function TimetableTable({ rows }: TimetableTableProps) {
  const router = useRouter();

  async function handleDelete(row: Row) {
    if (
      !confirm(
        `Delete ${row.teacher}'s ${row.subject} slot (${row.day}, P${row.period})?`
      )
    ) {
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.from("timetable").delete().eq("id", row.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Timetable slot deleted.");
    router.refresh();
  }

  // Derive unique teacher names for the filter
  const uniqueTeachers = Array.from(
    new Map(rows.map((r) => [r.teacher, r.teacher])).values()
  )
    .sort()
    .map((name) => ({ value: name, label: name }));

  return (
    <FilterableDataTable
      data={rows}
      columns={[
        { header: "Teacher", accessor: "teacher" },
        { header: "Class", accessor: "class" },
        { header: "Section", accessor: "section" },
        { header: "Subject", accessor: "subject" },
        { header: "Day", accessor: "day" },
        {
          header: "Period",
          accessor: (row: Row) => `P${row.period}`,
        },
      ]}
      searchKeys={["teacher", "class", "subject"]}
      searchPlaceholder="Search by teacher, class, or subject…"
      filter={
        uniqueTeachers.length > 0
          ? {
              label: "All Teachers",
              options: uniqueTeachers,
              filterFn: (row: Row, value: string) => row.teacher === value,
            }
          : undefined
      }
      renderActions={(row) => (
        <button
          onClick={() => handleDelete(row)}
          className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
          title="Delete slot"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
      emptyState={
        <p className="py-8 text-center text-sm text-muted-foreground">
          No timetable entries yet. Use the form above to assign teachers.
        </p>
      }
    />
  );
}
