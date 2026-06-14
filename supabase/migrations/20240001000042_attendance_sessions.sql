-- FN/AN session support on attendance.
-- Full-day attendance = one row with session 'FULL_DAY'.
-- Forenoon/afternoon = up to two rows ('FN' and/or 'AN') per student per day.
-- The UI enforces that a given student-day uses only ONE granularity.

CREATE TYPE public.attendance_session AS ENUM ('FULL_DAY', 'FN', 'AN');

ALTER TABLE public.attendance_records
  ADD COLUMN session public.attendance_session NOT NULL DEFAULT 'FULL_DAY',
  ADD COLUMN notified_at TIMESTAMPTZ;

-- Swap the uniqueness from (student, date) to (student, date, session).
ALTER TABLE public.attendance_records
  DROP CONSTRAINT attendance_records_student_id_date_key;

ALTER TABLE public.attendance_records
  ADD CONSTRAINT attendance_records_student_date_session_key
  UNIQUE (student_id, date, session);

-- Supports overview counts and the per-section 7-day stats strip.
CREATE INDEX idx_attendance_section_date_session
  ON public.attendance_records (section_id, date, session);
