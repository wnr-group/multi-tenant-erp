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

-- ---------------------------------------------------------------
-- CLASSES (Class 1–12)
-- ---------------------------------------------------------------
INSERT INTO public.classes (id, school_id, name, "order") VALUES
  ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Class 1',  1),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Class 2',  2),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'Class 3',  3),
  ('bbbbbbbb-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', 'Class 4',  4),
  ('bbbbbbbb-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000001', 'Class 5',  5),
  ('bbbbbbbb-0000-0000-0000-000000000006', 'aaaaaaaa-0000-0000-0000-000000000001', 'Class 6',  6),
  ('bbbbbbbb-0000-0000-0000-000000000007', 'aaaaaaaa-0000-0000-0000-000000000001', 'Class 7',  7),
  ('bbbbbbbb-0000-0000-0000-000000000008', 'aaaaaaaa-0000-0000-0000-000000000001', 'Class 8',  8),
  ('bbbbbbbb-0000-0000-0000-000000000009', 'aaaaaaaa-0000-0000-0000-000000000001', 'Class 9',  9),
  ('bbbbbbbb-0000-0000-0000-000000000010', 'aaaaaaaa-0000-0000-0000-000000000001', 'Class 10', 10),
  ('bbbbbbbb-0000-0000-0000-000000000011', 'aaaaaaaa-0000-0000-0000-000000000001', 'Class 11', 11),
  ('bbbbbbbb-0000-0000-0000-000000000012', 'aaaaaaaa-0000-0000-0000-000000000001', 'Class 12', 12);

-- ---------------------------------------------------------------
-- SECTIONS (A and B for each class = 24 sections)
-- IDs: cccccccc-0000-0000-0000-00000000XXYY  XX=class(01-12) YY=section(01=A,02=B)
-- ---------------------------------------------------------------
INSERT INTO public.sections (id, school_id, class_id, name) VALUES
  ('cccccccc-0000-0000-0000-000000000101', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'A'),
  ('cccccccc-0000-0000-0000-000000000102', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'B'),
  ('cccccccc-0000-0000-0000-000000000201', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'A'),
  ('cccccccc-0000-0000-0000-000000000202', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'B'),
  ('cccccccc-0000-0000-0000-000000000301', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000003', 'A'),
  ('cccccccc-0000-0000-0000-000000000302', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000003', 'B'),
  ('cccccccc-0000-0000-0000-000000000401', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000004', 'A'),
  ('cccccccc-0000-0000-0000-000000000402', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000004', 'B'),
  ('cccccccc-0000-0000-0000-000000000501', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000005', 'A'),
  ('cccccccc-0000-0000-0000-000000000502', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000005', 'B'),
  ('cccccccc-0000-0000-0000-000000000601', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000006', 'A'),
  ('cccccccc-0000-0000-0000-000000000602', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000006', 'B'),
  ('cccccccc-0000-0000-0000-000000000701', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000007', 'A'),
  ('cccccccc-0000-0000-0000-000000000702', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000007', 'B'),
  ('cccccccc-0000-0000-0000-000000000801', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000008', 'A'),
  ('cccccccc-0000-0000-0000-000000000802', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000008', 'B'),
  ('cccccccc-0000-0000-0000-000000000901', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000009', 'A'),
  ('cccccccc-0000-0000-0000-000000000902', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000009', 'B'),
  ('cccccccc-0000-0000-0000-000000001001', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000010', 'A'),
  ('cccccccc-0000-0000-0000-000000001002', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000010', 'B'),
  ('cccccccc-0000-0000-0000-000000001101', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000011', 'A'),
  ('cccccccc-0000-0000-0000-000000001102', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000011', 'B'),
  ('cccccccc-0000-0000-0000-000000001201', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000012', 'A'),
  ('cccccccc-0000-0000-0000-000000001202', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000012', 'B');

-- ---------------------------------------------------------------
-- TEACHER PROFILES
-- Each teacher is class_teacher_of one section
-- ---------------------------------------------------------------
INSERT INTO public.teacher_profiles (profile_id, school_id, class_teacher_of) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000013', 'aaaaaaaa-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000801'), -- teacher1 → Class 8A
  ('aaaaaaaa-0000-0000-0000-000000000014', 'aaaaaaaa-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000101'), -- teacher2 → Class 1A
  ('aaaaaaaa-0000-0000-0000-000000000015', 'aaaaaaaa-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000302'), -- teacher3 → Class 3B
  ('aaaaaaaa-0000-0000-0000-000000000016', 'aaaaaaaa-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000501'), -- teacher4 → Class 5A
  ('aaaaaaaa-0000-0000-0000-000000000017', 'aaaaaaaa-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000702'); -- teacher5 → Class 7B

-- ---------------------------------------------------------------
-- STUDENTS (~85 per class = ~1,020 total, data-only, no auth)
-- generate_series(1,43) → section A,  generate_series(1,42) → section B
-- student_profiles.profile_id is nullable (migration 16)
-- ---------------------------------------------------------------
DO $$
DECLARE
  cls RECORD;
  sec_a UUID;
  sec_b UUID;
  class_num INT;
  i INT;
BEGIN
  FOR cls IN
    SELECT id, name, "order" FROM public.classes
    WHERE school_id = 'aaaaaaaa-0000-0000-0000-000000000001'
    ORDER BY "order"
  LOOP
    class_num := cls."order";
    -- Derive section UUIDs from the pattern used in the INSERT above
    sec_a := (
      SELECT id FROM public.sections
      WHERE class_id = cls.id AND name = 'A'
    );
    sec_b := (
      SELECT id FROM public.sections
      WHERE class_id = cls.id AND name = 'B'
    );

    -- Section A: 43 students
    FOR i IN 1..43 LOOP
      INSERT INTO public.student_profiles (
        school_id, class_id, section_id,
        full_name, admission_number
      ) VALUES (
        'aaaaaaaa-0000-0000-0000-000000000001',
        cls.id,
        sec_a,
        'Student ' || class_num || 'A-' || i,
        'ADM-' || LPAD(((class_num - 1) * 85 + i)::TEXT, 4, '0')
      );
    END LOOP;

    -- Section B: 42 students
    FOR i IN 1..42 LOOP
      INSERT INTO public.student_profiles (
        school_id, class_id, section_id,
        full_name, admission_number
      ) VALUES (
        'aaaaaaaa-0000-0000-0000-000000000001',
        cls.id,
        sec_b,
        'Student ' || class_num || 'B-' || i,
        'ADM-' || LPAD(((class_num - 1) * 85 + 43 + i)::TEXT, 4, '0')
      );
    END LOOP;
  END LOOP;
END $$;

-- ---------------------------------------------------------------
-- FEE STRUCTURES (tiered: Classes 1-4 ₹3000, 5-8 ₹5000, 9-12 ₹7500)
-- One structure per class, fee_type = 'Tuition'
-- ---------------------------------------------------------------
INSERT INTO public.fee_structures (id, school_id, class_id, academic_year_id, fee_type, amount, due_date)
SELECT
  gen_random_uuid(),
  'aaaaaaaa-0000-0000-0000-000000000001',
  c.id,
  'aaaaaaaa-0000-0000-0000-000000000002',
  'Tuition',
  CASE
    WHEN c."order" <= 4 THEN 3000
    WHEN c."order" <= 8 THEN 5000
    ELSE 7500
  END,
  NULL
FROM public.classes c
WHERE c.school_id = 'aaaaaaaa-0000-0000-0000-000000000001';

-- ---------------------------------------------------------------
-- FEE PAYMENTS (6 months: Nov 2025 – Apr 2026)
-- ~90% paid per month, 10% pending
-- payment_date = 5th of each month for paid records
-- ---------------------------------------------------------------
DO $$
DECLARE
  m DATE;
  sp RECORD;
  fs_id UUID;
  fs_amount NUMERIC;
  rnd FLOAT;
BEGIN
  FOR m IN
    SELECT generate_series::DATE FROM generate_series(
      '2025-11-01'::DATE,
      '2026-04-01'::DATE,
      INTERVAL '1 month'
    )
  LOOP
    FOR sp IN
      SELECT s.id AS student_id, s.class_id
      FROM public.student_profiles s
      WHERE s.school_id = 'aaaaaaaa-0000-0000-0000-000000000001'
    LOOP
      SELECT fs.id, fs.amount INTO fs_id, fs_amount
      FROM public.fee_structures fs
      WHERE fs.class_id = sp.class_id
        AND fs.school_id = 'aaaaaaaa-0000-0000-0000-000000000001'
      LIMIT 1;

      rnd := random();

      IF rnd < 0.90 THEN
        -- Paid
        INSERT INTO public.fee_payments (
          school_id, student_id, fee_structure_id,
          amount_paid, payment_date, payment_method, status
        ) VALUES (
          'aaaaaaaa-0000-0000-0000-000000000001',
          sp.student_id,
          fs_id,
          fs_amount,
          m + INTERVAL '4 days', -- 5th of month
          'cash',
          'paid'
        );
      ELSE
        -- Pending
        INSERT INTO public.fee_payments (
          school_id, student_id, fee_structure_id,
          amount_paid, payment_date, payment_method, status
        ) VALUES (
          'aaaaaaaa-0000-0000-0000-000000000001',
          sp.student_id,
          fs_id,
          0,
          NULL,
          NULL,
          'pending'
        );
      END IF;
    END LOOP;
  END LOOP;
END $$;
