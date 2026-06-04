-- Add new columns to student_profiles for bonafide certificate support
ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS parent_name   TEXT,
  ADD COLUMN IF NOT EXISTS gender        TEXT CHECK (gender IN ('male', 'female', 'other'));

-- Create bonafide_certificates audit log table
CREATE TABLE public.bonafide_certificates (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id          UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_profile_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  academic_year_id   UUID NOT NULL REFERENCES public.academic_years(id),
  generated_by       UUID NOT NULL REFERENCES auth.users(id),
  generated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for efficient queries
CREATE INDEX idx_bonafide_school ON public.bonafide_certificates(school_id);
CREATE INDEX idx_bonafide_student ON public.bonafide_certificates(student_profile_id);

-- Enable Row Level Security
ALTER TABLE public.bonafide_certificates ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Read access for school admins, principals, and super admins
CREATE POLICY "bonafide_read" ON public.bonafide_certificates FOR SELECT
  USING (
    public.get_my_role() IN ('school_admin', 'principal', 'super_admin')
    AND school_id = public.get_my_school_id()
  );

-- RLS Policy: Insert access for school admins, principals, and super admins
CREATE POLICY "bonafide_insert" ON public.bonafide_certificates FOR INSERT
  WITH CHECK (
    public.get_my_role() IN ('school_admin', 'principal', 'super_admin')
    AND school_id = public.get_my_school_id()
  );
