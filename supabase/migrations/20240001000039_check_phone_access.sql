-- Public, anon-callable advisory check used BEFORE sending an OTP, to save SMS cost.
-- Returns true if the given phone has any active role at the given school.
-- When p_school_id IS NULL (platform/core portal), returns true if the phone holds
-- an active super_admin role (whose user_roles row has school_id IS NULL).
-- This is advisory only; the db-pre-request hook + RLS remain the real boundary.
CREATE OR REPLACE FUNCTION public.check_phone_has_access(p_phone text, p_school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    JOIN public.user_roles ur ON ur.user_id = u.id
    WHERE regexp_replace(u.phone, '[^0-9]', '', 'g') = regexp_replace(p_phone, '[^0-9]', '', 'g')
      AND ur.is_active = true
      AND (
        -- A role at the requested school grants access to that school portal.
        (p_school_id IS NOT NULL AND ur.school_id = p_school_id)
        -- A global super_admin (school_id IS NULL) may access the core portal
        -- AND any school subdomain (they administer every school).
        OR (ur.school_id IS NULL AND ur.role = 'super_admin')
      )
  );
$$;

REVOKE ALL ON FUNCTION public.check_phone_has_access(text, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.check_phone_has_access(text, uuid) TO anon, authenticated;
