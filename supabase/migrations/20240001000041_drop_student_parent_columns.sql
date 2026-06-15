-- The login rework made the parent a real linked identity via
-- student_profiles.parent_profile_id -> profiles(id). The denormalized
-- parent_phone / parent_name text columns are now dead: all reads use the
-- linked parent profile and all writes resolve a parent identity by phone.
-- Drop them so the column can no longer drift from the real parent.
ALTER TABLE public.student_profiles
  DROP COLUMN IF EXISTS parent_phone,
  DROP COLUMN IF EXISTS parent_name;
