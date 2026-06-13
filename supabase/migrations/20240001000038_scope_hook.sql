-- Header-derived, validated, transaction-local active scope.
-- PostgREST calls public.scope_pre_request() before each request (see ALTER ROLE below).
-- It reads request headers, validates the claimed (user, school, role) against
-- user_roles, and sets transaction-local GUCs that RLS helpers read.

CREATE OR REPLACE FUNCTION public.scope_pre_request()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  headers        json;
  hdr_school     text;
  hdr_role       text;
  uid            uuid;
  valid_school   uuid;
  valid_role     public.app_role;
BEGIN
  uid := auth.uid();

  -- No authenticated user: clear scope and return.
  IF uid IS NULL THEN
    PERFORM set_config('app.school_id', '', true);
    PERFORM set_config('app.role', '', true);
    RETURN;
  END IF;

  headers := current_setting('request.headers', true)::json;
  hdr_school := headers ->> 'x-school-id';
  hdr_role   := headers ->> 'x-active-role';

  -- Platform admin path: no school header, must hold super_admin with NULL school.
  IF hdr_school IS NULL OR hdr_school = '' THEN
    SELECT ur.role INTO valid_role
    FROM public.user_roles ur
    WHERE ur.user_id = uid AND ur.school_id IS NULL
      AND ur.role = 'super_admin' AND ur.is_active = true
    LIMIT 1;

    PERFORM set_config('app.school_id', '', true);
    PERFORM set_config('app.role', COALESCE(valid_role::text, ''), true);
    RETURN;
  END IF;

  -- School path: validate the claimed school is one the user belongs to.
  -- If x-active-role present, require an active matching (user, school, role) row;
  -- else pick highest-precedence active role at that school.
  IF hdr_role IS NOT NULL AND hdr_role <> '' THEN
    SELECT ur.school_id, ur.role INTO valid_school, valid_role
    FROM public.user_roles ur
    WHERE ur.user_id = uid
      AND ur.school_id = hdr_school::uuid
      AND ur.role = hdr_role::public.app_role
      AND ur.is_active = true
    LIMIT 1;
  ELSE
    SELECT ur.school_id, ur.role INTO valid_school, valid_role
    FROM public.user_roles ur
    WHERE ur.user_id = uid
      AND ur.school_id = hdr_school::uuid
      AND ur.is_active = true
    ORDER BY CASE ur.role
      WHEN 'school_admin' THEN 1
      WHEN 'principal'    THEN 2
      WHEN 'teacher'      THEN 3
      WHEN 'parent'       THEN 4
      WHEN 'student'      THEN 5
      ELSE 6 END
    LIMIT 1;
  END IF;

  -- Invalid/forbidden scope: deny by leaving GUCs empty (helpers return NULL).
  PERFORM set_config('app.school_id', COALESCE(valid_school::text, ''), true);
  PERFORM set_config('app.role', COALESCE(valid_role::text, ''), true);
END;
$$;

-- Rewrite helpers to read validated transaction-local GUCs.
CREATE OR REPLACE FUNCTION public.get_my_school_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT NULLIF(current_setting('app.school_id', true), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT NULLIF(current_setting('app.role', true), '')::public.app_role;
$$;

-- Wire PostgREST to call the hook before each request. This persists in the DB
-- (role-level setting) and applies in both local and hosted environments.
ALTER ROLE authenticator SET pgrst.db_pre_request = 'public.scope_pre_request';
NOTIFY pgrst, 'reload config';
