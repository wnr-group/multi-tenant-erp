"use client";
import { ActionDialog } from "@/components/action-dialog";
import { AddStudentForm } from "./add-student-form";

export function AddStudentDialog({
  schoolId,
  classes,
}: {
  schoolId: string;
  classes: { id: string; name: string }[];
}) {
  return (
    <ActionDialog trigger="+ Add Student" title="Add Student">
      {(onSuccess) => (
        <AddStudentForm schoolId={schoolId} classes={classes} onSuccess={onSuccess} />
      )}
    </ActionDialog>
  );
}
