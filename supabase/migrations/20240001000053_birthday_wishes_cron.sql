-- Daily student birthday wishes. Uses pg_cron to call the send-birthday-wishes
-- edge function via pg_net. This runs ONLY on the deployed Supabase project --
-- pg_cron does not fire on the local CLI stack.
--
-- The function URL and CRON_SECRET are read from Postgres settings
-- (app.settings.*) which must be configured on the deployed project (see the
-- homework reminder deploy note). If unset, the job no-ops safely.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Defensive: drop any pre-existing job of this name so re-applying the
-- migration never creates a duplicate (older pg_cron does not upsert by name).
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'student-birthday-wishes';

-- Runs every day at 02:30 UTC (~08:00 IST), same slot as homework reminders.
SELECT cron.schedule(
  'student-birthday-wishes',
  '30 2 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.functions_url', true) || '/send-birthday-wishes',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', current_setting('app.settings.cron_secret', true)
    ),
    body := '{}'::jsonb
  )
  WHERE current_setting('app.settings.functions_url', true) IS NOT NULL;
  $$
);
