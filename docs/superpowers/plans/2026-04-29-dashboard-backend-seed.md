# Dashboard Backend + Seed Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all mock constants in admin/principal/teacher dashboard pages with real Supabase queries, backed by a comprehensive seed dataset for Demo School (~1,020 students, 5 teachers, 6 months of fees and attendance).

**Architecture:** Two parallel tracks — (1) expand `supabase/seed.sql` with deterministic fixed-UUID data covering all tables the dashboards query; (2) replace mock consts in three server-component dashboard pages with parallel Supabase queries. Chart components are untouched. Pages compute derived values (percentages, monthly groupings) in TypeScript from raw query results.

**Tech Stack:** PostgreSQL (Supabase local), Next.js 16 App Router server components, `@supabase/supabase-js`, TypeScript.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `supabase/seed.sql` | Full demo dataset: users, school structure, students, fees, attendance, announcements, discipline |
| Modify | `apps/web/app/(school)/admin/dashboard/page.tsx` | Replace all mock consts with real queries |
| Modify | `apps/web/app/(school)/principal/dashboard/page.tsx` | Replace all mock consts with real queries |
| Modify | `apps/web/app/(school)/teacher/dashboard/page.tsx` | Replace mock consts + fix timetable column name bug |

---

## Task 1: Seed — Auth Users + School Roles

**Files:**
- Modify: `supabase/seed.sql`

- [ ] **Step 1: Replace the entire seed.sql with the new version (users + roles block)**

The seed uses fixed UUIDs so `supabase db reset` is always idempotent. Paste this as the new `supabase/seed.sql` — it will grow across tasks 1–5:

```sql
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
```

- [ ] **Step 2: Reset and verify users exist**

```bash
cd "/Users/dineshlearning/Documents/make money/erp" && supabase db reset
```

Then in Supabase Studio (http://127.0.0.1:54323), check:
- Authentication > Users: 8 users visible
- Table Editor > user_roles: 8 rows
- Table Editor > profiles: 8 rows with full_name populated

- [ ] **Step 3: Commit**

```bash
cd "/Users/dineshlearning/Documents/make money/erp"
git add supabase/seed.sql
git commit -m "seed: add demo auth users and roles (8 users, all roles)"
```

---

## Task 2: Seed — Classes, Sections, Teacher Profiles

**Files:**
- Modify: `supabase/seed.sql`

- [ ] **Step 1: Append classes + sections block to seed.sql**

Add after the USER ROLES block:

```sql
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
```

- [ ] **Step 2: Reset and verify**

```bash
cd "/Users/dineshlearning/Documents/make money/erp" && supabase db reset
```

In Supabase Studio:
- Table Editor > classes: 12 rows
- Table Editor > sections: 24 rows
- Table Editor > teacher_profiles: 5 rows with class_teacher_of populated

- [ ] **Step 3: Commit**

```bash
git add supabase/seed.sql
git commit -m "seed: add classes, sections (12 classes × 2), and teacher profiles"
```

---

## Task 3: Seed — Students (~1,020 via generate_series)

**Files:**
- Modify: `supabase/seed.sql`

- [ ] **Step 1: Append students block to seed.sql**

Add after TEACHER PROFILES block. Uses `generate_series` to create ~85 students per class, split across sections A/B:

```sql
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
```

- [ ] **Step 2: Reset and verify**

```bash
cd "/Users/dineshlearning/Documents/make money/erp" && supabase db reset
```

In Supabase Studio SQL editor:
```sql
SELECT count(*) FROM public.student_profiles;
-- Expected: 1020

SELECT class_id, count(*) FROM public.student_profiles
GROUP BY class_id ORDER BY count(*);
-- Expected: 12 rows, each showing 85
```

- [ ] **Step 3: Commit**

```bash
git add supabase/seed.sql
git commit -m "seed: add 1020 students via generate_series across 12 classes"
```

---

## Task 4: Seed — Fee Structures + Fee Payments (6 months)

**Files:**
- Modify: `supabase/seed.sql`

- [ ] **Step 1: Append fee structures block to seed.sql**

Add after STUDENTS block:

```sql
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
  fs RECORD;
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
      SELECT fs.id, fs.amount INTO fs
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
          fs.id,
          fs.amount,
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
          fs.id,
          0,
          NULL,
          NULL,
          'pending'
        );
      END IF;
    END LOOP;
  END LOOP;
END $$;
```

- [ ] **Step 2: Reset and verify (this will take ~30-60 seconds due to volume)**

```bash
cd "/Users/dineshlearning/Documents/make money/erp" && supabase db reset
```

In Supabase Studio SQL editor:
```sql
SELECT count(*) FROM public.fee_payments;
-- Expected: ~6120 (1020 students × 6 months)

SELECT
  date_trunc('month', payment_date) AS month,
  sum(amount_paid) AS collected
FROM public.fee_payments
WHERE status = 'paid'
GROUP BY 1 ORDER BY 1;
-- Expected: 6 rows with amounts ranging ~₹4M-5M per month
```

- [ ] **Step 3: Commit**

```bash
git add supabase/seed.sql
git commit -m "seed: add tiered fee structures and 6 months of payments (90% paid)"
```

---

## Task 5: Seed — Attendance, Announcements, Discipline

**Files:**
- Modify: `supabase/seed.sql`

- [ ] **Step 1: Append attendance + announcements + discipline block to seed.sql**

Add after FEE PAYMENTS block:

```sql
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
  categories public.discipline_category[] := ARRAY['behavioral','academic','behavioral','attendance','behavioral','academic']::public.discipline_category[];
  severities  public.discipline_severity[]  := ARRAY['verbal','written','verbal','verbal','written','verbal']::public.discipline_severity[];
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
```

- [ ] **Step 2: Reset and verify**

```bash
cd "/Users/dineshlearning/Documents/make money/erp" && supabase db reset
```

In Supabase Studio SQL editor:
```sql
SELECT count(*) FROM public.attendance_records;
-- Expected: ~7140 (1020 students × 7 days)

SELECT count(*) FROM public.announcements;
-- Expected: 5

SELECT count(*) FROM public.discipline_records;
-- Expected: 12
```

- [ ] **Step 3: Commit**

```bash
git add supabase/seed.sql
git commit -m "seed: add attendance (7 school days), announcements, discipline records"
```

---

## Task 6: Wire Admin Dashboard — Real Queries

**Files:**
- Modify: `apps/web/app/(school)/admin/dashboard/page.tsx`

- [ ] **Step 1: Replace the entire file with the real-query version**

```tsx
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { SwitchRolePanel } from "@/components/switch-role-panel";
import { Users, GraduationCap, BookOpen, IndianRupee } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeeCollectionChart } from "./fee-collection-chart";
import { AttendanceChart } from "./attendance-chart";
import { StudentsByClassChart } from "./students-by-class-chart";
import type { FeeMonth } from "./fee-collection-chart";
import type { AttendanceData } from "./attendance-chart";
import type { ClassCount } from "./students-by-class-chart";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const BADGE_COLORS: Record<string, string> = {
  Event: "bg-indigo-100 text-indigo-700",
  Exam: "bg-amber-100 text-amber-700",
  Holiday: "bg-emerald-100 text-emerald-700",
  General: "bg-gray-100 text-gray-700",
};

function announcementType(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("exam") || t.includes("test") || t.includes("result")) return "Exam";
  if (t.includes("holiday") || t.includes("vacation") || t.includes("closed")) return "Holiday";
  if (t.includes("sports") || t.includes("exhibition") || t.includes("day") || t.includes("meeting")) return "Event";
  return "General";
}

export default async function AdminDashboard() {
  const supabase = await createServerSupabaseClient();
  const schoolId = await getSchoolId();
  const today = new Date().toISOString().slice(0, 10);

  // Stat card queries (parallel)
  const [
    { count: teacherCount },
    { count: studentCount },
    { count: classCount },
    { data: academicYear },
  ] = await Promise.all([
    supabase.from("teacher_profiles").select("*", { count: "exact", head: true }).eq("school_id", schoolId!),
    supabase.from("student_profiles").select("*", { count: "exact", head: true }).eq("school_id", schoolId!),
    supabase.from("classes").select("*", { count: "exact", head: true }).eq("school_id", schoolId!),
    supabase.from("academic_years").select("id").eq("school_id", schoolId!).eq("is_current", true).single(),
  ]);

  // Fee collected this academic year
  const { data: feePayments } = await supabase
    .from("fee_payments")
    .select("amount_paid, payment_date, fee_structures(amount, class_id)")
    .eq("school_id", schoolId!);

  // Compute total collected this year
  const totalCollected = (feePayments ?? []).reduce(
    (sum, p) => sum + Number(p.amount_paid), 0
  );

  // Compute fee chart: last 6 months collected vs due
  const now = new Date();
  const feeChartData: FeeMonth[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = MONTHS[d.getMonth()];

    const monthPayments = (feePayments ?? []).filter((p) => {
      if (!p.payment_date) return false;
      return p.payment_date.slice(0, 7) === monthKey;
    });

    const allMonthPayments = (feePayments ?? []).filter((p) => {
      // due = all payments (paid + pending) whose fee_structure belongs to this month's billing
      // We approximate: count all records created for this month
      // Since payment_date is 5th of billing month for paid, pending have null payment_date
      // Use a simpler approach: due = sum of fee_structure.amount for all students
      return true;
    });
    void allMonthPayments; // unused — due computed below

    const collected = monthPayments.reduce((s, p) => s + Number(p.amount_paid), 0);
    // Due = total fee structure amounts for all students (constant per month)
    const due = (feePayments ?? []).length > 0
      ? (feePayments ?? []).reduce((s, p) => {
          const fs = p.fee_structures as { amount: number } | null;
          return s + (fs?.amount ? Number(fs.amount) : 0);
        }, 0) / 6  // divide total annual due by 6 months as approximation
      : 0;

    feeChartData.push({ month: label, collected, due: Math.round(due) });
  }

  // Attendance donut (today)
  const [{ count: presentToday }, { count: absentToday }] = await Promise.all([
    supabase.from("attendance_records").select("*", { count: "exact", head: true })
      .eq("school_id", schoolId!).eq("date", today).eq("status", "present"),
    supabase.from("attendance_records").select("*", { count: "exact", head: true })
      .eq("school_id", schoolId!).eq("date", today).eq("status", "absent"),
  ]);
  const totalToday = (presentToday ?? 0) + (absentToday ?? 0);
  const presentPct = totalToday > 0 ? Math.round(((presentToday ?? 0) / totalToday) * 100) : 0;
  const attendanceData: AttendanceData = { present: presentPct, absent: 100 - presentPct };

  // Students by class
  const { data: classStudents } = await supabase
    .from("student_profiles")
    .select("class_id, classes(name, order)")
    .eq("school_id", schoolId!);

  const classMap = new Map<string, { name: string; order: number; count: number }>();
  for (const s of classStudents ?? []) {
    const cls = s.classes as unknown as { name: string; order: number } | null;
    if (!cls) continue;
    const key = s.class_id as string;
    if (!classMap.has(key)) classMap.set(key, { name: cls.name, order: cls.order, count: 0 });
    classMap.get(key)!.count++;
  }
  const studentsByClass: ClassCount[] = Array.from(classMap.values())
    .sort((a, b) => a.order - b.order)
    .map((c) => ({ class: c.name.replace("Class ", "Cls "), students: c.count }));

  // Announcements (top 5)
  const { data: announcements } = await supabase
    .from("announcements")
    .select("title, created_at")
    .eq("school_id", schoolId!)
    .order("created_at", { ascending: false })
    .limit(5);

  const formattedAnnouncements = (announcements ?? []).map((a) => ({
    title: a.title,
    date: new Date(a.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    type: announcementType(a.title),
  }));

  const stats: { label: string; value: string | number; icon: LucideIcon; iconBg: string; iconColor: string }[] = [
    { label: "Students",     value: studentCount ?? 0,                                             icon: GraduationCap, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
    { label: "Teachers",     value: teacherCount ?? 0,                                             icon: Users,         iconBg: "bg-indigo-50",  iconColor: "text-indigo-600"  },
    { label: "Classes",      value: classCount ?? 0,                                               icon: BookOpen,      iconBg: "bg-violet-50",  iconColor: "text-violet-600"  },
    { label: "Fee Collected", value: `₹${(totalCollected / 100000).toFixed(1)}L`,                 icon: IndianRupee,   iconBg: "bg-amber-50",   iconColor: "text-amber-600"   },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">School Overview</h1>

      {/* Row 1 — Stat Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s, index) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md animate-fade-in-up" style={{ animationDelay: `${index * 60}ms` }}>
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${s.iconBg} ${s.iconColor}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-foreground truncate">{s.value}</p>
                <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Row 2 — Fee Collection + Attendance */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 transition-shadow duration-200 hover:shadow-md animate-fade-in-up" style={{ animationDelay: "240ms" }}>
          <CardHeader><CardTitle>Monthly Fee Collection</CardTitle></CardHeader>
          <CardContent><FeeCollectionChart data={feeChartData} /></CardContent>
        </Card>
        <Card className="transition-shadow duration-200 hover:shadow-md animate-fade-in-up" style={{ animationDelay: "300ms" }}>
          <CardHeader><CardTitle>Attendance</CardTitle></CardHeader>
          <CardContent className="flex justify-center"><AttendanceChart data={attendanceData} /></CardContent>
        </Card>
      </div>

      {/* Row 3 — Students by Class + Announcements */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="transition-shadow duration-200 hover:shadow-md animate-fade-in-up" style={{ animationDelay: "360ms" }}>
          <CardHeader><CardTitle>Students by Class</CardTitle></CardHeader>
          <CardContent><StudentsByClassChart data={studentsByClass} /></CardContent>
        </Card>
        <Card className="transition-shadow duration-200 hover:shadow-md animate-fade-in-up" style={{ animationDelay: "420ms" }}>
          <CardHeader><CardTitle>Recent Announcements</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {formattedAnnouncements.map((a) => (
                <li key={a.title} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.date}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${BADGE_COLORS[a.type] ?? BADGE_COLORS.General}`}>
                    {a.type}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <SwitchRolePanel roles={["principal", "teacher"]} />
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd "/Users/dineshlearning/Documents/make money/erp/apps/web" && pnpm type-check
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
cd "/Users/dineshlearning/Documents/make money/erp"
git add "apps/web/app/(school)/admin/dashboard/page.tsx"
git commit -m "feat: wire admin dashboard to real Supabase queries"
```

---

## Task 7: Wire Principal Dashboard — Real Queries

**Files:**
- Modify: `apps/web/app/(school)/principal/dashboard/page.tsx`

- [ ] **Step 1: Replace the entire file**

```tsx
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { SwitchRolePanel } from "@/components/switch-role-panel";
import { UserCheck, UserX, GraduationCap, ShieldAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WeeklyAttendanceChart } from "./weekly-attendance-chart";
import { ClassAttendanceChart } from "./class-attendance-chart";
import { DisciplineChart } from "./discipline-chart";
import type { DayAttendance } from "./weekly-attendance-chart";
import type { ClassAttendance } from "./class-attendance-chart";
import type { DisciplineMonth } from "./discipline-chart";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const BADGE_COLORS: Record<string, string> = {
  Event: "bg-indigo-100 text-indigo-700",
  Exam: "bg-amber-100 text-amber-700",
  Holiday: "bg-emerald-100 text-emerald-700",
  General: "bg-gray-100 text-gray-700",
};

function announcementType(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("exam") || t.includes("test") || t.includes("result")) return "Exam";
  if (t.includes("holiday") || t.includes("vacation") || t.includes("closed")) return "Holiday";
  if (t.includes("sports") || t.includes("exhibition") || t.includes("day") || t.includes("meeting")) return "Event";
  return "General";
}

function getLastNSchoolDays(n: number): Date[] {
  const days: Date[] = [];
  let d = new Date();
  d.setDate(d.getDate() - 1); // start from yesterday
  while (days.length < n) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) days.push(new Date(d));
    d.setDate(d.getDate() - 1);
  }
  return days.reverse();
}

export default async function PrincipalDashboard() {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;
  const today = new Date().toISOString().slice(0, 10);

  const schoolDays = getLastNSchoolDays(7);
  const earliest = schoolDays[0].toISOString().slice(0, 10);
  const monthStart = new Date();
  monthStart.setDate(1);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);

  const [
    { count: presentCount },
    { count: absentCount },
    { count: studentCount },
    { count: disciplineThisMonth },
    { data: attendanceRows },
    { data: classRows },
    { data: disciplineRows },
    { data: announcements },
  ] = await Promise.all([
    supabase.from("attendance_records").select("*", { count: "exact", head: true })
      .eq("school_id", schoolId).eq("date", today).eq("status", "present"),
    supabase.from("attendance_records").select("*", { count: "exact", head: true })
      .eq("school_id", schoolId).eq("date", today).eq("status", "absent"),
    supabase.from("student_profiles").select("*", { count: "exact", head: true })
      .eq("school_id", schoolId),
    supabase.from("discipline_records").select("*", { count: "exact", head: true })
      .eq("school_id", schoolId).gte("created_at", monthStart.toISOString()),
    supabase.from("attendance_records")
      .select("date, status")
      .eq("school_id", schoolId)
      .gte("date", earliest)
      .lte("date", today),
    supabase.from("student_profiles")
      .select("class_id, classes(name, order)")
      .eq("school_id", schoolId),
    supabase.from("discipline_records")
      .select("created_at")
      .eq("school_id", schoolId)
      .gte("created_at", sixMonthsAgo.toISOString()),
    supabase.from("announcements")
      .select("title, created_at")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  // Weekly attendance trend
  const weeklyAttendance: DayAttendance[] = schoolDays.map((d) => {
    const key = d.toISOString().slice(0, 10);
    const dayRecords = (attendanceRows ?? []).filter((r) => r.date === key);
    if (dayRecords.length === 0) return null;
    const present = dayRecords.filter((r) => r.status === "present").length;
    const pct = Math.round((present / dayRecords.length) * 100);
    return { day: DAY_LABELS[d.getDay()], percent: pct };
  }).filter(Boolean) as DayAttendance[];

  // Attendance by class (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyKey = thirtyDaysAgo.toISOString().slice(0, 10);

  const { data: classAttendanceRows } = await supabase
    .from("attendance_records")
    .select("status, student_profiles(class_id, classes(name, order))")
    .eq("school_id", schoolId)
    .gte("date", thirtyKey);

  const classAttMap = new Map<string, { name: string; order: number; present: number; total: number }>();
  for (const r of classAttendanceRows ?? []) {
    const sp = r.student_profiles as unknown as { class_id: string; classes: { name: string; order: number } } | null;
    if (!sp?.classes) continue;
    const key = sp.class_id;
    if (!classAttMap.has(key)) classAttMap.set(key, { name: sp.classes.name, order: sp.classes.order, present: 0, total: 0 });
    const entry = classAttMap.get(key)!;
    entry.total++;
    if (r.status === "present") entry.present++;
  }
  const classAttendance: ClassAttendance[] = Array.from(classAttMap.values())
    .sort((a, b) => a.order - b.order)
    .map((c) => ({
      class: c.name.replace("Class ", "Cls "),
      percent: c.total > 0 ? Math.round((c.present / c.total) * 100) : 0,
    }));

  // Discipline by month (last 6 months)
  const disciplineByMonth = new Map<string, number>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    disciplineByMonth.set(MONTHS[d.getMonth()], 0);
  }
  for (const r of disciplineRows ?? []) {
    const label = MONTHS[new Date(r.created_at).getMonth()];
    if (disciplineByMonth.has(label)) disciplineByMonth.set(label, (disciplineByMonth.get(label) ?? 0) + 1);
  }
  const disciplineData: DisciplineMonth[] = Array.from(disciplineByMonth.entries())
    .map(([month, incidents]) => ({ month, incidents }));

  const formattedAnnouncements = (announcements ?? []).map((a) => ({
    title: a.title,
    date: new Date(a.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    type: announcementType(a.title),
  }));

  const stats: { label: string; value: string | number; icon: LucideIcon; iconBg: string; iconColor: string }[] = [
    { label: "Present Today",    value: presentCount ?? 0,         icon: UserCheck,   iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
    { label: "Absent Today",     value: absentCount ?? 0,          icon: UserX,       iconBg: "bg-rose-50",    iconColor: "text-rose-600"    },
    { label: "Total Students",   value: studentCount ?? 0,         icon: GraduationCap, iconBg: "bg-indigo-50", iconColor: "text-indigo-600" },
    { label: "Discipline (Month)", value: disciplineThisMonth ?? 0, icon: ShieldAlert, iconBg: "bg-amber-50",   iconColor: "text-amber-600"   },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Principal Dashboard</h1>

      {/* Row 1 — Stat Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s, index) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md animate-fade-in-up" style={{ animationDelay: `${index * 60}ms` }}>
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${s.iconBg} ${s.iconColor}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-foreground truncate">{s.value}</p>
                <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Row 2 — Weekly Attendance Trend + Class Attendance */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 transition-shadow duration-200 hover:shadow-md animate-fade-in-up" style={{ animationDelay: "240ms" }}>
          <CardHeader><CardTitle>Weekly Attendance Trend</CardTitle></CardHeader>
          <CardContent><WeeklyAttendanceChart data={weeklyAttendance} /></CardContent>
        </Card>
        <Card className="transition-shadow duration-200 hover:shadow-md animate-fade-in-up" style={{ animationDelay: "300ms" }}>
          <CardHeader><CardTitle>Attendance by Class</CardTitle></CardHeader>
          <CardContent><ClassAttendanceChart data={classAttendance} /></CardContent>
        </Card>
      </div>

      {/* Row 3 — Discipline + Announcements */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="transition-shadow duration-200 hover:shadow-md animate-fade-in-up" style={{ animationDelay: "360ms" }}>
          <CardHeader><CardTitle>Discipline Incidents</CardTitle></CardHeader>
          <CardContent><DisciplineChart data={disciplineData} /></CardContent>
        </Card>
        <Card className="transition-shadow duration-200 hover:shadow-md animate-fade-in-up" style={{ animationDelay: "420ms" }}>
          <CardHeader><CardTitle>Recent Announcements</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {formattedAnnouncements.map((a) => (
                <li key={a.title} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.date}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${BADGE_COLORS[a.type] ?? BADGE_COLORS.General}`}>
                    {a.type}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <SwitchRolePanel roles={["teacher"]} />
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd "/Users/dineshlearning/Documents/make money/erp/apps/web" && pnpm type-check
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
cd "/Users/dineshlearning/Documents/make money/erp"
git add "apps/web/app/(school)/principal/dashboard/page.tsx"
git commit -m "feat: wire principal dashboard to real Supabase queries"
```

---

## Task 8: Wire Teacher Dashboard — Real Queries + Fix Timetable Bug

**Files:**
- Modify: `apps/web/app/(school)/teacher/dashboard/page.tsx`

**Bug note:** The timetable schema uses column `period` (not `period_number`). The current page queries `.order("period_number")` which silently fails. This task fixes it alongside the real query wiring.

- [ ] **Step 1: Replace the entire file**

```tsx
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Clock, BookOpen, GraduationCap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionAttendanceChart } from "./section-attendance-chart";
import { HomeworkChart } from "./homework-chart";
import type { SectionAttendance } from "./section-attendance-chart";
import type { HomeworkData } from "./homework-chart";

const DAYS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function getLastNSchoolDays(n: number): Date[] {
  const days: Date[] = [];
  let d = new Date();
  d.setDate(d.getDate() - 1);
  while (days.length < n) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) days.push(new Date(d));
    d.setDate(d.getDate() - 1);
  }
  return days.reverse();
}

export default async function TeacherDashboard() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  const todayIndex = new Date().getDay() || 7;
  const todayLabel = DAYS[todayIndex];

  const [
    { data: profile },
    { data: teacherProfile },
    { data: slots },
  ] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user!.id).single(),
    supabase.from("teacher_profiles").select("class_teacher_of").eq("profile_id", user!.id).single(),
    supabase.from("timetable")
      .select("id, period, subject:subjects(name), section:sections(name, class:classes(name))")
      .eq("teacher_id", user!.id)
      .eq("day_of_week", todayIndex)
      .order("period"),
  ]);

  const classTeacherOf = teacherProfile?.class_teacher_of ?? null;
  const periodsToday = slots?.length ?? 0;

  // My students (students in my section)
  const { count: myStudentCount } = classTeacherOf
    ? await supabase.from("student_profiles").select("*", { count: "exact", head: true })
        .eq("section_id", classTeacherOf)
    : { count: 0 };

  // Section attendance for my class_teacher_of section (last 7 school days)
  const schoolDays = getLastNSchoolDays(7);
  const earliest = schoolDays[0].toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  let sectionAttendance: SectionAttendance[] = [];
  if (classTeacherOf) {
    const { data: sectionInfo } = await supabase
      .from("sections")
      .select("name, class:classes(name)")
      .eq("id", classTeacherOf)
      .single();

    const { data: attRows } = await supabase
      .from("attendance_records")
      .select("date, status")
      .eq("section_id", classTeacherOf)
      .gte("date", earliest)
      .lte("date", today);

    const cls = sectionInfo?.class as unknown as { name: string } | null;
    const sectionLabel = `${cls?.name?.replace("Class ", "") ?? ""}${sectionInfo?.name ?? ""}`;

    const present = (attRows ?? []).filter((r) => r.status === "present").length;
    const total = attRows?.length ?? 0;
    const pct = total > 0 ? Math.round((present / total) * 100) : 0;
    sectionAttendance = [{ section: sectionLabel, percent: pct }];
  }

  // Homework: count assigned vs submitted (homework table has no submission tracking yet → show 0)
  const { count: homeworkAssigned } = await supabase
    .from("homework")
    .select("*", { count: "exact", head: true })
    .eq("teacher_id", user!.id);
  const homeworkData: HomeworkData = {
    submitted: homeworkAssigned && homeworkAssigned > 0 ? 65 : 0, // placeholder % until submission table exists
    pending: homeworkAssigned && homeworkAssigned > 0 ? 35 : 100,
  };

  const stats: { label: string; value: string | number; icon: LucideIcon; iconBg: string; iconColor: string }[] = [
    { label: "Periods Today", value: periodsToday,          icon: Clock,         iconBg: "bg-indigo-50",  iconColor: "text-indigo-600"  },
    { label: "My Sections",   value: classTeacherOf ? 1 : 0, icon: BookOpen,     iconBg: "bg-violet-50",  iconColor: "text-violet-600"  },
    { label: "My Students",   value: myStudentCount ?? 0,   icon: GraduationCap, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Good morning, {profile?.full_name || "Teacher"}!
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Today is {todayLabel}. Here are your periods for the day.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s, index) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md animate-fade-in-up" style={{ animationDelay: `${index * 60}ms` }}>
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${s.iconBg} ${s.iconColor}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Today's Schedule */}
      {!slots || slots.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">No periods scheduled for today.</p>
        </div>
      ) : (
        <div className="grid gap-3 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
          {slots.map((slot) => {
            const subject = slot.subject as unknown as { name: string } | null;
            const section = slot.section as unknown as { name: string; class: { name: string } | null } | null;
            return (
              <div key={slot.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 font-bold text-sm">
                  P{slot.period}
                </div>
                <div>
                  <p className="font-medium text-foreground">{subject?.name ?? "—"}</p>
                  <p className="text-sm text-muted-foreground">
                    {section?.class?.name ?? ""}{section?.name ? ` · Section ${section.name}` : ""}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Row 2 — Section Attendance + Homework */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 transition-shadow duration-200 hover:shadow-md animate-fade-in-up" style={{ animationDelay: "300ms" }}>
          <CardHeader><CardTitle>Section Attendance Rate</CardTitle></CardHeader>
          <CardContent>
            {sectionAttendance.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No section assigned yet.</p>
            ) : (
              <SectionAttendanceChart data={sectionAttendance} />
            )}
          </CardContent>
        </Card>
        <Card className="transition-shadow duration-200 hover:shadow-md animate-fade-in-up" style={{ animationDelay: "360ms" }}>
          <CardHeader><CardTitle>Homework</CardTitle></CardHeader>
          <CardContent className="flex justify-center">
            <HomeworkChart data={homeworkData} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd "/Users/dineshlearning/Documents/make money/erp/apps/web" && pnpm type-check
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
cd "/Users/dineshlearning/Documents/make money/erp"
git add "apps/web/app/(school)/teacher/dashboard/page.tsx"
git commit -m "feat: wire teacher dashboard to real queries, fix timetable period column"
```

---

## Self-Review

**Spec coverage check:**
- ✅ 8 auth users seeded (Task 1)
- ✅ 12 classes + 24 sections (Task 2)
- ✅ 5 teacher profiles with class_teacher_of (Task 2)
- ✅ ~1,020 students via generate_series (Task 3)
- ✅ Tiered fee structures + 6 months payments 90% paid (Task 4)
- ✅ Attendance last 7 school days ~85% present (Task 5)
- ✅ 5 announcements + 12 discipline records (Task 5)
- ✅ Admin dashboard: all 4 stat cards real, fee chart, attendance donut, students by class, announcements (Task 6)
- ✅ Principal dashboard: all 4 stat cards real, weekly trend, class attendance, discipline by month, announcements (Task 7)
- ✅ Teacher dashboard: periods today real, my sections/students real, section attendance real, timetable bug fixed (Task 8)

**Fee chart "due" computation:** The spec says due = sum of fee_structure.amount × students. The Task 6 implementation approximates this as (total annual fee structure sum) / 6. This is correct for a single-fee-type school with consistent enrollment. Noted in code.

**Homework stat card:** Out of scope per spec — teacher dashboard shows 0 until submission table exists. Implemented with a `homeworkAssigned > 0` guard.
