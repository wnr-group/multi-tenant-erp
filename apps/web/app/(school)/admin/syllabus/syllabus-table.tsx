"use client";
import { Upload } from "lucide-react";
import { FilterableDataTable } from "@/components/filterable-data-table";
import { EmptyState } from "@/components/empty-state";
import { UploadSyllabusDialog } from "./upload-syllabus-dialog";

interface SyllabusRow {
  id: string;
  class_name: string;
  subject_name: string;
  academic_year: string;
  file_url: string;
}

interface ClassItem {
  id: string;
  name: string;
}

interface SubjectItem {
  id: string;
  name: string;
  classId: string | null;
}

interface AcademicYearItem {
  id: string;
  name: string;
}

interface YearFilterOption {
  value: string;
  label: string;
}

export function SyllabusTable({
  rows,
  yearFilterOptions,
  schoolId,
  classesData,
  subjectsData,
  academicYearsData,
}: {
  rows: SyllabusRow[];
  yearFilterOptions: YearFilterOption[];
  schoolId: string;
  classesData: ClassItem[];
  subjectsData: SubjectItem[];
  academicYearsData: AcademicYearItem[];
}) {
  return (
    <FilterableDataTable
      data={rows}
      columns={[
        { header: "Class", accessor: "class_name" },
        { header: "Subject", accessor: "subject_name" },
        { header: "Academic Year", accessor: "academic_year" },
        {
          header: "File",
          accessor: (row: SyllabusRow) =>
            row.file_url ? (
              <a
                href={row.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline hover:text-blue-800"
              >
                View
              </a>
            ) : (
              "—"
            ),
        },
      ]}
      searchKeys={["class_name", "subject_name"]}
      searchPlaceholder="Search by class or subject..."
      filter={
        yearFilterOptions.length > 0
          ? {
              label: "All Years",
              options: yearFilterOptions,
              filterFn: (row: SyllabusRow, value: string) =>
                row.academic_year === value,
            }
          : undefined
      }
      emptyState={
        <EmptyState
          icon={Upload}
          title="No syllabus files yet"
          description="Upload syllabus PDFs for each class and subject."
          action={
            <UploadSyllabusDialog
              schoolId={schoolId}
              classes={classesData}
              subjects={subjectsData}
              academicYears={academicYearsData}
            />
          }
        />
      }
    />
  );
}
