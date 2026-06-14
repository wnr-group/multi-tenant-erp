-- Per-parent "last seen announcements" timestamp drives the unread badge.
ALTER TABLE public.profiles
  ADD COLUMN announcements_seen_at TIMESTAMPTZ;

-- Single source of truth for "the current academic year of a school".
-- Used by the attendance UI (mobile + web) and the notification edge function.
CREATE OR REPLACE FUNCTION public.get_active_academic_year(p_school_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.academic_years
  WHERE school_id = p_school_id
    AND status = 'active'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_active_academic_year(uuid) TO authenticated, anon, service_role;
