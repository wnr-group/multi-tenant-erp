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

      IF rnd < 0.85 THEN
        -- Paid in full
        INSERT INTO public.fee_payments (
          school_id, student_id, fee_structure_id,
          amount_paid, concession_amount, payment_date, payment_method, status
        ) VALUES (
          'aaaaaaaa-0000-0000-0000-000000000001',
          sp.student_id,
          fs_id,
          fs_amount,
          0,
          m + INTERVAL '4 days',
          'cash',
          'paid'
        );
      ELSIF rnd < 0.90 THEN
        -- Paid with concession (sibling/merit discount of 20%)
        INSERT INTO public.fee_payments (
          school_id, student_id, fee_structure_id,
          amount_paid, concession_amount, payment_date, payment_method, status
        ) VALUES (
          'aaaaaaaa-0000-0000-0000-000000000001',
          sp.student_id,
          fs_id,
          fs_amount * 0.80,
          fs_amount * 0.20,
          m + INTERVAL '4 days',
          'upi',
          'paid'
        );
      ELSIF rnd < 0.95 THEN
        -- Partial payment (50% paid, no concession yet)
        INSERT INTO public.fee_payments (
          school_id, student_id, fee_structure_id,
          amount_paid, concession_amount, payment_date, payment_method, status
        ) VALUES (
          'aaaaaaaa-0000-0000-0000-000000000001',
          sp.student_id,
          fs_id,
          fs_amount * 0.50,
          0,
          m + INTERVAL '4 days',
          'cash',
          'partial'
        );
      ELSE
        -- Pending
        INSERT INTO public.fee_payments (
          school_id, student_id, fee_structure_id,
          amount_paid, concession_amount, payment_date, payment_method, status
        ) VALUES (
          'aaaaaaaa-0000-0000-0000-000000000001',
          sp.student_id,
          fs_id,
          0,
          0,
          NULL,
          NULL,
          'pending'
        );
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- ---------------------------------------------------------------
-- ATTENDANCE RECORDS (last 7 school days Mon-Fri, ~85% present)
-- marked_by = schooladmin
-- ---------------------------------------------------------------
DO $$
DECLARE
  d DATE;
  school_days INT := 0;
  sp RECORD;
  rnd FLOAT;
BEGIN
  -- Walk backwards from yesterday, collect up to 7 Mon-Fri days
  d := CURRENT_DATE - INTERVAL '1 day';
  WHILE school_days < 7 LOOP
    IF EXTRACT(DOW FROM d) BETWEEN 1 AND 5 THEN -- Mon=1, Fri=5
      FOR sp IN
        SELECT id FROM public.student_profiles
        WHERE school_id = 'aaaaaaaa-0000-0000-0000-000000000001'
      LOOP
        rnd := random();
        INSERT INTO public.attendance_records (
          school_id, student_id, section_id, date, status, marked_by
        )
        SELECT
          'aaaaaaaa-0000-0000-0000-000000000001',
          sp.id,
          s.section_id,
          d,
          CASE WHEN rnd < 0.85 THEN 'present'::public.attendance_status
               ELSE 'absent'::public.attendance_status END,
          'aaaaaaaa-0000-0000-0000-000000000011'
        FROM public.student_profiles s
        WHERE s.id = sp.id;
      END LOOP;
      school_days := school_days + 1;
    END IF;
    d := d - INTERVAL '1 day';
  END LOOP;
END $$;

-- ---------------------------------------------------------------
-- ANNOUNCEMENTS (5 records)
-- ---------------------------------------------------------------
INSERT INTO public.announcements (school_id, title, content, target_type, created_by, created_at)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Annual Sports Day',
   'Annual Sports Day will be held on April 18th. All students must participate.',
   'school', 'aaaaaaaa-0000-0000-0000-000000000011', '2026-04-18 09:00:00+00'),

  ('aaaaaaaa-0000-0000-0000-000000000001', 'Mid-Term Exam Schedule Released',
   'Mid-term examinations will commence from May 5th. Timetable is now available.',
   'school', 'aaaaaaaa-0000-0000-0000-000000000011', '2026-04-10 09:00:00+00'),

  ('aaaaaaaa-0000-0000-0000-000000000001', 'Summer Vacation Notice',
   'School will remain closed from May 20th to June 10th for summer vacation.',
   'school', 'aaaaaaaa-0000-0000-0000-000000000011', '2026-04-05 09:00:00+00'),

  ('aaaaaaaa-0000-0000-0000-000000000001', 'Parent-Teacher Meeting',
   'PTM scheduled for April 5th from 10am to 1pm. Attendance is mandatory.',
   'school', 'aaaaaaaa-0000-0000-0000-000000000011', '2026-03-28 09:00:00+00'),

  ('aaaaaaaa-0000-0000-0000-000000000001', 'Science Exhibition',
   'Inter-school science exhibition on March 25th. Register by March 22nd.',
   'school', 'aaaaaaaa-0000-0000-0000-000000000011', '2026-03-20 09:00:00+00');

-- ---------------------------------------------------------------
-- DISCIPLINE RECORDS (~2 per month, Nov 2025–Apr 2026 = 12 records)
-- ---------------------------------------------------------------
DO $$
DECLARE
  m DATE;
  student_ids UUID[];
  i INT;
  categories public.discipline_category[] := ARRAY['behavioral','academic','behavioral','attendance','behavioral','academic','behavioral','academic','attendance','behavioral','academic','behavioral']::public.discipline_category[];
  severities  public.discipline_severity[]  := ARRAY['verbal','written','verbal','verbal','written','verbal','written','verbal','verbal','written','verbal','written']::public.discipline_severity[];
BEGIN
  SELECT ARRAY(
    SELECT id FROM public.student_profiles
    WHERE school_id = 'aaaaaaaa-0000-0000-0000-000000000001'
    ORDER BY random() LIMIT 12
  ) INTO student_ids;

  i := 1;
  FOR m IN
    SELECT generate_series::DATE FROM generate_series(
      '2025-11-01'::DATE, '2026-04-01'::DATE, INTERVAL '1 month'
    )
  LOOP
    -- incident 1
    INSERT INTO public.discipline_records (
      school_id, student_id, category, severity, description, recorded_by, created_at
    ) VALUES (
      'aaaaaaaa-0000-0000-0000-000000000001',
      student_ids[i],
      categories[i],
      severities[i],
      'Disciplinary incident recorded for ' || to_char(m, 'Mon YYYY'),
      'aaaaaaaa-0000-0000-0000-000000000011',
      m + INTERVAL '7 days'
    );
    -- incident 2
    INSERT INTO public.discipline_records (
      school_id, student_id, category, severity, description, recorded_by, created_at
    ) VALUES (
      'aaaaaaaa-0000-0000-0000-000000000001',
      student_ids[i+1],
      categories[i+1],
      severities[i+1],
      'Second disciplinary incident for ' || to_char(m, 'Mon YYYY'),
      'aaaaaaaa-0000-0000-0000-000000000011',
      m + INTERVAL '20 days'
    );
    i := i + 2;
  END LOOP;
END $$;

-- ---------------------------------------------------------------
-- SUBJECTS (5 per class = 60 total)
-- ---------------------------------------------------------------
INSERT INTO public.subjects (school_id, class_id, name, code)
SELECT
  'aaaaaaaa-0000-0000-0000-000000000001',
  c.id,
  sub.name,
  sub.code
FROM public.classes c
CROSS JOIN (VALUES
  ('Mathematics', 'MATH'),
  ('English', 'ENG'),
  ('Science', 'SCI'),
  ('Social Studies', 'SST'),
  ('Hindi', 'HIN')
) AS sub(name, code)
WHERE c.school_id = 'aaaaaaaa-0000-0000-0000-000000000001';

-- ---------------------------------------------------------------
-- TIMETABLE (~120 entries: 5 teachers × ~25 slots each)
-- Each teacher teaches their subject across 3 sections, Mon-Fri
-- Section 1 gets P1+P2, Section 2 gets P3+P4, Section 3 gets P5
-- ---------------------------------------------------------------
DO $$
DECLARE
  teacher_ids UUID[] := ARRAY[
    'aaaaaaaa-0000-0000-0000-000000000013',
    'aaaaaaaa-0000-0000-0000-000000000014',
    'aaaaaaaa-0000-0000-0000-000000000015',
    'aaaaaaaa-0000-0000-0000-000000000016',
    'aaaaaaaa-0000-0000-0000-000000000017'
  ];
  subject_names TEXT[] := ARRAY['Mathematics', 'English', 'Science', 'Social Studies', 'Hindi'];
  -- Flat array: 3 sections per teacher, 15 total (index = (t_idx-1)*3 + s_idx)
  sec_ids UUID[] := ARRAY[
    'cccccccc-0000-0000-0000-000000000801', 'cccccccc-0000-0000-0000-000000000802', 'cccccccc-0000-0000-0000-000000000701',
    'cccccccc-0000-0000-0000-000000000101', 'cccccccc-0000-0000-0000-000000000102', 'cccccccc-0000-0000-0000-000000000201',
    'cccccccc-0000-0000-0000-000000000301', 'cccccccc-0000-0000-0000-000000000302', 'cccccccc-0000-0000-0000-000000000401',
    'cccccccc-0000-0000-0000-000000000501', 'cccccccc-0000-0000-0000-000000000502', 'cccccccc-0000-0000-0000-000000000601',
    'cccccccc-0000-0000-0000-000000000701', 'cccccccc-0000-0000-0000-000000000702', 'cccccccc-0000-0000-0000-000000000901'
  ];
  t_idx INT;
  s_idx INT;
  d INT;
  p INT;
  sec_id UUID;
  sub_id UUID;
  cls_id UUID;
  periods INT[];
BEGIN
  FOR t_idx IN 1..5 LOOP
    FOR s_idx IN 1..3 LOOP
      sec_id := sec_ids[(t_idx - 1) * 3 + s_idx];
      SELECT class_id INTO cls_id FROM public.sections WHERE id = sec_id;
      SELECT id INTO sub_id FROM public.subjects
        WHERE school_id = 'aaaaaaaa-0000-0000-0000-000000000001'
          AND class_id = cls_id
          AND name = subject_names[t_idx]
        LIMIT 1;
      -- Section 1: P1,P2 | Section 2: P3,P4 | Section 3: P5
      IF s_idx = 1 THEN periods := ARRAY[1, 2];
      ELSIF s_idx = 2 THEN periods := ARRAY[3, 4];
      ELSE periods := ARRAY[5];
      END IF;
      FOR d IN 1..5 LOOP
        FOREACH p IN ARRAY periods LOOP
          INSERT INTO public.timetable (school_id, teacher_id, section_id, subject_id, day_of_week, period)
          VALUES (
            'aaaaaaaa-0000-0000-0000-000000000001',
            teacher_ids[t_idx],
            sec_id,
            sub_id,
            d,
            p
          )
          ON CONFLICT (section_id, day_of_week, period) DO NOTHING;
        END LOOP;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;
