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

CREATE INDEX idx_discipline_school_id ON public.discipline_records(school_id);
CREATE INDEX idx_discipline_student_id ON public.discipline_records(student_id);
