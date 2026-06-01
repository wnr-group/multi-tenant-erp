"use client";

import { useState } from "react";
import { GraduationCap, Check } from "lucide-react";
import { StepAcademicYear } from "./steps/step-academic-year";
import { StepClasses } from "./steps/step-classes";
import { StepTeachers } from "./steps/step-teachers";
import { StepStudents } from "./steps/step-students";
import { CompletionScreen } from "./completion-screen";

const STEPS = [
  { label: "Academic Year" },
  { label: "Classes & Sections" },
  { label: "Teachers" },
  { label: "Students" },
];

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
  const [step, setStep] = useState(initialStep);
  const [academicYearId, setAcademicYearId] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) return <CompletionScreen schoolName={schoolName} brandColor={brandColor} />;

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b bg-white px-8">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: brandColor }}
          >
            <GraduationCap className="h-[18px] w-[18px] text-white" />
          </div>
          <span className="text-sm font-semibold text-foreground">{schoolName}</span>
        </div>
      </header>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-0 border-b bg-white px-8 py-4">
        {STEPS.map((s, i) => {
          const num = i + 1;
          const isComplete = step > num;
          const isCurrent = step === num;
          return (
            <div key={s.label} className="flex items-center">
              {i > 0 && (
                <div className={`h-px w-12 ${isComplete || isCurrent ? "bg-indigo-600" : "bg-border"}`} />
              )}
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                    isComplete
                      ? "bg-indigo-600 text-white"
                      : isCurrent
                      ? "border-2 border-indigo-600 text-indigo-600"
                      : "border-2 border-border text-muted-foreground"
                  }`}
                >
                  {isComplete ? <Check className="h-4 w-4" /> : num}
                </div>
                <span className={`text-xs ${isCurrent ? "font-semibold text-indigo-600" : "text-muted-foreground"}`}>
                  {s.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <main className="flex flex-1 items-start justify-center px-4 py-10">
        <div className="w-full max-w-2xl">
          {step === 1 && (
            <StepAcademicYear
              schoolId={schoolId}
              brandColor={brandColor}
              onComplete={(yearId) => { setAcademicYearId(yearId); setStep(2); }}
            />
          )}
          {step === 2 && (
            <StepClasses
              schoolId={schoolId}
              academicYearId={academicYearId ?? ""}
              brandColor={brandColor}
              onComplete={() => setStep(3)}
              onSkip={() => setStep(3)}
            />
          )}
          {step === 3 && (
            <StepTeachers
              schoolId={schoolId}
              brandColor={brandColor}
              onComplete={() => setStep(4)}
              onSkip={() => setStep(4)}
            />
          )}
          {step === 4 && (
            <StepStudents
              schoolId={schoolId}
              academicYearId={academicYearId ?? ""}
              brandColor={brandColor}
              onComplete={() => setDone(true)}
              onSkip={() => setDone(true)}
            />
          )}
        </div>
      </main>
    </div>
  );
}
