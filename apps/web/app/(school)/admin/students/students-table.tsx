"use client";
import Link from "next/link";
import { GraduationCap, MoreHorizontal } from "lucide-react";
import { FilterableDataTable } from "@/components/filterable-data-table";
import { EmptyState } from "@/components/empty-state";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface StudentRow {
  id: string;
  name: string;
  roll: string;
  class_name: string;
  section: string;
  parent_phone: string;
}

interface ClassOption {
  label: string;
  value: string;
}

export function StudentsTable({
  rows,
  classFilterOptions,
}: {
  rows: StudentRow[];
  classFilterOptions: ClassOption[];
}) {
  return (
    <FilterableDataTable
      data={rows}
      columns={[
        { header: "Name", accessor: "name" },
        { header: "Roll No.", accessor: "roll" },
        { header: "Class", accessor: "class_name" },
        { header: "Section", accessor: "section" },
        { header: "Parent Phone", accessor: "parent_phone" },
      ]}
      searchKeys={["name", "roll"]}
      searchPlaceholder="Search by name or roll number…"
      filter={
        classFilterOptions.length > 0
          ? {
              label: "All Classes",
              options: classFilterOptions,
              filterFn: (row: StudentRow, value: string) =>
                row.class_name === value,
            }
          : undefined
      }
      renderActions={(row) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon-sm" aria-label="Row actions" />
            }
          >
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              render={<Link href={`/admin/students/${row.id}`} />}
            >
              View Profile
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      emptyState={
        <EmptyState
          icon={GraduationCap}
          title="No students yet"
          description="Add your first student to get started with enrollment."
        />
      }
    />
  );
}
