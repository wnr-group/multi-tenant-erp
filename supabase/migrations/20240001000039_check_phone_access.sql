-- Public, anon-callable advisory check used BEFORE sending an OTP, to save SMS cost.
-- Returns true if the given phone has any active role at the given school.
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
      AND ur.school_id = p_school_id
      AND ur.is_active = true
  );
$$;

REVOKE ALL ON FUNCTION public.check_phone_has_access(text, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.check_phone_has_access(text, uuid) TO anon, authenticated;
