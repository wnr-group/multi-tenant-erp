"use client";

export function WizardShell({
  schoolId,
  schoolName,
  brandColor,
  initialStep,
  classCount,
  teacherCount,
  studentCount,
}: {
  schoolId: string;
  schoolName: string;
  brandColor: string;
  initialStep: number;
  classCount: number;
  teacherCount: number;
  studentCount: number;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <p className="text-muted-foreground">Onboarding wizard loading… (stub)</p>
    </div>
  );
}
