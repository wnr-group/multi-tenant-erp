-- Add nullable to_user_id for directing feedback to a specific user (e.g. class teacher)
ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS to_user_id UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_feedback_to_user_id ON public.feedback(to_user_id);

-- Tighten teacher feedback_select: teachers only see feedback directed to them specifically
DROP POLICY IF EXISTS "feedback_select" ON public.feedback;

CREATE POLICY "feedback_select" ON public.feedback FOR SELECT
  USING (
    from_user_id = auth.uid()
    OR public.get_my_role() = 'super_admin'
    OR (
      public.get_my_role() IN ('school_admin', 'principal')
      AND school_id = public.get_my_school_id()
    )
    OR (
      public.get_my_role() = 'teacher'
      AND school_id = public.get_my_school_id()
      AND to_user_id = auth.uid()
    )
  );
