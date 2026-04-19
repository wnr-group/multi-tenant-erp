"use client";
import { School } from "lucide-react";
import { FilterableDataTable } from "@/components/filterable-data-table";
import { EmptyState } from "@/components/empty-state";

interface ClassRow {
  id: string;
  name: string;
  order: number;
}

interface SectionRow {
  id: string;
  class_name: string;
  section_name: string;
}

export function ClassesDataTable({ classes }: { classes: ClassRow[] }) {
  return (
    <FilterableDataTable
      data={classes}
      columns={[
        { header: "Class Name", accessor: "name" },
        { header: "Order", accessor: "order" },
      ]}
      searchKeys={["name"]}
      searchPlaceholder="Search classes..."
      emptyState={
        <EmptyState
          icon={School}
          title="No classes yet"
          description="Add your first class to get started."
        />
      }
    />
  );
}

export function SectionsDataTable({ sectionRows }: { sectionRows: SectionRow[] }) {
  return (
    <FilterableDataTable
      data={sectionRows}
      columns={[
        { header: "Class", accessor: "class_name" },
        { header: "Section", accessor: "section_name" },
      ]}
      searchKeys={["class_name", "section_name"]}
      searchPlaceholder="Search sections..."
      emptyState={
        <EmptyState
          icon={School}
          title="No sections yet"
          description="Add sections after creating classes."
        />
      }
    />
  );
}
