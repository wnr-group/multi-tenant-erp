"use client";
import { Megaphone } from "lucide-react";
import { FilterableDataTable } from "@/components/filterable-data-table";
import { EmptyState } from "@/components/empty-state";
import { CreateAnnouncementDialog } from "./create-announcement-dialog";

interface AnnouncementRow {
  id: string;
  title: string;
  target_type: string;
  date: string;
  created_at: string;
}

export function AnnouncementsTable({
  rows,
  schoolId,
  userId,
}: {
  rows: AnnouncementRow[];
  schoolId: string;
  userId: string;
}) {
  return (
    <FilterableDataTable
      data={rows}
      columns={[
        { header: "Title", accessor: "title" },
        { header: "Target", accessor: "target_type" },
        { header: "Date", accessor: "date" },
      ]}
      searchKeys={["title"]}
      searchPlaceholder="Search by title…"
      filter={{
        label: "All Targets",
        options: [
          { label: "School", value: "school" },
          { label: "Students", value: "students" },
          { label: "Teachers", value: "teachers" },
        ],
        filterFn: (row: AnnouncementRow, value: string) =>
          row.target_type === value,
      }}
      emptyState={
        <EmptyState
          icon={Megaphone}
          title="No announcements yet"
          description="Post your first announcement to reach your school community."
          action={
            <CreateAnnouncementDialog schoolId={schoolId} createdBy={userId} />
          }
        />
      }
    />
  );
}
