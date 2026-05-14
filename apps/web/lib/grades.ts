export interface GradeInfo {
  grade: string;
  label: string;
}

const GRADE_SCALE = [
  { min: 91, grade: "A+", label: "Outstanding" },
  { min: 81, grade: "A", label: "Excellent" },
  { min: 71, grade: "B+", label: "Very Good" },
  { min: 61, grade: "B", label: "Good" },
  { min: 51, grade: "C+", label: "Above Average" },
  { min: 41, grade: "C", label: "Average" },
  { min: 33, grade: "D", label: "Below Average" },
  { min: 0, grade: "F", label: "Fail" },
];

export function getGrade(percentage: number): GradeInfo {
  for (const entry of GRADE_SCALE) {
    if (percentage >= entry.min) {
      return { grade: entry.grade, label: entry.label };
    }
  }
  return { grade: "F", label: "Fail" };
}
