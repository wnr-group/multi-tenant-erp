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

CREATE INDEX idx_homework_school_id ON public.homework(school_id);
CREATE INDEX idx_homework_section_id ON public.homework(section_id);
CREATE INDEX idx_syllabus_school_id ON public.syllabus(school_id);
CREATE INDEX idx_timetable_school_id ON public.timetable(school_id);
CREATE INDEX idx_timetable_section_id ON public.timetable(section_id);
CREATE INDEX idx_timetable_teacher_id ON public.timetable(teacher_id);
