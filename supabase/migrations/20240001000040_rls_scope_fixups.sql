-- RLS scope fixups after validated-scope rework.
--
-- Context: get_my_school_id() now returns the VALIDATED active school from the
-- scope_pre_request hook. For a super_admin acting without an x-school-id header,
-- get_my_school_id() returns NULL and get_my_role() returns 'super_admin'.
-- Consequently any policy of the form
--   get_my_role() IN (..., 'super_admin') AND school_id = get_my_school_id()
-- now DENIES super_admin (NULL = school_id is never true). This migration adds an
-- explicit super_admin bypass to those policies and restores school-peer profile
-- reads in a school-agnostic way (profiles no longer has a school_id column).

-- ---------------------------------------------------------------------------
-- Part B.2 — profiles_select: restore school-peer reads via user_roles join.
-- A caller may read a profile if it is their own, if they are super_admin, or if
-- they share their VALIDATED active school with that profile's owner.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT
  USING (
    id = auth.uid()
    OR public.get_my_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = public.profiles.id
        AND ur.school_id = public.get_my_school_id()
        AND ur.is_active = true
    )
  );

-- ---------------------------------------------------------------------------
-- Part B.1 — school_gallery: super_admin must be able to manage gallery.
-- gallery_admin_all gated super_admin behind school_id = get_my_school_id().
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "gallery_admin_all" ON public.school_gallery;
CREATE POLICY "gallery_admin_all" ON public.school_gallery FOR ALL
  USING (
    public.get_my_role() = 'super_admin'
    OR (
      public.get_my_role() IN ('super_admin', 'school_admin', 'principal')
      AND school_id = public.get_my_school_id()
    )
  )
  WITH CHECK (
    public.get_my_role() = 'super_admin'
    OR (
      public.get_my_role() IN ('super_admin', 'school_admin', 'principal')
      AND school_id = public.get_my_school_id()
    )
  );

-- ---------------------------------------------------------------------------
-- Part C — super_admin bypass on read policies that ANDed super_admin with
-- school_id = get_my_school_id(). Original school-scoped condition preserved
-- verbatim for the other roles / parent branches.
-- ---------------------------------------------------------------------------

-- fee_line_items read (20240001000026)
DROP POLICY IF EXISTS "fli_read" ON public.fee_line_items;
CREATE POLICY "fli_read" ON public.fee_line_items FOR SELECT
  USING (
    public.get_my_role() = 'super_admin'
    OR (
      (public.get_my_role() IN ('school_admin', 'principal', 'teacher', 'super_admin')
      AND school_id = public.get_my_school_id())
      OR EXISTS (
        SELECT 1 FROM public.student_profiles sp
        WHERE sp.id = fee_line_items.student_id
        AND sp.parent_profile_id = auth.uid()
      )
    )
  );

-- payments read (20240001000026)
DROP POLICY IF EXISTS "payments_read" ON public.payments;
CREATE POLICY "payments_read" ON public.payments FOR SELECT
  USING (
    public.get_my_role() = 'super_admin'
    OR (
      (public.get_my_role() IN ('school_admin', 'principal', 'super_admin')
      AND school_id = public.get_my_school_id())
      OR EXISTS (
        SELECT 1 FROM public.student_profiles sp
        WHERE sp.id = payments.student_id
        AND sp.parent_profile_id = auth.uid()
      )
    )
  );

-- line_item_payments read (20240001000026)
DROP POLICY IF EXISTS "lip_read" ON public.line_item_payments;
CREATE POLICY "lip_read" ON public.line_item_payments FOR SELECT
  USING (
    public.get_my_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM public.payments p
      WHERE p.id = line_item_payments.payment_id
      AND (
        (public.get_my_role() IN ('school_admin', 'principal', 'super_admin') AND p.school_id = public.get_my_school_id())
        OR EXISTS (
          SELECT 1 FROM public.student_profiles sp
          WHERE sp.id = p.student_id AND sp.parent_profile_id = auth.uid()
        )
      )
    )
  );

-- student_enrollments read (20240001000029)
DROP POLICY IF EXISTS "enrollments_read" ON public.student_enrollments;
CREATE POLICY "enrollments_read" ON public.student_enrollments FOR SELECT
  USING (
    public.get_my_role() = 'super_admin'
    OR (
      public.get_my_role() IN ('school_admin', 'principal', 'teacher', 'super_admin')
      AND school_id = public.get_my_school_id()
    )
  );

-- section_assignments read (20240001000030)
DROP POLICY IF EXISTS "section_assignments_read" ON public.section_assignments;
CREATE POLICY "section_assignments_read" ON public.section_assignments FOR SELECT
  USING (
    public.get_my_role() = 'super_admin'
    OR (
      public.get_my_role() IN ('school_admin', 'principal', 'teacher', 'super_admin')
      AND school_id = public.get_my_school_id()
    )
  );

-- ---------------------------------------------------------------------------
-- Additional super_admin-bypass fixes for policies that AND super_admin with school scope
-- ---------------------------------------------------------------------------

-- discipline_select (20240001000010)
DROP POLICY IF EXISTS "discipline_select" ON public.discipline_records;
CREATE POLICY "discipline_select" ON public.discipline_records FOR SELECT
  USING (
    public.get_my_role() = 'super_admin'
    OR (
      public.get_my_role() IN ('super_admin', 'school_admin', 'principal', 'teacher')
      AND school_id = public.get_my_school_id()
    )
  );

-- student_profiles_write (20240001000021)
DROP POLICY IF EXISTS "student_profiles_write" ON public.student_profiles;
CREATE POLICY "student_profiles_write" ON public.student_profiles FOR ALL
  USING (
    public.get_my_role() = 'super_admin'
    OR (
      public.get_my_role() IN ('super_admin', 'school_admin', 'teacher')
      AND school_id = public.get_my_school_id()
    )
  )
  WITH CHECK (
    public.get_my_role() = 'super_admin'
    OR (
      public.get_my_role() IN ('super_admin', 'school_admin', 'teacher')
      AND school_id = public.get_my_school_id()
    )
  );
