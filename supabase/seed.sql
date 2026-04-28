-- =============================================================
-- Seed data for local development
-- Run via: supabase db reset (applies migrations + this file)
-- =============================================================

-- ---------------------------------------------------------------
-- SCHOOL
-- ---------------------------------------------------------------
INSERT INTO public.schools (id, name, domain, is_active, contact_email, primary_color)
VALUES (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Demo School',
  'school1.lvh.me',
  true,
  'demo@example.com',
  '#2563EB'
);

-- ---------------------------------------------------------------
-- ACADEMIC YEAR
-- ---------------------------------------------------------------
INSERT INTO public.academic_years (id, school_id, name, start_date, end_date, is_current)
VALUES (
  'aaaaaaaa-0000-0000-0000-000000000002',
  'aaaaaaaa-0000-0000-0000-000000000001',
  '2026-27',
  '2026-04-01',
  '2027-03-31',
  true
);

-- ---------------------------------------------------------------
-- AUTH USERS  (local Supabase only — never run against prod)
-- handle_new_user trigger auto-creates profiles rows
-- ---------------------------------------------------------------
INSERT INTO auth.users (
  id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, created_at, updated_at,
  aud, role, instance_id, confirmation_token, recovery_token,
  email_change_token_new, email_change
)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000010', 'admin@wnr.com',
   crypt('Admin@1234', gen_salt('bf')), now(),
   '{"full_name":"Dinesh (Super Admin)"}'::jsonb,
   now(), now(), 'authenticated', 'authenticated',
   '00000000-0000-0000-0000-000000000000', '', '', '', ''),

  ('aaaaaaaa-0000-0000-0000-000000000011', 'schooladmin@demo.com',
   crypt('Admin@1234', gen_salt('bf')), now(),
   '{"full_name":"Arjun Sharma"}'::jsonb,
   now(), now(), 'authenticated', 'authenticated',
   '00000000-0000-0000-0000-000000000000', '', '', '', ''),

  ('aaaaaaaa-0000-0000-0000-000000000012', 'principal@demo.com',
   crypt('Admin@1234', gen_salt('bf')), now(),
   '{"full_name":"Dr. Meena Iyer"}'::jsonb,
   now(), now(), 'authenticated', 'authenticated',
   '00000000-0000-0000-0000-000000000000', '', '', '', ''),

  ('aaaaaaaa-0000-0000-0000-000000000013', 'teacher1@demo.com',
   crypt('Admin@1234', gen_salt('bf')), now(),
   '{"full_name":"Ravi Kumar"}'::jsonb,
   now(), now(), 'authenticated', 'authenticated',
   '00000000-0000-0000-0000-000000000000', '', '', '', ''),

  ('aaaaaaaa-0000-0000-0000-000000000014', 'teacher2@demo.com',
   crypt('Admin@1234', gen_salt('bf')), now(),
   '{"full_name":"Priya Nair"}'::jsonb,
   now(), now(), 'authenticated', 'authenticated',
   '00000000-0000-0000-0000-000000000000', '', '', '', ''),

  ('aaaaaaaa-0000-0000-0000-000000000015', 'teacher3@demo.com',
   crypt('Admin@1234', gen_salt('bf')), now(),
   '{"full_name":"Suresh Babu"}'::jsonb,
   now(), now(), 'authenticated', 'authenticated',
   '00000000-0000-0000-0000-000000000000', '', '', '', ''),

  ('aaaaaaaa-0000-0000-0000-000000000016', 'teacher4@demo.com',
   crypt('Admin@1234', gen_salt('bf')), now(),
   '{"full_name":"Kavitha Reddy"}'::jsonb,
   now(), now(), 'authenticated', 'authenticated',
   '00000000-0000-0000-0000-000000000000', '', '', '', ''),

  ('aaaaaaaa-0000-0000-0000-000000000017', 'teacher5@demo.com',
   crypt('Admin@1234', gen_salt('bf')), now(),
   '{"full_name":"Anand Pillai"}'::jsonb,
   now(), now(), 'authenticated', 'authenticated',
   '00000000-0000-0000-0000-000000000000', '', '', '', '');

-- Update profiles with school_id for school-scoped users
UPDATE public.profiles SET school_id = 'aaaaaaaa-0000-0000-0000-000000000001'
WHERE id IN (
  'aaaaaaaa-0000-0000-0000-000000000011',
  'aaaaaaaa-0000-0000-0000-000000000012',
  'aaaaaaaa-0000-0000-0000-000000000013',
  'aaaaaaaa-0000-0000-0000-000000000014',
  'aaaaaaaa-0000-0000-0000-000000000015',
  'aaaaaaaa-0000-0000-0000-000000000016',
  'aaaaaaaa-0000-0000-0000-000000000017'
);

-- ---------------------------------------------------------------
-- USER ROLES
-- ---------------------------------------------------------------
INSERT INTO public.user_roles (user_id, school_id, role, is_active)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000010', NULL,                                      'super_admin',  true),
  ('aaaaaaaa-0000-0000-0000-000000000011', 'aaaaaaaa-0000-0000-0000-000000000001',    'school_admin', true),
  ('aaaaaaaa-0000-0000-0000-000000000012', 'aaaaaaaa-0000-0000-0000-000000000001',    'principal',    true),
  ('aaaaaaaa-0000-0000-0000-000000000013', 'aaaaaaaa-0000-0000-0000-000000000001',    'teacher',      true),
  ('aaaaaaaa-0000-0000-0000-000000000014', 'aaaaaaaa-0000-0000-0000-000000000001',    'teacher',      true),
  ('aaaaaaaa-0000-0000-0000-000000000015', 'aaaaaaaa-0000-0000-0000-000000000001',    'teacher',      true),
  ('aaaaaaaa-0000-0000-0000-000000000016', 'aaaaaaaa-0000-0000-0000-000000000001',    'teacher',      true),
  ('aaaaaaaa-0000-0000-0000-000000000017', 'aaaaaaaa-0000-0000-0000-000000000001',    'teacher',      true);
