-- Fix discipline_records.student_id FK: profiles(id) → student_profiles(id)
-- (companion to migration 17 which fixed fee_payments, attendance_records, exam_results)

ALTER TABLE public.discipline_records
  DROP CONSTRAINT discipline_records_student_id_fkey;

ALTER TABLE public.discipline_records
  ADD CONSTRAINT discipline_records_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES public.student_profiles(id) ON DELETE CASCADE;
