-- Schools
CREATE TABLE public.schools (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  domain       TEXT UNIQUE,
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
