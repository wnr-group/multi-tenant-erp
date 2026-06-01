-- attendance_records
ALTER TABLE public.attendance_records
  ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES public.academic_years(id);

CREATE INDEX IF NOT EXISTS idx_attendance_academic_year ON public.attendance_records(academic_year_id);

-- homework
ALTER TABLE public.homework
  ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES public.academic_years(id);

CREATE INDEX IF NOT EXISTS idx_homework_academic_year ON public.homework(academic_year_id);

-- discipline_records (nullable — history preserved)
ALTER TABLE public.discipline_records
  ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES public.academic_years(id);

CREATE INDEX IF NOT EXISTS idx_discipline_academic_year ON public.discipline_records(academic_year_id);

-- feedback (nullable — history preserved)
ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES public.academic_years(id);

CREATE INDEX IF NOT EXISTS idx_feedback_academic_year ON public.feedback(academic_year_id);

-- announcements (nullable — timely announcements have no year)
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES public.academic_years(id);

CREATE INDEX IF NOT EXISTS idx_announcements_academic_year ON public.announcements(academic_year_id);

-- school_gallery (nullable — generic photos have no year)
ALTER TABLE public.school_gallery
  ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES public.academic_years(id);

CREATE INDEX IF NOT EXISTS idx_gallery_academic_year ON public.school_gallery(academic_year_id);
