"use client";
import { ActionDialog } from "@/components/action-dialog";
import { AddAcademicYearForm } from "./add-academic-year-form";
import { AddExamForm } from "./add-exam-form";

export function AddAcademicYearDialog({ schoolId }: { schoolId: string }) {
  return (
    <ActionDialog trigger="+ Add Academic Year" title="Add Academic Year">
      {(onSuccess) => <AddAcademicYearForm schoolId={schoolId} onSuccess={onSuccess} />}
    </ActionDialog>
  );
}

export function AddExamDialog({
  schoolId,
  academicYears,
}: {
  schoolId: string;
  academicYears: { id: string; name: string }[];
}) {
  return (
    <ActionDialog trigger="+ Add Exam" title="Add Exam">
      {(onSuccess) => (
        <AddExamForm schoolId={schoolId} academicYears={academicYears} onSuccess={onSuccess} />
      )}
    </ActionDialog>
  );
}
