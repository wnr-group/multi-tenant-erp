-- Storage bucket for school assets (logos, etc.)
INSERT INTO storage.buckets (id, name, public) VALUES ('school-assets', 'school-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for school-assets bucket
CREATE POLICY "school_assets_upload" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'school-assets'
    AND public.get_my_role() IN ('super_admin', 'school_admin', 'principal')
  );

CREATE POLICY "school_assets_update" ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'school-assets'
    AND public.get_my_role() IN ('super_admin', 'school_admin', 'principal')
  );

CREATE POLICY "school_assets_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'school-assets');
