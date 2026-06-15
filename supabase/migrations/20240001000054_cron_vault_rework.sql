-- Rework the scheduled jobs (homework reminders + birthday wishes) to work on
-- managed Supabase, where:
--   1. app.settings.* GUCs cannot be set (permission denied even as postgres), and
--   2. the deployed Functions gateway requires a JWT (Authorization: Bearer ...).
--
-- Both jobs now read their config from Supabase Vault and send:
--   Authorization: Bearer <service_role_key>   -> satisfies the gateway
--   x-cron-secret: <cron_secret>                -> our app-level guard
--
-- Required Vault secrets (seed once via Dashboard SQL Editor, see deploy note):
--   functions_url     e.g. https://<ref>.supabase.co/functions/v1
--   service_role_key  the project's service-role key
--   cron_secret       must match the CRON_SECRET function env var
--
-- If a secret is missing, vault_get() returns NULL and the job no-ops safely.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Helper: read a decrypted Vault secret by name (NULL if absent).
CREATE OR REPLACE FUNCTION public._vault_get(p_name text)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = p_name LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public._vault_get(text) FROM PUBLIC, anon, authenticated;

-- Replace both jobs with Vault-driven versions.
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'homework-due-reminders';
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'student-birthday-wishes';

SELECT cron.schedule(
  'homework-due-reminders',
  '30 2 * * *',
  $$
  SELECT net.http_post(
    url := public._vault_get('functions_url') || '/send-homework-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || public._vault_get('service_role_key'),
      'x-cron-secret', public._vault_get('cron_secret')
    ),
    body := '{}'::jsonb
  )
  WHERE public._vault_get('functions_url') IS NOT NULL
    AND public._vault_get('service_role_key') IS NOT NULL;
  $$
);

SELECT cron.schedule(
  'student-birthday-wishes',
  '30 2 * * *',
  $$
  SELECT net.http_post(
    url := public._vault_get('functions_url') || '/send-birthday-wishes',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || public._vault_get('service_role_key'),
      'x-cron-secret', public._vault_get('cron_secret')
    ),
    body := '{}'::jsonb
  )
  WHERE public._vault_get('functions_url') IS NOT NULL
    AND public._vault_get('service_role_key') IS NOT NULL;
  $$
);
