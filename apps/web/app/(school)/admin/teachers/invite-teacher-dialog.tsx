"use client";
import { ActionDialog } from "@/components/action-dialog";
import { InviteTeacherForm } from "./invite-teacher-form";

export function InviteTeacherDialog({ schoolId }: { schoolId: string }) {
  return (
    <ActionDialog trigger="+ Invite Teacher" title="Invite Teacher">
      {(onSuccess) => <InviteTeacherForm schoolId={schoolId} onSuccess={onSuccess} />}
    </ActionDialog>
  );
}
