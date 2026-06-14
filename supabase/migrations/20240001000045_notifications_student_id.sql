-- Notifications can target a specific student so a multi-child parent sees only
-- the active child's alerts (plus school-wide ones where student_id IS NULL).
ALTER TABLE public.notifications
  ADD COLUMN student_id UUID REFERENCES public.student_profiles(id) ON DELETE CASCADE;

CREATE INDEX idx_notifications_user_student
  ON public.notifications (user_id, student_id);
