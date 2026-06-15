-- Fix: Edge Functions gateway requires a valid JWT in Authorization.
-- Use service_role_key as Bearer (satisfies gateway), pass hook secret
-- as x-hook-secret for the function to verify internally.
-- Same pattern as the cron jobs in 20240001000054_cron_vault_rework.sql.
CREATE OR REPLACE FUNCTION public.send_sms(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_functions_url  text;
  v_service_key    text;
  v_hook_secret    text;
  v_body           jsonb;
BEGIN
  v_functions_url := public._vault_get('functions_url');
  v_service_key   := public._vault_get('service_role_key');
  v_hook_secret   := public._vault_get('send_sms_hook_secret');

  IF v_functions_url IS NULL OR v_service_key IS NULL OR v_hook_secret IS NULL THEN
    RETURN '{}'::jsonb;
  END IF;

  v_body := jsonb_build_object(
    'phone', event->'user'->>'phone',
    'otp',   event->'sms'->>'otp'
  );

  PERFORM net.http_post(
    url     := v_functions_url || '/send-sms',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_service_key,
      'x-hook-secret', v_hook_secret
    ),
    body    := v_body
  );

  RETURN '{}'::jsonb;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_sms(jsonb) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.send_sms(jsonb) FROM authenticated, anon;
