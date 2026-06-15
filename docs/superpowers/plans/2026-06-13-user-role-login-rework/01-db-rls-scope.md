# Sub-plan 1: Database & RLS Scope Foundation

> Part of [User/Role Login Rework](../2026-06-13-user-role-login-rework.md). Execute FIRST — all other sub-plans depend on it.
> REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Make `profiles` school-agnostic and replace "first active row" scope resolution with a validated, header-derived, transaction-local scope that RLS trusts.

**Architecture:** A new migration drops `profiles.school_id`, adds a `db-pre-request` hook that reads request headers (`x-school-id`, `x-active-role`), validates them against `user_roles`, and stores them in transaction-local GUCs (`app.school_id`, `app.role`). `get_my_school_id()` / `get_my_role()` are rewritten to read those GUCs. A public RPC `check_phone_has_access` supports the pre-OTP gate.

**Tech Stack:** Supabase Postgres, PostgREST `db-pre-request`, PL/pgSQL, RLS.

**Migration numbering:** latest is `20240001000036_enrollments_parent_rls.sql`. Use `20240001000037_*` onward.

---

### Task 1: Drop `profiles.school_id` and update the new-user trigger

**Files:**
- Create: `supabase/migrations/20240001000037_profiles_school_agnostic.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Make profiles a pure, school-agnostic identity record.
-- Affiliation now lives exclusively in user_roles.

ALTER TABLE public.profiles DROP COLUMN IF EXISTS school_id;

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
```

- [ ] **Step 2: Apply and verify the column is gone**

Run: `cd "/Users/dineshlearning/Documents/make money/erp" && supabase db reset` (local) — or `supabase migration up` against the linked project.
Expected: reset completes; no errors. Then:
Run: `supabase db diff --schema public | grep -i "profiles" | grep -i "school_id"`
Expected: no output (column absent).

- [ ] **Step 3: Verify no remaining DB references to `profiles.school_id`**

Run: `grep -rn "profiles" supabase/migrations | grep "school_id" | grep -iv "user_roles\|student_profiles\|teacher_profiles"`
Expected: no hits that read `profiles.school_id`. If a later migration's RLS reads `profiles.school_id`, note it for Task 4.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20240001000037_profiles_school_agnostic.sql
git commit -m "feat(db): make profiles school-agnostic, drop profiles.school_id"
```

---

### Task 2: Add the validated `db-pre-request` scope hook + GUC-backed helpers

**Files:**
- Create: `supabase/migrations/20240001000038_scope_hook.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Header-derived, validated, transaction-local active scope.
-- PostgREST calls public.scope_pre_request() before each request when configured
-- (see Step 3). It reads request headers, validates the claimed (user, school, role)
-- against user_roles, and sets transaction-local GUCs that RLS helpers read.

-- Resolve the school_id the client is acting in, from the x-school-id header.
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

  -- No authenticated user: clear scope and return (anon RPCs handle their own auth).
  IF uid IS NULL THEN
    PERFORM set_config('app.school_id', '', true);
    PERFORM set_config('app.role', '', true);
    RETURN;
  END IF;

  headers := current_setting('request.headers', true)::json;
  hdr_school := headers ->> 'x-school-id';
  hdr_role   := headers ->> 'x-active-role';

  -- Platform admin path: no school header, must hold a super_admin role with NULL school.
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
  -- If x-active-role is present, require an active matching (user, school, role) row;
  -- otherwise pick the highest-precedence active role at that school.
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

  -- Invalid/forbidden scope: deny by leaving GUCs empty (helpers return NULL → RLS denies).
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
```

- [ ] **Step 2: Apply the migration**

Run: `supabase db reset` (local).
Expected: completes without error.

- [ ] **Step 3: Wire PostgREST to call the hook**

Edit `supabase/config.toml` under the `[db]` or API settings to set the pre-request function. Add:

```toml
[api]
# Call the scope hook before each PostgREST request.
db_pre_request = "public.scope_pre_request"
```

If `[api]` already exists, add the `db_pre_request` line inside it (do not duplicate the section).

For the hosted project, the equivalent is set via:
`ALTER ROLE authenticator SET pgrst.db_pre_request = 'public.scope_pre_request';`
Add this as the final statement of `20240001000038_scope_hook.sql` so it applies on deploy:

```sql
ALTER ROLE authenticator SET pgrst.db_pre_request = 'public.scope_pre_request';
NOTIFY pgrst, 'reload config';
```

- [ ] **Step 4: Manual verification of validated scope**

In Supabase SQL editor / psql as the `authenticator`-simulated session is hard to fake locally, so verify the helper logic directly:

Run (psql):
```sql
SELECT set_config('app.school_id', '', true);
SELECT public.get_my_school_id();  -- expect NULL
SELECT set_config('app.school_id', '11111111-1111-1111-1111-111111111111', true);
SELECT public.get_my_school_id();  -- expect that uuid
```
Expected: first NULL, second the uuid.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20240001000038_scope_hook.sql supabase/config.toml
git commit -m "feat(db): add validated db-pre-request scope hook and GUC-backed RLS helpers"
```

---

### Task 3: Add `check_phone_has_access` RPC for the pre-OTP gate

**Files:**
- Create: `supabase/migrations/20240001000039_check_phone_access.sql`

- [ ] **Step 1: Write the migration**

```sql
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
    WHERE u.phone = regexp_replace(p_phone, '[^0-9+]', '', 'g')
      AND ur.school_id = p_school_id
      AND ur.is_active = true
  );
$$;

REVOKE ALL ON FUNCTION public.check_phone_has_access(text, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.check_phone_has_access(text, uuid) TO anon, authenticated;
```

> **Note on phone normalization:** the app sends `+91` + 10 digits (see `apps/mobile/app/(auth)/login.tsx`). Pass the already-prefixed `+91XXXXXXXXXX` string. `regexp_replace` strips spaces/dashes but keeps the leading `+`.

- [ ] **Step 2: Apply and verify**

Run: `supabase db reset`
Then in psql:
```sql
SELECT public.check_phone_has_access('+910000000000', '00000000-0000-0000-0000-000000000000');
```
Expected: `false` (no such user/role).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20240001000039_check_phone_access.sql
git commit -m "feat(db): add check_phone_has_access RPC for pre-OTP gating"
```

---

### Task 4: Audit & fix RLS policies that assumed first-row scope

**Files:**
- Review: all `supabase/migrations/*_rls*.sql` and any migration adding policies.
- Create (if fixes needed): `supabase/migrations/20240001000040_rls_scope_fixups.sql`

- [ ] **Step 1: Find policies that may break under validated scope**

Run: `grep -rln "get_my_school_id\|get_my_role\|parent_profile_id\|auth.uid()" supabase/migrations`
Expected: a list of migration files. Read each policy that uses `get_my_role()` / `get_my_school_id()` and confirm it still expresses the intended rule now that those return the *validated active* school/role (not "first row").

- [ ] **Step 2: Confirm parent scoping is intact**

Read the parent policies (`20240001000022_discipline_parent_read.sql`, `20240001000026_payment_rework.sql`, `20240001000025_parent_photo_upload.sql`, `20240001000036_enrollments_parent_rls.sql`). Confirm each still keys on `parent_profile_id = auth.uid()`.
Expected: they do — these need NO change. The `student_id` UI filter is applied client-side, never in RLS.

- [ ] **Step 3: If any policy referenced dropped `profiles.school_id`, rewrite it**

If Task 1 Step 3 found a policy reading `profiles.school_id`, write the fixup in `20240001000040_rls_scope_fixups.sql` to use `get_my_school_id()` (the validated GUC) instead. Example shape:

```sql
-- Example: replace a policy that used profiles.school_id with the validated helper.
DROP POLICY IF EXISTS "<policy name>" ON public.<table>;
CREATE POLICY "<policy name>" ON public.<table>
  FOR SELECT USING (school_id = public.get_my_school_id());
```

If no such policy exists, skip creating this file.

- [ ] **Step 4: Apply and smoke-test RLS**

Run: `supabase db reset`
Expected: completes; all policies create cleanly.

- [ ] **Step 5: Commit (only if a fixup file was created)**

```bash
git add supabase/migrations/20240001000040_rls_scope_fixups.sql
git commit -m "fix(db): align RLS policies with validated active-scope helpers"
```

---

## Sub-plan 1 done when

- `profiles.school_id` no longer exists.
- `get_my_school_id()` / `get_my_role()` read validated transaction-local GUCs.
- `scope_pre_request` is wired via `db_pre_request`.
- `check_phone_has_access` exists and is anon-executable.
- All RLS policies create cleanly and parent scoping is intact.

Proceed to [Sub-plan 2: Provisioning](02-provisioning.md).
