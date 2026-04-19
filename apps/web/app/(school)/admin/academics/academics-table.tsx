"use client";
import { Calendar } from "lucide-react";
import { FilterableDataTable } from "@/components/filterable-data-table";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";

interface YearRow {
  id: string;
  name: string;
  start: string;
  end: string;
  is_current: boolean;
}

interface ExamRow {
  id: string;
  name: string;
  academic_year: string;
  start: string;
  end: string;
}

export function AcademicYearsTable({ yearRows }: { yearRows: YearRow[] }) {
  return (
    <FilterableDataTable
      data={yearRows}
      columns={[
        { header: "Name", accessor: "name" },
        { header: "Start", accessor: "start" },
        { header: "End", accessor: "end" },
        {
          header: "Status",
          accessor: (row: YearRow) =>
            row.is_current ? (
              <Badge variant="default">Current</Badge>
            ) : (
              <Badge variant="secondary">Inactive</Badge>
            ),
        },
      ]}
      searchKeys={["name"]}
      searchPlaceholder="Search academic years…"
      emptyState={
        <EmptyState
          icon={Calendar}
          title="No academic years yet"
          description="Add your first academic year to get started."
        />
      }
    />
  );
}

export function ExamsTable({ examRows }: { examRows: ExamRow[] }) {
  return (
    <FilterableDataTable
      data={examRows}
      columns={[
        { header: "Exam Name", accessor: "name" },
        { header: "Academic Year", accessor: "academic_year" },
        { header: "Start", accessor: "start" },
        { header: "End", accessor: "end" },
      ]}
      searchKeys={["name"]}
      searchPlaceholder="Search exams…"
      emptyState={
        <EmptyState
          icon={Calendar}
          title="No exams yet"
          description="Add your first exam to get started."
        />
      }
    />
  );
}
