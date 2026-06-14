-- Homework attachments: multiple files per homework (DOC/PDF/images, <=2MB each).
-- Replaces the unused single homework.attachment_url column.
-- file_url stores the STORAGE OBJECT PATH (not a public URL); the bucket is
-- private and files are served via signed URLs (see Plan 2).

ALTER TABLE public.homework DROP COLUMN IF EXISTS attachment_url;

CREATE TABLE public.homework_attachments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_id UUID NOT NULL REFERENCES public.homework(id) ON DELETE CASCADE,
  school_id   UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  file_url    TEXT NOT NULL,
  file_name   TEXT NOT NULL,
  file_type   TEXT NOT NULL,
  file_size   INTEGER NOT NULL CHECK (file_size > 0 AND file_size <= 2097152),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_homework_attachments_homework
  ON public.homework_attachments (homework_id);

ALTER TABLE public.homework_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "homework_attachments_select" ON public.homework_attachments FOR SELECT
  USING (public.get_my_role() = 'super_admin' OR school_id = public.get_my_school_id());

CREATE POLICY "homework_attachments_write" ON public.homework_attachments FOR ALL
  USING (public.get_my_role() IN ('super_admin', 'school_admin', 'teacher') AND school_id = public.get_my_school_id())
  WITH CHECK (public.get_my_role() IN ('super_admin', 'school_admin', 'teacher') AND school_id = public.get_my_school_id());
