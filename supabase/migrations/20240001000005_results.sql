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

CREATE INDEX idx_exams_school_id ON public.exams(school_id);
CREATE INDEX idx_exam_results_school_id ON public.exam_results(school_id);
CREATE INDEX idx_exam_results_exam_id ON public.exam_results(exam_id);
CREATE INDEX idx_exam_results_student_id ON public.exam_results(student_id);
