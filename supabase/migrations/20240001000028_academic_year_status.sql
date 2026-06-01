ALTER TABLE public.academic_years
  DROP COLUMN IF EXISTS is_current,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'archived'));

-- Only one active year per school at a time
CREATE UNIQUE INDEX idx_academic_years_one_active
  ON public.academic_years (school_id)
  WHERE status = 'active';
