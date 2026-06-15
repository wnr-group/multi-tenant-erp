-- Registers the public.send_sms function as the Supabase Auth "Send SMS" hook.
-- The hook is triggered by Supabase Auth on every OTP send event.
-- It reads the Edge Function URL and hook secret from Vault, then fires a
-- signed HTTP POST to the send-sms Edge Function synchronously via pg_net.
--
-- Required Vault secrets (seed once via Dashboard SQL Editor):
--   functions_url        e.g. https://<ref>.supabase.co/functions/v1
--   send_sms_hook_secret the SEND_SMS_HOOK_SECRET value set on the Edge Function
--
-- After deploying this migration, register the hook manually:
--   Supabase Dashboard > Auth > Hooks > Send SMS > public.send_sms

CREATE OR REPLACE FUNCTION public.send_sms(event jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_functions_url  text;
  v_hook_secret    text;
  v_body           jsonb;
BEGIN
  v_functions_url := public._vault_get('functions_url');
  v_hook_secret   := public._vault_get('send_sms_hook_secret');

  -- No-op safely if secrets are not yet configured in Vault.
  IF v_functions_url IS NULL OR v_hook_secret IS NULL THEN
    RETURN;
  END IF;

  v_body := jsonb_build_object(
    'phone', event->'user'->>'phone',
    'otp',   event->'sms'->>'otp'
  );

  PERFORM net.http_post(
    url     := v_functions_url || '/send-sms',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_hook_secret
    ),
    body    := v_body
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_sms(jsonb) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.send_sms(jsonb) FROM authenticated, anon;
