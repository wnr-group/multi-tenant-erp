-- Enforce phone as required and unique on profiles.
-- All users are now provisioned with a phone number; no email-only accounts.
ALTER TABLE public.profiles
  ALTER COLUMN phone SET NOT NULL,
  ADD CONSTRAINT profiles_phone_unique UNIQUE (phone);

-- Update trigger to copy phone from auth.users so the NOT NULL constraint is
-- satisfied immediately on INSERT (no separate UPDATE needed in seed.sql).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.phone
  );
  RETURN NEW;
END;
$$;
