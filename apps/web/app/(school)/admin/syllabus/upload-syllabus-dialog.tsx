"use client";
import { ActionDialog } from "@/components/action-dialog";
import { UploadSyllabusForm } from "./upload-syllabus-form";

export function UploadSyllabusDialog({
  schoolId,
  classes,
  subjects,
  academicYears,
}: {
  schoolId: string;
  classes: { id: string; name: string }[];
  subjects: { id: string; name: string; classId: string | null }[];
  academicYears: { id: string; name: string }[];
}) {
  return (
    <ActionDialog trigger="+ Upload Syllabus" title="Upload Syllabus">
      {(onSuccess) => (
        <UploadSyllabusForm
          schoolId={schoolId}
          classes={classes}
          subjects={subjects}
          academicYears={academicYears}
          onSuccess={onSuccess}
        />
      )}
    </ActionDialog>
  );
}
