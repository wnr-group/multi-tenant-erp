-- Add concession_amount to fee_payments for tracking fee waivers/discounts
ALTER TABLE public.fee_payments
  ADD COLUMN IF NOT EXISTS concession_amount NUMERIC(10,2) NOT NULL DEFAULT 0;
