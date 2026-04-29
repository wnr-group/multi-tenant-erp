-- School gallery table for carousel images uploaded by admin
CREATE TABLE IF NOT EXISTS public.school_gallery (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  image_url    text NOT NULL,
  caption      text,
  display_order integer NOT NULL DEFAULT 0,
  uploaded_by  uuid REFERENCES auth.users(id),
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.school_gallery ENABLE ROW LEVEL SECURITY;

-- Admins/principals can manage gallery
CREATE POLICY "gallery_admin_all" ON public.school_gallery FOR ALL
  USING (
    public.get_my_role() IN ('super_admin', 'school_admin', 'principal')
    AND school_id = public.get_my_school_id()
  )
  WITH CHECK (
    public.get_my_role() IN ('super_admin', 'school_admin', 'principal')
    AND school_id = public.get_my_school_id()
  );

-- Parents and teachers can read their school's gallery
CREATE POLICY "gallery_read" ON public.school_gallery FOR SELECT
  USING (school_id = public.get_my_school_id());

-- Storage bucket for gallery images
INSERT INTO storage.buckets (id, name, public)
VALUES ('school-gallery', 'school-gallery', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "gallery_upload" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'school-gallery'
    AND public.get_my_role() IN ('super_admin', 'school_admin', 'principal')
  );

CREATE POLICY "gallery_public_read" ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'school-gallery');

CREATE POLICY "gallery_delete" ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'school-gallery'
    AND public.get_my_role() IN ('super_admin', 'school_admin', 'principal')
  );
