-- Allow parents to read their child's enrollments
CREATE POLICY "enrollments_parent_read" ON public.student_enrollments FOR SELECT
  USING (
    public.get_my_role() = 'parent'
    AND student_profile_id IN (
      SELECT id FROM public.student_profiles WHERE parent_profile_id = auth.uid()
    )
  );
