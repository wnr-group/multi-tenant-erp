-- Role enum
CREATE TYPE public.app_role AS ENUM (
  'super_admin',
  'school_admin',
  'principal',
  'teacher',
  'student',
  'parent'
);

-- Attendance status enum
CREATE TYPE public.attendance_status AS ENUM (
  'present',
  'absent',
  'late',
  'half_day'
);

-- Fee payment status enum
CREATE TYPE public.fee_payment_status AS ENUM (
  'paid',
  'partial',
  'overdue'
);

-- Feedback status enum
CREATE TYPE public.feedback_status AS ENUM (
  'open',
  'responded',
  'closed'
);

-- Discipline category enum
CREATE TYPE public.discipline_category AS ENUM (
  'behavioral',
  'academic',
  'attendance'
);

-- Discipline severity enum
CREATE TYPE public.discipline_severity AS ENUM (
  'verbal',
  'written',
  'suspension'
);

-- Announcement target enum
CREATE TYPE public.announcement_target_type AS ENUM (
  'school',
  'class',
  'section'
);
