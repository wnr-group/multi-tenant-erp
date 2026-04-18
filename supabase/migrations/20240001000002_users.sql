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

-- FK indexes
CREATE INDEX idx_profiles_school_id ON public.profiles(school_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_school_id ON public.user_roles(school_id);
CREATE INDEX idx_student_profiles_profile_id ON public.student_profiles(profile_id);
CREATE INDEX idx_student_profiles_school_id ON public.student_profiles(school_id);
CREATE INDEX idx_student_profiles_class_id ON public.student_profiles(class_id);
CREATE INDEX idx_student_profiles_section_id ON public.student_profiles(section_id);
CREATE INDEX idx_teacher_profiles_profile_id ON public.teacher_profiles(profile_id);
CREATE INDEX idx_teacher_profiles_school_id ON public.teacher_profiles(school_id);
CREATE INDEX idx_teacher_profiles_class_teacher_of ON public.teacher_profiles(class_teacher_of);
