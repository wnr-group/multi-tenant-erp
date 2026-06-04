-- Fix bonafide_certificates RLS policies to let super_admin bypass school_id check
DROP POLICY IF EXISTS "bonafide_read" ON public.bonafide_certificates;
DROP POLICY IF EXISTS "bonafide_insert" ON public.bonafide_certificates;

CREATE POLICY "bonafide_read" ON public.bonafide_certificates FOR SELECT
  USING (
    public.get_my_role() = 'super_admin'
    OR (public.get_my_role() IN ('school_admin', 'principal') AND school_id = public.get_my_school_id())
  );

CREATE POLICY "bonafide_insert" ON public.bonafide_certificates FOR INSERT
  WITH CHECK (
    public.get_my_role() = 'super_admin'
    OR (public.get_my_role() IN ('school_admin', 'principal') AND school_id = public.get_my_school_id())
  );
