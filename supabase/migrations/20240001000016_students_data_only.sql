-- Students are data records, not auth users.
-- Parents are the auth users who access student data.

-- Make profile_id nullable (students won't have auth accounts)
ALTER TABLE public.student_profiles ALTER COLUMN profile_id DROP NOT NULL;

-- Add name/email directly on student_profiles (no need for profiles table)
ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Make class/section nullable for flexibility during creation
ALTER TABLE public.student_profiles ALTER COLUMN class_id DROP NOT NULL;
ALTER TABLE public.student_profiles ALTER COLUMN section_id DROP NOT NULL;
