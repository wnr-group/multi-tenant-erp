"use client";
import { ActionDialog } from "@/components/action-dialog";
import { CreateAnnouncementForm } from "./create-announcement-form";

export function CreateAnnouncementDialog({
  schoolId,
  createdBy,
}: {
  schoolId: string;
  createdBy: string;
}) {
  return (
    <ActionDialog trigger="+ New Announcement" title="Create Announcement">
      {(onSuccess) => (
        <CreateAnnouncementForm
          schoolId={schoolId}
          createdBy={createdBy}
          onSuccess={onSuccess}
        />
      )}
    </ActionDialog>
  );
}
