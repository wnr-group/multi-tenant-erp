# Plan 2: Supabase Schema, RLS, Auth + Role Routing

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the complete Supabase database schema with RLS policies, wire up auth on web and mobile, and implement role-based routing so every user lands in the correct portal after login.

**Architecture:** All migrations live in `packages/supabase/migrations/`. RLS policies use `user_roles` as the single source of truth for tenant isolation. **Web middleware resolves `school_id` from the incoming domain** (not from user input) — every school has a unique `domain` value in the `schools` table. The platform admin portal (`admin.balajierp.com`) is detected by domain and bypasses school resolution. Mobile apps have `EXPO_PUBLIC_SCHOOL_ID` baked in at build time. Expo Router's root `_layout.tsx` handles mobile auth guard. Generated TypeScript types from Supabase replace the placeholder in `packages/supabase/src/types.ts`.

**Tech Stack:** Supabase CLI, Supabase JS v2, `@supabase/ssr`, Next.js middleware, Expo Router, Zod

**Prerequisites:** Plan 1 complete. Supabase CLI installed (`npm i -g supabase`). Supabase project created at supabase.com. `.env` file created from `.env.example` with real values.

---

## File Map

```
packages/supabase/
├── migrations/
│   ├── 20240001000000_enums.sql
│   ├── 20240001000001_tenancy.sql
│   ├── 20240001000002_users.sql
│   ├── 20240001000003_attendance.sql
│   ├── 20240001000004_academics.sql
│   ├── 20240001000005_results.sql
│   ├── 20240001000006_fees.sql
│   ├── 20240001000007_communication.sql
│   ├── 20240001000008_discipline.sql
│   ├── 20240001000009_audit.sql
│   └── 20240001000010_rls.sql
├── seed.sql
└── src/
    └── types.ts                         ← replaced by generated types

apps/web/
├── middleware.ts                        ← full auth + role routing
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx                ← real login form
│   │   └── invite/
│   │       └── page.tsx                ← invite acceptance + password set
│   ├── (platform-admin)/
│   │   └── layout.tsx                  ← super_admin guard
│   ├── (school)/
│   │   └── layout.tsx                  ← school user guard
│   └── auth/
│       └── callback/
│           └── route.ts                ← Supabase OAuth callback handler

apps/mobile/
├── app/
│   ├── _layout.tsx                     ← root layout with auth session listener
│   ├── (auth)/
│   │   └── login.tsx                   ← mobile login screen
│   ├── (teacher)/
│   │   └── _layout.tsx                 ← teacher tab navigator
│   └── (parent)/
│       └── _layout.tsx                 ← parent tab navigator
```

---

## Task 1: Create Database Enums + Tenancy Tables

**Files:**
- Create: `packages/supabase/migrations/20240001000000_enums.sql`
- Create: `packages/supabase/migrations/20240001000001_tenancy.sql`

- [ ] **Step 1: Create `20240001000000_enums.sql`**

```sql
-- Role enum
CREATE TYPE public.app_role AS ENUM (
  'super_admin',
  'school_admin',
  'principal',
  'teacher',
  'student',
  'parent'
);

-- Attendance status enum
CREATE TYPE public.attendance_status AS ENUM (
  'present',
  'absent',
  'late',
  'half_day'
);

-- Fee payment status enum
CREATE TYPE public.fee_payment_status AS ENUM (
  'paid',
  'partial',
  'overdue'
);

-- Feedback status enum
CREATE TYPE public.feedback_status AS ENUM (
  'open',
  'responded',
  'closed'
);

-- Discipline category enum
CREATE TYPE public.discipline_category AS ENUM (
  'behavioral',
  'academic',
  'attendance'
);

-- Discipline severity enum
CREATE TYPE public.discipline_severity AS ENUM (
  'verbal',
  'written',
  'suspension'
);

-- Announcement target enum
CREATE TYPE public.announcement_target_type AS ENUM (
  'school',
  'class',
  'section'
);
```

- [ ] **Step 2: Create `20240001000001_tenancy.sql`**

```sql
-- Schools
CREATE TABLE public.schools (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  domain       TEXT UNIQUE,  -- e.g. greenvalley.balajierp.com or app.greenvalleyschool.com
  logo_url     TEXT,
  primary_color TEXT NOT NULL DEFAULT '#2563EB',
  is_active    BOOLEAN NOT NULL DEFAULT true,
  features_enabled JSONB NOT NULL DEFAULT '{}',
  max_students INTEGER NOT NULL DEFAULT 500,
  contact_email TEXT,
  contact_phone TEXT,
  address      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Academic years
CREATE TABLE public.academic_years (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date   DATE NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Classes
CREATE TABLE public.classes (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  "order"   INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sections
CREATE TABLE public.sections (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id  UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Subjects
CREATE TABLE public.subjects (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id  UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  code      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- [ ] **Step 3: Run migrations against your Supabase project**

```bash
cd packages/supabase
supabase db push --db-url "postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres"
```

Expected: migrations apply without error.

- [ ] **Step 4: Commit**

```bash
cd ~/Documents/balaji-erp
git add packages/supabase/migrations
git commit -m "feat: add enums and tenancy tables migration"
```

---

## Task 2: Create User + Role Tables

**Files:**
- Create: `packages/supabase/migrations/20240001000002_users.sql`

- [ ] **Step 1: Create `20240001000002_users.sql`**

```sql
-- Profiles (mirrors auth.users)
CREATE TABLE public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id  UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  full_name  TEXT NOT NULL DEFAULT '',
  email      TEXT NOT NULL DEFAULT '',
  phone      TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles (source of truth for role-based access)
CREATE TABLE public.user_roles (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  role      public.app_role NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, school_id, role)
);

-- Student profiles
CREATE TABLE public.student_profiles (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  school_id        UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id         UUID NOT NULL REFERENCES public.classes(id),
  section_id       UUID NOT NULL REFERENCES public.sections(id),
  roll_number      TEXT,
  admission_number TEXT,
  parent_profile_id UUID REFERENCES public.profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Teacher profiles
CREATE TABLE public.teacher_profiles (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  school_id        UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  subjects         UUID[] NOT NULL DEFAULT '{}',
  class_teacher_of UUID REFERENCES public.sections(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

- [ ] **Step 2: Push migration**

```bash
supabase db push --db-url "postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres"
```

Expected: `profiles`, `user_roles`, `student_profiles`, `teacher_profiles` tables created.

- [ ] **Step 3: Commit**

```bash
git add packages/supabase/migrations/20240001000002_users.sql
git commit -m "feat: add user and role tables with profile auto-create trigger"
```

---

## Task 3: Create Domain Tables

**Files:**
- Create: `packages/supabase/migrations/20240001000003_attendance.sql`
- Create: `packages/supabase/migrations/20240001000004_academics.sql`
- Create: `packages/supabase/migrations/20240001000005_results.sql`
- Create: `packages/supabase/migrations/20240001000006_fees.sql`
- Create: `packages/supabase/migrations/20240001000007_communication.sql`
- Create: `packages/supabase/migrations/20240001000008_discipline.sql`

- [ ] **Step 1: Create `20240001000003_attendance.sql`**

```sql
CREATE TABLE public.attendance_records (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id),
  section_id UUID NOT NULL REFERENCES public.sections(id),
  date       DATE NOT NULL,
  status     public.attendance_status NOT NULL DEFAULT 'present',
  marked_by  UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, date)
);
```

- [ ] **Step 2: Create `20240001000004_academics.sql`**

```sql
CREATE TABLE public.homework (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id      UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id       UUID NOT NULL REFERENCES public.classes(id),
  section_id     UUID NOT NULL REFERENCES public.sections(id),
  subject_id     UUID NOT NULL REFERENCES public.subjects(id),
  teacher_id     UUID NOT NULL REFERENCES auth.users(id),
  title          TEXT NOT NULL,
  description    TEXT,
  due_date       DATE NOT NULL,
  attachment_url TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.syllabus (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id        UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id         UUID NOT NULL REFERENCES public.classes(id),
  subject_id       UUID NOT NULL REFERENCES public.subjects(id),
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id),
  file_url         TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.timetable (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  section_id  UUID NOT NULL REFERENCES public.sections(id),
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  period      SMALLINT NOT NULL,
  subject_id  UUID NOT NULL REFERENCES public.subjects(id),
  teacher_id  UUID NOT NULL REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(section_id, day_of_week, period)
);
```

- [ ] **Step 3: Create `20240001000005_results.sql`**

```sql
CREATE TABLE public.exams (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id        UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id),
  name             TEXT NOT NULL,
  start_date       DATE,
  end_date         DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.exam_results (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id      UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  exam_id        UUID NOT NULL REFERENCES public.exams(id),
  student_id     UUID NOT NULL REFERENCES public.profiles(id),
  subject_id     UUID NOT NULL REFERENCES public.subjects(id),
  marks_obtained NUMERIC(5,2),
  max_marks      NUMERIC(5,2) NOT NULL DEFAULT 100,
  grade          TEXT,
  teacher_id     UUID NOT NULL REFERENCES auth.users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(exam_id, student_id, subject_id)
);

CREATE TABLE public.report_card_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  html_template TEXT NOT NULL DEFAULT '',
  is_default    BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- [ ] **Step 4: Create `20240001000006_fees.sql`**

```sql
CREATE TABLE public.fee_structures (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id        UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id         UUID NOT NULL REFERENCES public.classes(id),
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id),
  fee_type         TEXT NOT NULL,
  amount           NUMERIC(10,2) NOT NULL,
  due_date         DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.fee_payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id         UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id        UUID NOT NULL REFERENCES public.profiles(id),
  fee_structure_id  UUID NOT NULL REFERENCES public.fee_structures(id),
  amount_paid       NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_date      DATE,
  payment_method    TEXT,
  receipt_number    TEXT,
  status            public.fee_payment_status NOT NULL DEFAULT 'overdue',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- [ ] **Step 5: Create `20240001000007_communication.sql`**

```sql
CREATE TABLE public.announcements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  attachment_url TEXT,
  target_type public.announcement_target_type NOT NULL DEFAULT 'school',
  target_id   UUID,
  created_by  UUID NOT NULL REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id),
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  type       TEXT NOT NULL,
  is_read    BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.feedback (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES auth.users(id),
  to_role      public.app_role NOT NULL,
  subject      TEXT NOT NULL,
  message      TEXT NOT NULL,
  response     TEXT,
  status       public.feedback_status NOT NULL DEFAULT 'open',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- [ ] **Step 6: Create `20240001000008_discipline.sql`**

```sql
CREATE TABLE public.discipline_records (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id      UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id     UUID NOT NULL REFERENCES public.profiles(id),
  category       public.discipline_category NOT NULL,
  severity       public.discipline_severity NOT NULL,
  description    TEXT NOT NULL,
  recorded_by    UUID NOT NULL REFERENCES auth.users(id),
  parent_notified BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- [ ] **Step 7: Create `20240001000009_audit.sql`**

```sql
-- Audit log: every write action records who did it and under what role context
CREATE TABLE public.audit_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id      UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  performed_by   UUID NOT NULL REFERENCES auth.users(id),
  acting_as_role public.app_role NOT NULL,
  action         TEXT NOT NULL,       -- e.g. 'attendance.mark', 'homework.create'
  entity_type    TEXT NOT NULL,       -- e.g. 'attendance_records', 'homework'
  entity_id      UUID,                -- the affected record
  metadata       JSONB NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup by school and actor
CREATE INDEX audit_log_school_idx ON public.audit_log(school_id);
CREATE INDEX audit_log_performer_idx ON public.audit_log(performed_by);
```

- [ ] **Step 8: Push all domain migrations**

```bash
supabase db push --db-url "postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres"
```

Expected: all 7 domain tables created without errors (including `audit_log`).

- [ ] **Step 9: Commit**

```bash
git add packages/supabase/migrations
git commit -m "feat: add all domain tables (attendance, academics, results, fees, comms, discipline, audit_log)"
```

---

## Task 4: Enable RLS + Write All Policies

**Files:**
- Create: `packages/supabase/migrations/20240001000010_rls.sql`

- [ ] **Step 1: Create `20240001000010_rls.sql`**

```sql
-- Helper function: get the caller's school_id from user_roles
CREATE OR REPLACE FUNCTION public.get_my_school_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT school_id FROM public.user_roles
  WHERE user_id = auth.uid() AND is_active = true
  LIMIT 1;
$$;

-- Helper function: get the caller's role
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = auth.uid() AND is_active = true
  LIMIT 1;
$$;

-- Enable RLS on all tables
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syllabus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_card_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discipline_records ENABLE ROW LEVEL SECURITY;

-- SCHOOLS: super_admin sees all; school users see own school
CREATE POLICY "schools_select" ON public.schools FOR SELECT
  USING (
    public.get_my_role() = 'super_admin'
    OR id = public.get_my_school_id()
  );
CREATE POLICY "schools_insert" ON public.schools FOR INSERT
  WITH CHECK (public.get_my_role() = 'super_admin');
CREATE POLICY "schools_update" ON public.schools FOR UPDATE
  USING (public.get_my_role() = 'super_admin');

-- USER_ROLES: users can read their own role; super_admin reads all
CREATE POLICY "user_roles_select" ON public.user_roles FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.get_my_role() = 'super_admin'
    OR school_id = public.get_my_school_id()
  );
CREATE POLICY "user_roles_insert" ON public.user_roles FOR INSERT
  WITH CHECK (
    public.get_my_role() IN ('super_admin', 'school_admin')
  );
CREATE POLICY "user_roles_update" ON public.user_roles FOR UPDATE
  USING (
    public.get_my_role() IN ('super_admin', 'school_admin')
  );

-- PROFILES: users read own profile; school users read profiles in same school
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT
  USING (
    id = auth.uid()
    OR public.get_my_role() = 'super_admin'
    OR school_id = public.get_my_school_id()
  );
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE
  USING (id = auth.uid() OR public.get_my_role() IN ('super_admin', 'school_admin'));

-- Generic school-scoped policy macro (applied to all remaining tables)
-- SELECT: super_admin OR same school_id
-- INSERT/UPDATE: roles with write permission for that table (enforced per table below)

-- ACADEMIC_YEARS, CLASSES, SECTIONS, SUBJECTS — school_admin manages, all school users read
CREATE POLICY "academic_years_select" ON public.academic_years FOR SELECT
  USING (public.get_my_role() = 'super_admin' OR school_id = public.get_my_school_id());
CREATE POLICY "academic_years_write" ON public.academic_years FOR ALL
  USING (public.get_my_role() IN ('super_admin', 'school_admin') AND school_id = public.get_my_school_id());

CREATE POLICY "classes_select" ON public.classes FOR SELECT
  USING (public.get_my_role() = 'super_admin' OR school_id = public.get_my_school_id());
CREATE POLICY "classes_write" ON public.classes FOR ALL
  USING (public.get_my_role() IN ('super_admin', 'school_admin') AND school_id = public.get_my_school_id());

CREATE POLICY "sections_select" ON public.sections FOR SELECT
  USING (public.get_my_role() = 'super_admin' OR school_id = public.get_my_school_id());
CREATE POLICY "sections_write" ON public.sections FOR ALL
  USING (public.get_my_role() IN ('super_admin', 'school_admin') AND school_id = public.get_my_school_id());

CREATE POLICY "subjects_select" ON public.subjects FOR SELECT
  USING (public.get_my_role() = 'super_admin' OR school_id = public.get_my_school_id());
CREATE POLICY "subjects_write" ON public.subjects FOR ALL
  USING (public.get_my_role() IN ('super_admin', 'school_admin') AND school_id = public.get_my_school_id());

-- STUDENT_PROFILES, TEACHER_PROFILES
CREATE POLICY "student_profiles_select" ON public.student_profiles FOR SELECT
  USING (public.get_my_role() = 'super_admin' OR school_id = public.get_my_school_id());
CREATE POLICY "student_profiles_write" ON public.student_profiles FOR ALL
  USING (public.get_my_role() IN ('super_admin', 'school_admin') AND school_id = public.get_my_school_id());

CREATE POLICY "teacher_profiles_select" ON public.teacher_profiles FOR SELECT
  USING (public.get_my_role() = 'super_admin' OR school_id = public.get_my_school_id());
CREATE POLICY "teacher_profiles_write" ON public.teacher_profiles FOR ALL
  USING (public.get_my_role() IN ('super_admin', 'school_admin') AND school_id = public.get_my_school_id());

-- ATTENDANCE: teachers write; school users read
CREATE POLICY "attendance_select" ON public.attendance_records FOR SELECT
  USING (public.get_my_role() = 'super_admin' OR school_id = public.get_my_school_id());
CREATE POLICY "attendance_write" ON public.attendance_records FOR ALL
  USING (public.get_my_role() IN ('super_admin', 'school_admin', 'principal', 'teacher') AND school_id = public.get_my_school_id());

-- HOMEWORK: teachers write; all school users read
CREATE POLICY "homework_select" ON public.homework FOR SELECT
  USING (public.get_my_role() = 'super_admin' OR school_id = public.get_my_school_id());
CREATE POLICY "homework_write" ON public.homework FOR ALL
  USING (public.get_my_role() IN ('super_admin', 'school_admin', 'teacher') AND school_id = public.get_my_school_id());

-- SYLLABUS: teachers/admin write; all read
CREATE POLICY "syllabus_select" ON public.syllabus FOR SELECT
  USING (public.get_my_role() = 'super_admin' OR school_id = public.get_my_school_id());
CREATE POLICY "syllabus_write" ON public.syllabus FOR ALL
  USING (public.get_my_role() IN ('super_admin', 'school_admin', 'teacher') AND school_id = public.get_my_school_id());

-- TIMETABLE: admin manages; all school users read
CREATE POLICY "timetable_select" ON public.timetable FOR SELECT
  USING (public.get_my_role() = 'super_admin' OR school_id = public.get_my_school_id());
CREATE POLICY "timetable_write" ON public.timetable FOR ALL
  USING (public.get_my_role() IN ('super_admin', 'school_admin') AND school_id = public.get_my_school_id());

-- EXAMS: admin/principal manage; all school users read
CREATE POLICY "exams_select" ON public.exams FOR SELECT
  USING (public.get_my_role() = 'super_admin' OR school_id = public.get_my_school_id());
CREATE POLICY "exams_write" ON public.exams FOR ALL
  USING (public.get_my_role() IN ('super_admin', 'school_admin', 'principal') AND school_id = public.get_my_school_id());

-- EXAM_RESULTS: teachers write; principal/admin/student read
CREATE POLICY "exam_results_select" ON public.exam_results FOR SELECT
  USING (public.get_my_role() = 'super_admin' OR school_id = public.get_my_school_id());
CREATE POLICY "exam_results_write" ON public.exam_results FOR ALL
  USING (public.get_my_role() IN ('super_admin', 'school_admin', 'principal', 'teacher') AND school_id = public.get_my_school_id());

-- REPORT_CARD_TEMPLATES: admin manages; all school users read
CREATE POLICY "report_card_templates_select" ON public.report_card_templates FOR SELECT
  USING (public.get_my_role() = 'super_admin' OR school_id = public.get_my_school_id());
CREATE POLICY "report_card_templates_write" ON public.report_card_templates FOR ALL
  USING (public.get_my_role() IN ('super_admin', 'school_admin') AND school_id = public.get_my_school_id());

-- FEES: admin manages; all school users read
CREATE POLICY "fee_structures_select" ON public.fee_structures FOR SELECT
  USING (public.get_my_role() = 'super_admin' OR school_id = public.get_my_school_id());
CREATE POLICY "fee_structures_write" ON public.fee_structures FOR ALL
  USING (public.get_my_role() IN ('super_admin', 'school_admin') AND school_id = public.get_my_school_id());

CREATE POLICY "fee_payments_select" ON public.fee_payments FOR SELECT
  USING (public.get_my_role() = 'super_admin' OR school_id = public.get_my_school_id());
CREATE POLICY "fee_payments_write" ON public.fee_payments FOR ALL
  USING (public.get_my_role() IN ('super_admin', 'school_admin') AND school_id = public.get_my_school_id());

-- ANNOUNCEMENTS: admin/principal create; all school users read
CREATE POLICY "announcements_select" ON public.announcements FOR SELECT
  USING (public.get_my_role() = 'super_admin' OR school_id = public.get_my_school_id());
CREATE POLICY "announcements_write" ON public.announcements FOR ALL
  USING (public.get_my_role() IN ('super_admin', 'school_admin', 'principal') AND school_id = public.get_my_school_id());

-- NOTIFICATIONS: users read own; system inserts
CREATE POLICY "notifications_select" ON public.notifications FOR SELECT
  USING (user_id = auth.uid() OR public.get_my_role() IN ('super_admin', 'school_admin'));
CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT
  WITH CHECK (school_id = public.get_my_school_id() OR public.get_my_role() = 'super_admin');

-- FEEDBACK: parents/students create; teachers/admin read+respond
CREATE POLICY "feedback_select" ON public.feedback FOR SELECT
  USING (
    from_user_id = auth.uid()
    OR public.get_my_role() IN ('super_admin', 'school_admin', 'principal', 'teacher')
  );
CREATE POLICY "feedback_insert" ON public.feedback FOR INSERT
  WITH CHECK (school_id = public.get_my_school_id());
CREATE POLICY "feedback_update" ON public.feedback FOR UPDATE
  USING (public.get_my_role() IN ('super_admin', 'school_admin', 'principal', 'teacher'));

-- DISCIPLINE: teachers/principal create; admin/principal read all; parents read own child
CREATE POLICY "discipline_select" ON public.discipline_records FOR SELECT
  USING (
    public.get_my_role() IN ('super_admin', 'school_admin', 'principal', 'teacher')
    AND school_id = public.get_my_school_id()
  );
CREATE POLICY "discipline_write" ON public.discipline_records FOR ALL
  USING (public.get_my_role() IN ('super_admin', 'school_admin', 'principal', 'teacher') AND school_id = public.get_my_school_id());

-- AUDIT_LOG: enable RLS; super_admin reads all; school_admin + principal read own school; no delete
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_select" ON public.audit_log FOR SELECT
  USING (
    public.get_my_role() = 'super_admin'
    OR (
      public.get_my_role() IN ('school_admin', 'principal')
      AND school_id = public.get_my_school_id()
    )
  );

-- Anyone authenticated can insert their own audit entries (service role bypasses this for server-side logging)
CREATE POLICY "audit_log_insert" ON public.audit_log FOR INSERT
  WITH CHECK (performed_by = auth.uid());
```

- [ ] **Step 2: Push RLS migration**

```bash
supabase db push --db-url "postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres"
```

Expected: RLS enabled on all 22 tables, all policies created without error.

- [ ] **Step 3: Verify isolation in Supabase dashboard**

In Supabase Table Editor, confirm RLS badge shows "Enabled" on every table listed above.

- [ ] **Step 4: Commit**

```bash
git add packages/supabase/migrations/20240001000010_rls.sql
git commit -m "feat: enable RLS and add all access policies"
```

---

## Task 5: Generate TypeScript Types + Seed Data

**Files:**
- Modify: `packages/supabase/src/types.ts` (replace placeholder)
- Create: `packages/supabase/seed.sql`

- [ ] **Step 1: Generate TypeScript types from Supabase**

```bash
npx supabase gen types typescript \
  --project-id <your-project-ref> \
  --schema public \
  > packages/supabase/src/types.ts
```

Expected: `types.ts` now contains a full `Database` interface with all 22 tables.

- [ ] **Step 2: Create `packages/supabase/seed.sql`**

```sql
-- Create WnR super admin user (run ONCE manually in Supabase Auth dashboard
-- or via Supabase admin API — do NOT store credentials in repo)

-- After creating the auth user, insert their role:
-- Replace <super-admin-user-id> with the UUID from auth.users
INSERT INTO public.user_roles (user_id, school_id, role, is_active)
VALUES ('<super-admin-user-id>', NULL, 'super_admin', true);

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
```

- [ ] **Step 3: Commit**

```bash
git add packages/supabase/src/types.ts packages/supabase/seed.sql
git commit -m "feat: add generated DB types and seed data"
```

---

## Task 6: Web Auth — Login + Middleware + Role Routing

**Files:**
- Modify: `apps/web/app/(auth)/login/page.tsx`
- Create: `apps/web/app/auth/callback/route.ts`
- Modify: `apps/web/middleware.ts`
- Create: `apps/web/app/(platform-admin)/layout.tsx`
- Create: `apps/web/app/(school)/layout.tsx`

- [ ] **Step 1: Replace `apps/web/app/(auth)/login/page.tsx` with school-branded login form**

The login page is a **Server Component** that reads the domain from request headers, fetches the school's name and primary color from Supabase, and renders a branded login form. The form itself is a Client Component.

Create `apps/web/app/(auth)/login/login-form.tsx` (client component):

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@balaji-erp/shared/supabase/client";
import { loginSchema } from "@balaji-erp/shared/schemas";

export function LoginForm({
  schoolName,
  primaryColor,
}: {
  schoolName: string;
  primaryColor: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-lg bg-white p-8 shadow"
      >
        <div
          className="mb-2 h-2 w-full rounded-t-lg"
          style={{ backgroundColor: primaryColor }}
        />
        <h1 className="mb-1 text-2xl font-bold text-gray-900">{schoolName}</h1>
        <p className="mb-6 text-sm text-gray-400">Sign in to continue</p>
        {error && (
          <p className="mb-4 rounded bg-red-50 px-4 py-2 text-sm text-red-600">
            {error}
          </p>
        )}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none"
            style={{ "--tw-ring-color": primaryColor } as React.CSSProperties}
          />
        </div>
        <div className="mb-6">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: primaryColor }}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
```

Now create `apps/web/app/(auth)/login/page.tsx` (server component):

```tsx
import { headers } from "next/headers";
import { createServerSupabaseClient } from "@balaji-erp/shared/supabase/server";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const headersList = await headers();
  const host = headersList.get("host") ?? "";
  const domain = host.replace(/:\d+$/, "");

  const supabase = await createServerSupabaseClient();
  const { data: school } = await supabase
    .from("schools")
    .select("name, primary_color")
    .eq("domain", domain)
    .single();

  // Platform admin domain — no school branding
  const schoolName = school?.name ?? "School Portal";
  const primaryColor = school?.primary_color ?? "#2563EB";

  return <LoginForm schoolName={schoolName} primaryColor={primaryColor} />;
}
```

- [ ] **Step 2: Create `apps/web/app/auth/callback/route.ts`**

```typescript
import { createServerSupabaseClient } from "@balaji-erp/shared/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}/login`);
}
```

- [ ] **Step 3: Replace `apps/web/middleware.ts` with domain-aware auth + role routing**

```typescript
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/auth/callback"];
const PLATFORM_ADMIN_DOMAIN = "admin.balajierp.com";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") ?? "";
  // Strip port for local dev (localhost:3000 → localhost)
  const domain = host.replace(/:\d+$/, "");
  // In local dev: localhost resolves against schools.domain (seeded as 'localhost').
  // Use localhost:3001 or admin.localhost for platform admin during local dev.
  const isPlatformAdmin =
    domain === PLATFORM_ADMIN_DOMAIN ||
    domain === "admin.localhost" ||
    request.nextUrl.pathname.startsWith("/platform-admin");

  // Allow public paths through
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response = NextResponse.next({ request });
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not authenticated — redirect to login
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Resolve school_id from domain (skip for platform admin domain)
  let schoolId: string | null = null;
  if (!isPlatformAdmin) {
    const { data: school } = await supabase
      .from("schools")
      .select("id, is_active")
      .eq("domain", domain)
      .single();

    if (!school || !school.is_active) {
      // Domain not found or school deactivated
      return new NextResponse("School not found or inactive.", { status: 404 });
    }
    schoolId = school.id;
    // Pass school_id to downstream server components via header
    response.headers.set("x-school-id", schoolId);
  }

  // Get the user's role
  const roleQuery = supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (schoolId) {
    roleQuery.eq("school_id", schoolId);
  }

  const { data: roleRow } = await roleQuery.single();
  const role = roleRow?.role;

  if (!role) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Platform admin domain: only super_admin allowed
  if (isPlatformAdmin) {
    if (role !== "super_admin") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (!pathname.startsWith("/platform-admin")) {
      return NextResponse.redirect(new URL("/platform-admin/dashboard", request.url));
    }
    return response;
  }

  // Check for context-switch cookie (set when a higher role switches into a lower role view)
  // Cookie format: acting_as=teacher|school_id=<uuid>
  const actingAsCookie = request.cookies.get("acting_as")?.value;
  const effectiveRole = actingAsCookie ?? role;

  // Pass acting_as info downstream for banner rendering
  if (actingAsCookie) {
    response.headers.set("x-acting-as", actingAsCookie);
    response.headers.set("x-real-role", role);
  }

  // School domain: route based on effective role (real or context-switched)
  // super_admin on a school domain — only allowed if they have an acting_as cookie
  if (role === "super_admin" && !actingAsCookie) {
    return NextResponse.redirect(`https://${PLATFORM_ADMIN_DOMAIN}/platform-admin/dashboard`);
  }

  if (effectiveRole === "school_admin" && !pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }
  if (effectiveRole === "principal" && !pathname.startsWith("/principal")) {
    return NextResponse.redirect(new URL("/principal/dashboard", request.url));
  }
  if (effectiveRole === "teacher" && !pathname.startsWith("/teacher")) {
    return NextResponse.redirect(new URL("/teacher/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **Step 4: Create `apps/web/app/(platform-admin)/layout.tsx`**

```tsx
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@balaji-erp/shared/supabase/server";

export default async function PlatformAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (roleRow?.role !== "super_admin") redirect("/login");

  return <div className="min-h-screen bg-gray-100">{children}</div>;
}
```

- [ ] **Step 5: Create `apps/web/app/(school)/layout.tsx`**

```tsx
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@balaji-erp/shared/supabase/server";

// super_admin allowed via context switching
const SCHOOL_ROLES = ["super_admin", "school_admin", "principal", "teacher"] as const;

export default async function SchoolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!roleRow || !SCHOOL_ROLES.includes(roleRow.role as (typeof SCHOOL_ROLES)[number])) {
    redirect("/login");
  }

  return <div className="min-h-screen bg-gray-50">{children}</div>;
}
```

- [ ] **Step 6: Verify web auth compiles**

```bash
pnpm --filter @balaji-erp/web type-check
```

Expected: 0 errors.

- [ ] **Step 7: Test login manually**

Run `pnpm --filter @balaji-erp/web dev`, open `http://localhost:3000/login`, log in as the super admin seeded in Task 5.

Expected: redirected to `/platform-admin/dashboard` (404 is fine — page not built yet, but redirect proves role routing works).

- [ ] **Step 8: Create `apps/web/app/(auth)/invite/page.tsx` — Invite acceptance page**

When Super Admin invites a School Admin, teacher, or student, they receive an email with a link. This page handles that link, lets them set a password, and redirects to login.

```tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@balaji-erp/shared/supabase/client";

export default function InviteAcceptPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Supabase sends invited users to this page with a token hash in the URL
  useEffect(() => {
    const supabase = createClient();
    // Supabase auto-verifies the token if present in the URL hash
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        // User's token is verified, they can now set their password
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    // Password set — redirect to login
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-lg bg-white p-8 shadow"
      >
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          Welcome to Balaji ERP
        </h1>
        <p className="mb-6 text-sm text-gray-500">
          Set your password to get started.
        </p>
        {error && (
          <p className="mb-4 rounded bg-red-50 px-4 py-2 text-sm text-red-600">
            {error}
          </p>
        )}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none"
          />
        </div>
        <div className="mb-6">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Confirm Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Setting password…" : "Set Password & Continue"}
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 9: Commit**

```bash
git add apps/web
git commit -m "feat: web auth — login form, invite acceptance, middleware, role-based routing"
```

---

## Task 7: Mobile Auth — Login Screen + Session Guard

**Files:**
- Create: `apps/mobile/app/(auth)/login.tsx`
- Modify: `apps/mobile/app/_layout.tsx`
- Create: `apps/mobile/app/(teacher)/_layout.tsx`
- Create: `apps/mobile/app/(parent)/_layout.tsx`
- Create: `apps/mobile/lib/supabase.ts`

- [ ] **Step 1: Create `apps/mobile/lib/supabase.ts`**

```typescript
import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl as string;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

- [ ] **Step 2: Add env vars to `apps/mobile/app.json`**

Add the `extra` field inside the `expo` object in `app.json`:

```json
"extra": {
  "supabaseUrl": "https://<your-project-ref>.supabase.co",
  "supabaseAnonKey": "<your-anon-key>"
}
```

- [ ] **Step 3: Replace `apps/mobile/app/_layout.tsx` with session-aware root layout**

```tsx
import { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { supabase } from "../lib/supabase";
import type { Session } from "@supabase/supabase-js";
import "../global.css";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitialized(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!initialized) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!session && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (session && inAuthGroup) {
      // Fetch role and redirect to correct tab group
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("is_active", true)
        .single()
        .then(({ data }) => {
          if (data?.role === "teacher") {
            router.replace("/(teacher)/dashboard");
          } else {
            router.replace("/(parent)/dashboard");
          }
        });
    }
  }, [session, initialized, segments]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 4: Create `apps/mobile/app/(auth)/login.tsx`**

```tsx
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError(null);
    if (!email || !password) {
      setError("Email and password are required");
      return;
    }
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (authError) {
      setError(authError.message);
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-gray-50"
    >
      <View className="flex-1 items-center justify-center px-6">
        <Text className="mb-8 text-3xl font-bold text-gray-900">
          Balaji ERP
        </Text>

        {error && (
          <View className="mb-4 w-full rounded bg-red-50 px-4 py-2">
            <Text className="text-sm text-red-600">{error}</Text>
          </View>
        )}

        <TextInput
          className="mb-3 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base"
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          className="mb-6 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base"
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 py-3 disabled:opacity-50"
        >
          <Text className="text-center text-base font-medium text-white">
            {loading ? "Signing in…" : "Sign in"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
```

- [ ] **Step 5: Create `apps/mobile/app/(teacher)/_layout.tsx`**

```tsx
import { Tabs } from "expo-router";

export default function TeacherLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="dashboard" options={{ title: "Dashboard" }} />
      <Tabs.Screen name="attendance" options={{ title: "Attendance" }} />
      <Tabs.Screen name="homework" options={{ title: "Homework" }} />
      <Tabs.Screen name="results" options={{ title: "Results" }} />
      <Tabs.Screen name="discipline" options={{ title: "Discipline" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
```

- [ ] **Step 6: Create `apps/mobile/app/(parent)/_layout.tsx`**

```tsx
import { Tabs } from "expo-router";

export default function ParentLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="dashboard" options={{ title: "Home" }} />
      <Tabs.Screen name="attendance" options={{ title: "Attendance" }} />
      <Tabs.Screen name="results" options={{ title: "Results" }} />
      <Tabs.Screen name="fees" options={{ title: "Fees" }} />
      <Tabs.Screen name="homework" options={{ title: "Homework" }} />
      <Tabs.Screen name="announcements" options={{ title: "News" }} />
      <Tabs.Screen name="feedback" options={{ title: "Feedback" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
```

- [ ] **Step 7: Type-check mobile**

```bash
pnpm --filter @balaji-erp/mobile type-check
```

Expected: 0 TypeScript errors.

- [ ] **Step 8: Test mobile login manually**

Run Expo dev server, open in Expo Go. Enter super admin or teacher credentials. Expected: redirected to correct tab group.

- [ ] **Step 9: Commit**

```bash
git add apps/mobile
git commit -m "feat: mobile auth login screen, session guard, role-based tab routing"
```

---

## Verification Checklist

Before declaring Plan 2 complete, confirm all of the following:

- [ ] All 9 migration files pushed to Supabase successfully
- [ ] RLS enabled on all 22 tables (visible in Supabase dashboard)
- [ ] `pnpm type-check` passes with 0 errors across all packages
- [ ] Web: logging in as `super_admin` redirects to `/platform-admin/dashboard`
- [ ] Web: logging in as `school_admin` redirects to `/admin/dashboard`
- [ ] Web: logging in as `teacher` redirects to `/teacher/dashboard`
- [ ] Web: unauthenticated requests to protected paths redirect to `/login`
- [ ] Mobile: logging in as `teacher` shows teacher tab bar
- [ ] Mobile: logging in as `parent`/`student` shows parent tab bar
- [ ] Mobile: app starts on login screen when no session exists
