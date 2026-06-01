"use client";
import { Calendar } from "lucide-react";
import { FilterableDataTable } from "@/components/filterable-data-table";
import { EmptyState } from "@/components/empty-state";

interface YearRow {
  id: string;
  name: string;
  start: string;
  end: string;
  status: "draft" | "active" | "archived";
}

interface ExamRow {
  id: string;
  name: string;
  academic_year: string;
  start: string;
  end: string;
}

export function AcademicYearsTable({ yearRows, schoolId }: { yearRows: YearRow[]; schoolId: string }) {
  void schoolId;
  return (
    <FilterableDataTable
      data={yearRows}
      columns={[
        { header: "Name", accessor: "name" },
        { header: "Start", accessor: "start" },
        { header: "End", accessor: "end" },
        {
          header: "Status",
          accessor: (row: YearRow) => (
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              row.status === "active"
                ? "bg-emerald-100 text-emerald-700"
                : row.status === "draft"
                ? "bg-amber-100 text-amber-700"
                : "bg-gray-100 text-gray-500"
            }`}>
              {row.status}
            </span>
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
