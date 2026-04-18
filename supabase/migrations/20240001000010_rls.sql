-- Helper function: get the caller's school_id from user_roles
CREATE OR REPLACE FUNCTION public.get_my_school_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT school_id FROM public.user_roles
  WHERE user_id = auth.uid() AND is_active = true
  LIMIT 1;
$$;

-- Helper function: get the caller's role
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = auth.uid() AND is_active = true
  LIMIT 1;
$$;

-- Enable RLS on all tables
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syllabus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_card_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discipline_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- SCHOOLS: super_admin sees all; school users see own school
CREATE POLICY "schools_select" ON public.schools FOR SELECT
  USING (
    public.get_my_role() = 'super_admin'
    OR id = public.get_my_school_id()
  );
CREATE POLICY "schools_insert" ON public.schools FOR INSERT
  WITH CHECK (public.get_my_role() = 'super_admin');
CREATE POLICY "schools_update" ON public.schools FOR UPDATE
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

-- USER_ROLES: users can read their own role; super_admin reads all
CREATE POLICY "user_roles_select" ON public.user_roles FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.get_my_role() = 'super_admin'
    OR school_id = public.get_my_school_id()
  );
CREATE POLICY "user_roles_insert" ON public.user_roles FOR INSERT
  WITH CHECK (
    public.get_my_role() IN ('super_admin', 'school_admin')
  );
CREATE POLICY "user_roles_update" ON public.user_roles FOR UPDATE
  USING (public.get_my_role() IN ('super_admin', 'school_admin'))
  WITH CHECK (public.get_my_role() IN ('super_admin', 'school_admin') AND school_id = public.get_my_school_id());

-- PROFILES: users read own profile; school users read profiles in same school
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT
  USING (
    id = auth.uid()
    OR public.get_my_role() = 'super_admin'
    OR school_id = public.get_my_school_id()
  );
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE
  USING (id = auth.uid() OR public.get_my_role() IN ('super_admin', 'school_admin'));

-- profiles INSERT: handled by handle_new_user() trigger (SECURITY DEFINER),
-- but also allow users to insert their own row as a safety fallback
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- ACADEMIC_YEARS, CLASSES, SECTIONS, SUBJECTS — school_admin manages, all school users read
CREATE POLICY "academic_years_select" ON public.academic_years FOR SELECT
  USING (public.get_my_role() = 'super_admin' OR school_id = public.get_my_school_id());
CREATE POLICY "academic_years_write" ON public.academic_years FOR ALL
  USING (public.get_my_role() IN ('super_admin', 'school_admin') AND school_id = public.get_my_school_id())
  WITH CHECK (public.get_my_role() IN ('super_admin', 'school_admin') AND school_id = public.get_my_school_id());

CREATE POLICY "classes_select" ON public.classes FOR SELECT
  USING (public.get_my_role() = 'super_admin' OR school_id = public.get_my_school_id());
CREATE POLICY "classes_write" ON public.classes FOR ALL
  USING (public.get_my_role() IN ('super_admin', 'school_admin') AND school_id = public.get_my_school_id())
  WITH CHECK (public.get_my_role() IN ('super_admin', 'school_admin') AND school_id = public.get_my_school_id());

CREATE POLICY "sections_select" ON public.sections FOR SELECT
  USING (public.get_my_role() = 'super_admin' OR school_id = public.get_my_school_id());
CREATE POLICY "sections_write" ON public.sections FOR ALL
  USING (public.get_my_role() IN ('super_admin', 'school_admin') AND school_id = public.get_my_school_id())
  WITH CHECK (public.get_my_role() IN ('super_admin', 'school_admin') AND school_id = public.get_my_school_id());

CREATE POLICY "subjects_select" ON public.subjects FOR SELECT
  USING (public.get_my_role() = 'super_admin' OR school_id = public.get_my_school_id());
CREATE POLICY "subjects_write" ON public.subjects FOR ALL
  USING (public.get_my_role() IN ('super_admin', 'school_admin') AND school_id = public.get_my_school_id())
  WITH CHECK (public.get_my_role() IN ('super_admin', 'school_admin') AND school_id = public.get_my_school_id());

-- STUDENT_PROFILES, TEACHER_PROFILES
CREATE POLICY "student_profiles_select" ON public.student_profiles FOR SELECT
  USING (public.get_my_role() = 'super_admin' OR school_id = public.get_my_school_id());
CREATE POLICY "student_profiles_write" ON public.student_profiles FOR ALL
  USING (public.get_my_role() IN ('super_admin', 'school_admin') AND school_id = public.get_my_school_id())
  WITH CHECK (public.get_my_role() IN ('super_admin', 'school_admin') AND school_id = public.get_my_school_id());

CREATE POLICY "teacher_profiles_select" ON public.teacher_profiles FOR SELECT
  USING (public.get_my_role() = 'super_admin' OR school_id = public.get_my_school_id());
CREATE POLICY "teacher_profiles_write" ON public.teacher_profiles FOR ALL
  USING (public.get_my_role() IN ('super_admin', 'school_admin') AND school_id = public.get_my_school_id())
  WITH CHECK (public.get_my_role() IN ('super_admin', 'school_admin') AND school_id = public.get_my_school_id());

-- ATTENDANCE: teachers write; school users read
CREATE POLICY "attendance_select" ON public.attendance_records FOR SELECT
  USING (public.get_my_role() = 'super_admin' OR school_id = public.get_my_school_id());
CREATE POLICY "attendance_write" ON public.attendance_records FOR ALL
  USING (public.get_my_role() IN ('super_admin', 'school_admin', 'principal', 'teacher') AND school_id = public.get_my_school_id())
  WITH CHECK (public.get_my_role() IN ('super_admin', 'school_admin', 'principal', 'teacher') AND school_id = public.get_my_school_id());

-- HOMEWORK: teachers write; all school users read
CREATE POLICY "homework_select" ON public.homework FOR SELECT
  USING (public.get_my_role() = 'super_admin' OR school_id = public.get_my_school_id());
CREATE POLICY "homework_write" ON public.homework FOR ALL
  USING (public.get_my_role() IN ('super_admin', 'school_admin', 'teacher') AND school_id = public.get_my_school_id())
  WITH CHECK (public.get_my_role() IN ('super_admin', 'school_admin', 'teacher') AND school_id = public.get_my_school_id());

-- SYLLABUS: teachers/admin write; all read
CREATE POLICY "syllabus_select" ON public.syllabus FOR SELECT
  USING (public.get_my_role() = 'super_admin' OR school_id = public.get_my_school_id());
CREATE POLICY "syllabus_write" ON public.syllabus FOR ALL
  USING (public.get_my_role() IN ('super_admin', 'school_admin', 'teacher') AND school_id = public.get_my_school_id())
  WITH CHECK (public.get_my_role() IN ('super_admin', 'school_admin', 'teacher') AND school_id = public.get_my_school_id());

-- TIMETABLE: admin manages; all school users read
CREATE POLICY "timetable_select" ON public.timetable FOR SELECT
  USING (public.get_my_role() = 'super_admin' OR school_id = public.get_my_school_id());
CREATE POLICY "timetable_write" ON public.timetable FOR ALL
  USING (public.get_my_role() IN ('super_admin', 'school_admin') AND school_id = public.get_my_school_id())
  WITH CHECK (public.get_my_role() IN ('super_admin', 'school_admin') AND school_id = public.get_my_school_id());

-- EXAMS: admin/principal manage; all school users read
CREATE POLICY "exams_select" ON public.exams FOR SELECT
  USING (public.get_my_role() = 'super_admin' OR school_id = public.get_my_school_id());
CREATE POLICY "exams_write" ON public.exams FOR ALL
  USING (public.get_my_role() IN ('super_admin', 'school_admin', 'principal') AND school_id = public.get_my_school_id())
  WITH CHECK (public.get_my_role() IN ('super_admin', 'school_admin', 'principal') AND school_id = public.get_my_school_id());

-- EXAM_RESULTS: teachers write; all school users read
CREATE POLICY "exam_results_select" ON public.exam_results FOR SELECT
  USING (public.get_my_role() = 'super_admin' OR school_id = public.get_my_school_id());
CREATE POLICY "exam_results_write" ON public.exam_results FOR ALL
  USING (public.get_my_role() IN ('super_admin', 'school_admin', 'principal', 'teacher') AND school_id = public.get_my_school_id())
  WITH CHECK (public.get_my_role() IN ('super_admin', 'school_admin', 'principal', 'teacher') AND school_id = public.get_my_school_id());

-- REPORT_CARD_TEMPLATES: admin manages; all school users read
CREATE POLICY "report_card_templates_select" ON public.report_card_templates FOR SELECT
  USING (public.get_my_role() = 'super_admin' OR school_id = public.get_my_school_id());
CREATE POLICY "report_card_templates_write" ON public.report_card_templates FOR ALL
  USING (public.get_my_role() IN ('super_admin', 'school_admin') AND school_id = public.get_my_school_id())
  WITH CHECK (public.get_my_role() IN ('super_admin', 'school_admin') AND school_id = public.get_my_school_id());

-- FEES: admin manages; all school users read
CREATE POLICY "fee_structures_select" ON public.fee_structures FOR SELECT
  USING (public.get_my_role() = 'super_admin' OR school_id = public.get_my_school_id());
CREATE POLICY "fee_structures_write" ON public.fee_structures FOR ALL
  USING (public.get_my_role() IN ('super_admin', 'school_admin') AND school_id = public.get_my_school_id())
  WITH CHECK (public.get_my_role() IN ('super_admin', 'school_admin') AND school_id = public.get_my_school_id());

CREATE POLICY "fee_payments_select" ON public.fee_payments FOR SELECT
  USING (public.get_my_role() = 'super_admin' OR school_id = public.get_my_school_id());
CREATE POLICY "fee_payments_write" ON public.fee_payments FOR ALL
  USING (public.get_my_role() IN ('super_admin', 'school_admin') AND school_id = public.get_my_school_id())
  WITH CHECK (public.get_my_role() IN ('super_admin', 'school_admin') AND school_id = public.get_my_school_id());

-- ANNOUNCEMENTS: admin/principal create; all school users read
CREATE POLICY "announcements_select" ON public.announcements FOR SELECT
  USING (public.get_my_role() = 'super_admin' OR school_id = public.get_my_school_id());
CREATE POLICY "announcements_write" ON public.announcements FOR ALL
  USING (public.get_my_role() IN ('super_admin', 'school_admin', 'principal') AND school_id = public.get_my_school_id())
  WITH CHECK (public.get_my_role() IN ('super_admin', 'school_admin', 'principal') AND school_id = public.get_my_school_id());

-- NOTIFICATIONS: users read own; system inserts
CREATE POLICY "notifications_select" ON public.notifications FOR SELECT
  USING (user_id = auth.uid() OR public.get_my_role() IN ('super_admin', 'school_admin'));
CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT
  WITH CHECK (school_id = public.get_my_school_id() OR public.get_my_role() = 'super_admin');

-- FEEDBACK: parents/students create; teachers/admin read+respond
CREATE POLICY "feedback_select" ON public.feedback FOR SELECT
  USING (
    from_user_id = auth.uid()
    OR public.get_my_role() = 'super_admin'
    OR (
      public.get_my_role() IN ('school_admin', 'principal', 'teacher')
      AND school_id = public.get_my_school_id()
    )
  );
CREATE POLICY "feedback_insert" ON public.feedback FOR INSERT
  WITH CHECK (school_id = public.get_my_school_id());
CREATE POLICY "feedback_update" ON public.feedback FOR UPDATE
  USING (public.get_my_role() IN ('super_admin', 'school_admin', 'principal', 'teacher'));

-- DISCIPLINE: teachers/principal create; admin/principal read all
CREATE POLICY "discipline_select" ON public.discipline_records FOR SELECT
  USING (
    public.get_my_role() IN ('super_admin', 'school_admin', 'principal', 'teacher')
    AND school_id = public.get_my_school_id()
  );
CREATE POLICY "discipline_write" ON public.discipline_records FOR ALL
  USING (public.get_my_role() IN ('super_admin', 'school_admin', 'principal', 'teacher') AND school_id = public.get_my_school_id())
  WITH CHECK (public.get_my_role() IN ('super_admin', 'school_admin', 'principal', 'teacher') AND school_id = public.get_my_school_id());

-- AUDIT_LOG: super_admin reads all; school_admin + principal read own school; no delete
CREATE POLICY "audit_log_select" ON public.audit_log FOR SELECT
  USING (
    public.get_my_role() = 'super_admin'
    OR (
      public.get_my_role() IN ('school_admin', 'principal')
      AND school_id = public.get_my_school_id()
    )
  );

CREATE POLICY "audit_log_insert" ON public.audit_log FOR INSERT
  WITH CHECK (performed_by = auth.uid());
