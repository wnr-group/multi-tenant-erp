-- Fix send_sms hook signature: Auth Hook selector requires returns jsonb, not void.
DROP FUNCTION IF EXISTS public.send_sms(jsonb);
CREATE OR REPLACE FUNCTION public.send_sms(event jsonb)
RETURNS jsonb
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

  IF v_functions_url IS NULL OR v_hook_secret IS NULL THEN
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
      'Authorization', 'Bearer ' || v_hook_secret
    ),
    body    := v_body
  );

  RETURN '{}'::jsonb;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_sms(jsonb) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.send_sms(jsonb) FROM authenticated, anon;
