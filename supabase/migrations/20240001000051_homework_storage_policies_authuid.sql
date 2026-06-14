-- Fix homework-attachments storage policies.
--
-- Supabase Storage is a separate service that does NOT run PostgREST's
-- db-pre-request hook (scope_pre_request), so the app.school_id / app.role
-- GUCs are never set on storage requests and get_my_role() /
-- get_my_school_id() return NULL. The original policies (migration 49) relied
-- on those helpers, so every homework attachment upload/read was denied.
--
-- Authorize directly from auth.uid() against user_roles instead (the same
-- self-contained approach the working student-photos policies use), keeping
-- the school-path scoping: path is homework/{schoolId}/{homeworkId}/...

DROP POLICY IF EXISTS "homework_attachments_upload" ON storage.objects;
DROP POLICY IF EXISTS "homework_attachments_modify" ON storage.objects;
DROP POLICY IF EXISTS "homework_attachments_remove" ON storage.objects;
DROP POLICY IF EXISTS "homework_attachments_read" ON storage.objects;

-- Upload/update/delete: staff + teachers who hold an active role at the school
-- named in the object path.
CREATE POLICY "homework_attachments_upload" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'homework-attachments'
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.is_active
        AND ur.role IN ('super_admin', 'school_admin', 'teacher')
        AND (ur.school_id IS NULL OR ur.school_id::text = (storage.foldername(name))[2])
    )
  );

CREATE POLICY "homework_attachments_modify" ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'homework-attachments'
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.is_active
        AND ur.role IN ('super_admin', 'school_admin', 'teacher')
        AND (ur.school_id IS NULL OR ur.school_id::text = (storage.foldername(name))[2])
    )
  );

CREATE POLICY "homework_attachments_remove" ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'homework-attachments'
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.is_active
        AND ur.role IN ('super_admin', 'school_admin', 'teacher')
        AND (ur.school_id IS NULL OR ur.school_id::text = (storage.foldername(name))[2])
    )
  );

-- Read: any active member (incl. parents) of the school named in the path.
-- The bucket is private, so a signed URL is still required; this lets the
-- signing request succeed for members of the owning school.
CREATE POLICY "homework_attachments_read" ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'homework-attachments'
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.is_active
        AND (ur.school_id IS NULL OR ur.school_id::text = (storage.foldername(name))[2])
    )
  );
