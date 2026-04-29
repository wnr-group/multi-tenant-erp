-- Allow teachers to record fee payments (insert/update) for students in their school
DROP POLICY IF EXISTS "fee_payments_write" ON public.fee_payments;
CREATE POLICY "fee_payments_write" ON public.fee_payments FOR ALL
  USING (
    public.get_my_role() = 'super_admin'
    OR (public.get_my_role() IN ('school_admin', 'principal', 'teacher') AND school_id = public.get_my_school_id())
  )
  WITH CHECK (
    public.get_my_role() = 'super_admin'
    OR (public.get_my_role() IN ('school_admin', 'principal', 'teacher') AND school_id = public.get_my_school_id())
  );
