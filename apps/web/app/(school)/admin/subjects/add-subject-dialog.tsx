"use client";
import { ActionDialog } from "@/components/action-dialog";
import { AddSubjectForm } from "./add-subject-form";

export function AddSubjectDialog({
  schoolId,
  classes,
}: {
  schoolId: string;
  classes: { id: string; name: string }[];
}) {
  return (
    <ActionDialog trigger="+ Add Subject" title="Add Subject">
      {(onSuccess) => (
        <AddSubjectForm schoolId={schoolId} classes={classes} onSuccess={onSuccess} />
      )}
    </ActionDialog>
  );
}
