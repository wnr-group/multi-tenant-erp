-- student_enrollments: one row per student per academic year
CREATE TABLE public.student_enrollments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_profile_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  academic_year_id   UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  school_id          UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id           UUID NOT NULL REFERENCES public.classes(id),
  section_id         UUID NOT NULL REFERENCES public.sections(id),
  roll_number        TEXT,
  is_active          BOOLEAN NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_profile_id, academic_year_id)
);

CREATE INDEX idx_student_enrollments_student ON public.student_enrollments(student_profile_id);
CREATE INDEX idx_student_enrollments_year ON public.student_enrollments(academic_year_id);
CREATE INDEX idx_student_enrollments_school ON public.student_enrollments(school_id);
CREATE INDEX idx_student_enrollments_section ON public.student_enrollments(section_id);
CREATE INDEX idx_student_enrollments_class ON public.student_enrollments(class_id);

-- Drop year-specific columns from student_profiles
ALTER TABLE public.student_profiles
  DROP COLUMN IF EXISTS class_id,
  DROP COLUMN IF EXISTS section_id,
  DROP COLUMN IF EXISTS roll_number;

-- RLS
ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "enrollments_read" ON public.student_enrollments FOR SELECT
  USING (
    public.get_my_role() IN ('school_admin', 'principal', 'teacher', 'super_admin')
    AND school_id = public.get_my_school_id()
  );

CREATE POLICY "enrollments_write" ON public.student_enrollments FOR ALL
  USING (
    public.get_my_role() = 'super_admin'
    OR (public.get_my_role() = 'school_admin' AND school_id = public.get_my_school_id())
  )
  WITH CHECK (
    public.get_my_role() = 'super_admin'
    OR (public.get_my_role() = 'school_admin' AND school_id = public.get_my_school_id())
  );
