-- Add Razorpay order ID to fee_payments for reconciliation
ALTER TABLE public.fee_payments ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT;

-- Index for webhook lookups
CREATE INDEX IF NOT EXISTS fee_payments_razorpay_order_idx ON public.fee_payments(razorpay_order_id);
