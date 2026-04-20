-- Add mobile app download links to schools
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS app_store_url TEXT;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS play_store_url TEXT;
