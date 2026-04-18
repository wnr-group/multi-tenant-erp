-- =============================================================
-- Seed data for local development
-- Run via: supabase db reset (applies migrations + this file)
-- =============================================================

-- Seed one demo school for testing
-- domain = 'localhost' allows local dev without a real subdomain
INSERT INTO public.schools (id, name, domain, is_active, contact_email, primary_color)
VALUES (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Demo School',
  'localhost',
  true,
  'demo@example.com',
  '#2563EB'
);

-- Seed a demo academic year
INSERT INTO public.academic_years (school_id, name, start_date, end_date, is_current)
VALUES (
  'aaaaaaaa-0000-0000-0000-000000000001',
  '2026-27',
  '2026-04-01',
  '2027-03-31',
  true
);

-- ---------------------------------------------------------------
-- To create the super admin user, run this AFTER creating the
-- auth user manually in Supabase Studio (http://127.0.0.1:54323):
--   1. Go to Authentication > Users > Add User
--   2. Create user with email: admin@wnr.com, any password
--   3. Copy the UUID and replace <super-admin-user-id> below
--   4. Run the INSERT in the SQL editor
-- ---------------------------------------------------------------
-- INSERT INTO public.user_roles (user_id, school_id, role, is_active)
-- VALUES ('<super-admin-user-id>', NULL, 'super_admin', true);
