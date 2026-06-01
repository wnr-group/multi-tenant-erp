-- Add academic_year_id to sections
ALTER TABLE public.sections
  ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_sections_academic_year ON public.sections(academic_year_id);

-- Add academic_year_id to timetable
ALTER TABLE public.timetable
  ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE CASCADE;

-- Drop old unique constraint, add year-scoped one
ALTER TABLE public.timetable
  DROP CONSTRAINT IF EXISTS timetable_section_id_day_of_week_period_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_timetable_section_year_day_period
  ON public.timetable(section_id, academic_year_id, day_of_week, period)
  WHERE academic_year_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_timetable_academic_year ON public.timetable(academic_year_id);

-- section_assignments: class teacher per section per year
CREATE TABLE IF NOT EXISTS public.section_assignments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id       UUID NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  class_teacher_id UUID NOT NULL REFERENCES auth.users(id),
  school_id        UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(section_id, academic_year_id)
);

CREATE INDEX IF NOT EXISTS idx_section_assignments_year ON public.section_assignments(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_section_assignments_school ON public.section_assignments(school_id);

-- Drop year-specific columns from teacher_profiles
ALTER TABLE public.teacher_profiles
  DROP COLUMN IF EXISTS class_teacher_of,
  DROP COLUMN IF EXISTS subjects;

-- RLS for section_assignments
ALTER TABLE public.section_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "section_assignments_read" ON public.section_assignments FOR SELECT
  USING (
    public.get_my_role() IN ('school_admin', 'principal', 'teacher', 'super_admin')
    AND school_id = public.get_my_school_id()
  );

CREATE POLICY "section_assignments_write" ON public.section_assignments FOR ALL
  USING (
    public.get_my_role() = 'super_admin'
    OR (public.get_my_role() = 'school_admin' AND school_id = public.get_my_school_id())
  )
  WITH CHECK (
    public.get_my_role() = 'super_admin'
    OR (public.get_my_role() = 'school_admin' AND school_id = public.get_my_school_id())
  );
