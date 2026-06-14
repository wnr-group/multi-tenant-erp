-- Private bucket for homework attachments. Unlike the existing public buckets
-- (school-gallery, student-photos), this is NOT public: files are served via
-- short-lived signed URLs to authorized users only. Path convention:
--   homework/{schoolId}/{homeworkId}/{timestamp}-{filename}

INSERT INTO storage.buckets (id, name, public)
VALUES ('homework-attachments', 'homework-attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "homework_attachments_upload" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'homework-attachments'
    AND public.get_my_role() IN ('super_admin', 'school_admin', 'teacher')
    AND (storage.foldername(name))[2] = public.get_my_school_id()::text
  );

CREATE POLICY "homework_attachments_modify" ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'homework-attachments'
    AND public.get_my_role() IN ('super_admin', 'school_admin', 'teacher')
    AND (storage.foldername(name))[2] = public.get_my_school_id()::text
  );

CREATE POLICY "homework_attachments_remove" ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'homework-attachments'
    AND public.get_my_role() IN ('super_admin', 'school_admin', 'teacher')
    AND (storage.foldername(name))[2] = public.get_my_school_id()::text
  );

CREATE POLICY "homework_attachments_read" ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'homework-attachments'
    AND (storage.foldername(name))[2] = public.get_my_school_id()::text
  );
