-- Allow parents to read discipline records for their own child only
CREATE POLICY "discipline_parent_select" ON public.discipline_records FOR SELECT
  USING (
    public.get_my_role() = 'parent'
    AND student_id IN (
      SELECT id FROM public.student_profiles
      WHERE parent_profile_id = auth.uid()
    )
  );
