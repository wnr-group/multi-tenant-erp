-- A user must be able to mark their own notifications read.
-- Existing policies cover SELECT (own rows) and INSERT (system) only.
CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
