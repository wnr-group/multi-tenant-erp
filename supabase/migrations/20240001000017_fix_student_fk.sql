-- Students are data-only records (migration 16). Fix FK references from
-- profiles(id) → student_profiles(id) on all tables that record per-student data.

-- fee_payments
ALTER TABLE public.fee_payments
  DROP CONSTRAINT fee_payments_student_id_fkey;

ALTER TABLE public.fee_payments
  ADD CONSTRAINT fee_payments_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES public.student_profiles(id) ON DELETE CASCADE;

-- attendance_records
ALTER TABLE public.attendance_records
  DROP CONSTRAINT attendance_records_student_id_fkey;

ALTER TABLE public.attendance_records
  ADD CONSTRAINT attendance_records_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES public.student_profiles(id) ON DELETE CASCADE;

-- exam_results
ALTER TABLE public.exam_results
  DROP CONSTRAINT exam_results_student_id_fkey;

ALTER TABLE public.exam_results
  ADD CONSTRAINT exam_results_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES public.student_profiles(id) ON DELETE CASCADE;
