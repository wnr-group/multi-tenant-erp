-- Fix: super_admin should bypass school_id check on all write policies
-- Previously: get_my_role() IN ('super_admin', 'school_admin') AND school_id = get_my_school_id()
-- Fixed:      get_my_role() = 'super_admin' OR (get_my_role() IN (...) AND school_id = get_my_school_id())

-- CLASSES
DROP POLICY IF EXISTS "classes_write" ON public.classes;
CREATE POLICY "classes_write" ON public.classes FOR ALL
  USING (public.get_my_role() = 'super_admin' OR (public.get_my_role() = 'school_admin' AND school_id = public.get_my_school_id()))
  WITH CHECK (public.get_my_role() = 'super_admin' OR (public.get_my_role() = 'school_admin' AND school_id = public.get_my_school_id()));

-- SECTIONS
DROP POLICY IF EXISTS "sections_write" ON public.sections;
CREATE POLICY "sections_write" ON public.sections FOR ALL
  USING (public.get_my_role() = 'super_admin' OR (public.get_my_role() = 'school_admin' AND school_id = public.get_my_school_id()))
  WITH CHECK (public.get_my_role() = 'super_admin' OR (public.get_my_role() = 'school_admin' AND school_id = public.get_my_school_id()));

-- SUBJECTS
DROP POLICY IF EXISTS "subjects_write" ON public.subjects;
CREATE POLICY "subjects_write" ON public.subjects FOR ALL
  USING (public.get_my_role() = 'super_admin' OR (public.get_my_role() = 'school_admin' AND school_id = public.get_my_school_id()))
  WITH CHECK (public.get_my_role() = 'super_admin' OR (public.get_my_role() = 'school_admin' AND school_id = public.get_my_school_id()));

-- ACADEMIC_YEARS
DROP POLICY IF EXISTS "academic_years_write" ON public.academic_years;
CREATE POLICY "academic_years_write" ON public.academic_years FOR ALL
  USING (public.get_my_role() = 'super_admin' OR (public.get_my_role() = 'school_admin' AND school_id = public.get_my_school_id()))
  WITH CHECK (public.get_my_role() = 'super_admin' OR (public.get_my_role() = 'school_admin' AND school_id = public.get_my_school_id()));

-- STUDENT_PROFILES
DROP POLICY IF EXISTS "student_profiles_write" ON public.student_profiles;
CREATE POLICY "student_profiles_write" ON public.student_profiles FOR ALL
  USING (public.get_my_role() = 'super_admin' OR (public.get_my_role() = 'school_admin' AND school_id = public.get_my_school_id()))
  WITH CHECK (public.get_my_role() = 'super_admin' OR (public.get_my_role() = 'school_admin' AND school_id = public.get_my_school_id()));

-- TEACHER_PROFILES
DROP POLICY IF EXISTS "teacher_profiles_write" ON public.teacher_profiles;
CREATE POLICY "teacher_profiles_write" ON public.teacher_profiles FOR ALL
  USING (public.get_my_role() = 'super_admin' OR (public.get_my_role() = 'school_admin' AND school_id = public.get_my_school_id()))
  WITH CHECK (public.get_my_role() = 'super_admin' OR (public.get_my_role() = 'school_admin' AND school_id = public.get_my_school_id()));

-- TIMETABLE
DROP POLICY IF EXISTS "timetable_write" ON public.timetable;
CREATE POLICY "timetable_write" ON public.timetable FOR ALL
  USING (public.get_my_role() = 'super_admin' OR (public.get_my_role() = 'school_admin' AND school_id = public.get_my_school_id()))
  WITH CHECK (public.get_my_role() = 'super_admin' OR (public.get_my_role() = 'school_admin' AND school_id = public.get_my_school_id()));

-- EXAMS
DROP POLICY IF EXISTS "exams_write" ON public.exams;
CREATE POLICY "exams_write" ON public.exams FOR ALL
  USING (public.get_my_role() = 'super_admin' OR (public.get_my_role() IN ('school_admin', 'principal') AND school_id = public.get_my_school_id()))
  WITH CHECK (public.get_my_role() = 'super_admin' OR (public.get_my_role() IN ('school_admin', 'principal') AND school_id = public.get_my_school_id()));

-- REPORT_CARD_TEMPLATES
DROP POLICY IF EXISTS "report_card_templates_write" ON public.report_card_templates;
CREATE POLICY "report_card_templates_write" ON public.report_card_templates FOR ALL
  USING (public.get_my_role() = 'super_admin' OR (public.get_my_role() = 'school_admin' AND school_id = public.get_my_school_id()))
  WITH CHECK (public.get_my_role() = 'super_admin' OR (public.get_my_role() = 'school_admin' AND school_id = public.get_my_school_id()));

-- FEE_STRUCTURES
DROP POLICY IF EXISTS "fee_structures_write" ON public.fee_structures;
CREATE POLICY "fee_structures_write" ON public.fee_structures FOR ALL
  USING (public.get_my_role() = 'super_admin' OR (public.get_my_role() = 'school_admin' AND school_id = public.get_my_school_id()))
  WITH CHECK (public.get_my_role() = 'super_admin' OR (public.get_my_role() = 'school_admin' AND school_id = public.get_my_school_id()));

-- FEE_PAYMENTS
DROP POLICY IF EXISTS "fee_payments_write" ON public.fee_payments;
CREATE POLICY "fee_payments_write" ON public.fee_payments FOR ALL
  USING (public.get_my_role() = 'super_admin' OR (public.get_my_role() = 'school_admin' AND school_id = public.get_my_school_id()))
  WITH CHECK (public.get_my_role() = 'super_admin' OR (public.get_my_role() = 'school_admin' AND school_id = public.get_my_school_id()));

-- ATTENDANCE
DROP POLICY IF EXISTS "attendance_write" ON public.attendance_records;
CREATE POLICY "attendance_write" ON public.attendance_records FOR ALL
  USING (public.get_my_role() = 'super_admin' OR (public.get_my_role() IN ('school_admin', 'principal', 'teacher') AND school_id = public.get_my_school_id()))
  WITH CHECK (public.get_my_role() = 'super_admin' OR (public.get_my_role() IN ('school_admin', 'principal', 'teacher') AND school_id = public.get_my_school_id()));

-- HOMEWORK
DROP POLICY IF EXISTS "homework_write" ON public.homework;
CREATE POLICY "homework_write" ON public.homework FOR ALL
  USING (public.get_my_role() = 'super_admin' OR (public.get_my_role() IN ('school_admin', 'teacher') AND school_id = public.get_my_school_id()))
  WITH CHECK (public.get_my_role() = 'super_admin' OR (public.get_my_role() IN ('school_admin', 'teacher') AND school_id = public.get_my_school_id()));

-- SYLLABUS
DROP POLICY IF EXISTS "syllabus_write" ON public.syllabus;
CREATE POLICY "syllabus_write" ON public.syllabus FOR ALL
  USING (public.get_my_role() = 'super_admin' OR (public.get_my_role() IN ('school_admin', 'teacher') AND school_id = public.get_my_school_id()))
  WITH CHECK (public.get_my_role() = 'super_admin' OR (public.get_my_role() IN ('school_admin', 'teacher') AND school_id = public.get_my_school_id()));

-- EXAM_RESULTS
DROP POLICY IF EXISTS "exam_results_write" ON public.exam_results;
CREATE POLICY "exam_results_write" ON public.exam_results FOR ALL
  USING (public.get_my_role() = 'super_admin' OR (public.get_my_role() IN ('school_admin', 'principal', 'teacher') AND school_id = public.get_my_school_id()))
  WITH CHECK (public.get_my_role() = 'super_admin' OR (public.get_my_role() IN ('school_admin', 'principal', 'teacher') AND school_id = public.get_my_school_id()));

-- ANNOUNCEMENTS
DROP POLICY IF EXISTS "announcements_write" ON public.announcements;
CREATE POLICY "announcements_write" ON public.announcements FOR ALL
  USING (public.get_my_role() = 'super_admin' OR (public.get_my_role() IN ('school_admin', 'principal') AND school_id = public.get_my_school_id()))
  WITH CHECK (public.get_my_role() = 'super_admin' OR (public.get_my_role() IN ('school_admin', 'principal') AND school_id = public.get_my_school_id()));

-- DISCIPLINE
DROP POLICY IF EXISTS "discipline_write" ON public.discipline_records;
CREATE POLICY "discipline_write" ON public.discipline_records FOR ALL
  USING (public.get_my_role() = 'super_admin' OR (public.get_my_role() IN ('school_admin', 'principal', 'teacher') AND school_id = public.get_my_school_id()))
  WITH CHECK (public.get_my_role() = 'super_admin' OR (public.get_my_role() IN ('school_admin', 'principal', 'teacher') AND school_id = public.get_my_school_id()));
