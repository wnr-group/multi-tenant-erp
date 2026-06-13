-- Make profiles a pure, school-agnostic identity record.
-- Affiliation now lives exclusively in user_roles.

-- Drop the RLS policy that references profiles.school_id before dropping the column.
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;

DROP INDEX IF EXISTS public.idx_profiles_school_id;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS school_id;

-- Recreate profiles_select without the school_id clause.
-- Users can read their own profile; super_admins can read all.
-- Cross-school visibility (school_admin / teachers seeing peer profiles) is now
-- handled at the application layer via user_roles joins.
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT
  USING (
    id = auth.uid()
    OR public.get_my_role() = 'super_admin'
  );

-- Profiles are person-owned and school-agnostic: a school_admin must not edit a
-- shared human's profile (the person may belong to multiple schools). Only the
-- user themselves or a platform super_admin may update. Provisioning uses the
-- service-role client which bypasses RLS, so onboarding is unaffected.
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE
  USING (id = auth.uid() OR public.get_my_role() = 'super_admin');

-- handle_new_user no longer references school_id (it never set it, but keep it
-- canonical and phone-aware to match 20240001000027).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.phone, '')
  );
  RETURN NEW;
END;
$$;
