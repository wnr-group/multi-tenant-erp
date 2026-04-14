export type Role =
  | "super_admin"
  | "school_admin"
  | "principal"
  | "teacher"
  | "student"
  | "parent";

export type AttendanceStatus = "present" | "absent" | "late" | "half_day";

export type FeePaymentStatus = "paid" | "partial" | "overdue";

export type FeedbackStatus = "open" | "responded" | "closed";

export type DisciplineCategory = "behavioral" | "academic" | "attendance";

export type DisciplineSeverity = "verbal" | "written" | "suspension";

export type AnnouncementTargetType = "school" | "class" | "section";

export interface UserSession {
  userId: string;
  schoolId: string | null;
  role: Role;
}
