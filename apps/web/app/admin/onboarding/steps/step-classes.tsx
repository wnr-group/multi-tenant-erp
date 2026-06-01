"use client";

import { ClassesQuickSetup } from "@/app/(school)/admin/classes/classes-quick-setup";

export function StepClasses({
  schoolId,
  academicYearId,
  brandColor,
  onComplete,
  onSkip,
}: {
  schoolId: string;
  academicYearId: string;
  brandColor: string;
  onComplete: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white p-8 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground">Set Up Classes & Sections</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Select the classes your school runs. Sections like A, B, C will be created for each.
          </p>
        </div>
        <ClassesQuickSetup
          schoolId={schoolId}
          academicYearId={academicYearId}
          onAfterCreate={onComplete}
        />
      </div>
      <div className="text-center">
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-muted-foreground underline hover:text-foreground"
        >
          I'll set this up later
        </button>
      </div>
    </div>
  );
}
