"use client";
import { ActionDialog } from "@/components/action-dialog";
import { AddStudentForm } from "./add-student-form";

export function AddStudentDialog({
  schoolId,
  academicYearId,
  classes,
}: {
  schoolId: string;
  academicYearId: string;
  classes: { id: string; name: string }[];
}) {
  return (
    <ActionDialog trigger="+ Add Student" title="Add Student">
      {(onSuccess) => (
        <AddStudentForm schoolId={schoolId} academicYearId={academicYearId} classes={classes} onSuccess={onSuccess} />
      )}
    </ActionDialog>
  );
}
