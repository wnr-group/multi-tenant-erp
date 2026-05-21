-- Allow parents to update photo_url on their own student's profile
CREATE POLICY "student_profiles_parent_photo"
ON public.student_profiles
FOR UPDATE
USING (parent_profile_id = auth.uid())
WITH CHECK (parent_profile_id = auth.uid());

-- Restrict storage upload to parent's own student path
-- storage.foldername returns an array of path segments; index 2 is the student_profile id
DROP POLICY IF EXISTS "student_photos_parent_upload" ON storage.objects;
CREATE POLICY "student_photos_parent_upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'student-photos'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[2] IN (
    SELECT id::text FROM public.student_profiles
    WHERE parent_profile_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "student_photos_parent_update" ON storage.objects;
CREATE POLICY "student_photos_parent_update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'student-photos'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[2] IN (
    SELECT id::text FROM public.student_profiles
    WHERE parent_profile_id = auth.uid()
  )
);
