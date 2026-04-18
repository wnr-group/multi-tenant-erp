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

CREATE INDEX idx_attendance_school_id ON public.attendance_records(school_id);
CREATE INDEX idx_attendance_student_id ON public.attendance_records(student_id);
CREATE INDEX idx_attendance_section_id ON public.attendance_records(section_id);
CREATE INDEX idx_attendance_date ON public.attendance_records(date);
