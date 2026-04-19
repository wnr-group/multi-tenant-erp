"use client";
import { BookOpen } from "lucide-react";
import { FilterableDataTable } from "@/components/filterable-data-table";
import { EmptyState } from "@/components/empty-state";
import { AddSubjectDialog } from "./add-subject-dialog";

interface SubjectRow {
  id: string;
  name: string;
  code: string;
  class_name: string;
}

interface ClassItem {
  id: string;
  name: string;
}

interface ClassFilterOption {
  value: string;
  label: string;
}

export function SubjectsTable({
  rows,
  classFilterOptions,
  schoolId,
  classesData,
}: {
  rows: SubjectRow[];
  classFilterOptions: ClassFilterOption[];
  schoolId: string;
  classesData: ClassItem[];
}) {
  return (
    <FilterableDataTable
      data={rows}
      columns={[
        { header: "Subject", accessor: "name" },
        { header: "Code", accessor: "code" },
        { header: "Class", accessor: "class_name" },
      ]}
      searchKeys={["name", "code"]}
      searchPlaceholder="Search subjects..."
      filter={
        classFilterOptions.length > 0
          ? {
              label: "All Classes",
              options: classFilterOptions,
              filterFn: (row: SubjectRow, value: string) =>
                row.class_name === value,
            }
          : undefined
      }
      emptyState={
        <EmptyState
          icon={BookOpen}
          title="No subjects yet"
          description="Add subjects so teachers can assign homework and enter marks."
          action={<AddSubjectDialog schoolId={schoolId} classes={classesData} />}
        />
      }
    />
  );
}
