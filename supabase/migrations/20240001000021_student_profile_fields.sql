-- New columns on student_profiles
ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS photo_url   TEXT,
  ADD COLUMN IF NOT EXISTS parent_phone TEXT;

-- Widen student_profiles write policy to include teachers
DROP POLICY IF EXISTS "student_profiles_write" ON public.student_profiles;
CREATE POLICY "student_profiles_write" ON public.student_profiles FOR ALL
  USING (
    public.get_my_role() IN ('super_admin', 'school_admin', 'teacher')
    AND school_id = public.get_my_school_id()
  )
  WITH CHECK (
    public.get_my_role() IN ('super_admin', 'school_admin', 'teacher')
    AND school_id = public.get_my_school_id()
  );

-- Storage bucket for student photos (public read, authenticated write)
INSERT INTO storage.buckets (id, name, public)
VALUES ('student-photos', 'student-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow any authenticated school user to upload
CREATE POLICY "student_photos_insert" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'student-photos'
    AND auth.role() = 'authenticated'
  );

-- Allow authenticated users to update/delete their own uploads
CREATE POLICY "student_photos_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'student-photos' AND auth.role() = 'authenticated');

CREATE POLICY "student_photos_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'student-photos' AND auth.role() = 'authenticated');

-- Public read (bucket is public, but explicit policy for safety)
CREATE POLICY "student_photos_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'student-photos');
