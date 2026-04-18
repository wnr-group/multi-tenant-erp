-- Allow school_admin to update their own school (for settings page)
DROP POLICY IF EXISTS "schools_update" ON public.schools;

CREATE POLICY "schools_update" ON public.schools FOR UPDATE
  USING (
    public.get_my_role() = 'super_admin'
    OR (
      public.get_my_role() = 'school_admin'
      AND id = public.get_my_school_id()
    )
  )
  WITH CHECK (
    public.get_my_role() = 'super_admin'
    OR (
      public.get_my_role() = 'school_admin'
      AND id = public.get_my_school_id()
    )
  );
