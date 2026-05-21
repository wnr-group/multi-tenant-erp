-- fee_line_items: one row per student per fee type
CREATE TABLE public.fee_line_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id        UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id       UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  fee_type         TEXT NOT NULL,
  total_amount     NUMERIC(12,2) NOT NULL CHECK (total_amount > 0),
  due_date         DATE,
  added_by         UUID REFERENCES public.profiles(id),
  class_id         UUID REFERENCES public.classes(id),
  academic_year_id UUID REFERENCES public.academic_years(id),
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','partial','paid')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fee_line_items_student ON public.fee_line_items(student_id);
CREATE INDEX idx_fee_line_items_school ON public.fee_line_items(school_id);

-- payments: one row per payment transaction (can cover multiple line items)
CREATE TABLE public.payments (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id            UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id           UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  paid_by_profile_id   UUID REFERENCES public.profiles(id),
  payment_date         TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_amount         NUMERIC(12,2) NOT NULL CHECK (total_amount > 0),
  payment_method       TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('online','cash','upi','bank_transfer','cheque')),
  mode                 TEXT NOT NULL DEFAULT 'offline' CHECK (mode IN ('online','offline')),
  transaction_id       TEXT,
  razorpay_order_id    TEXT,
  razorpay_payment_id  TEXT,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_student ON public.payments(student_id);
CREATE INDEX idx_payments_school ON public.payments(school_id);
CREATE UNIQUE INDEX idx_payments_razorpay ON public.payments(razorpay_payment_id) WHERE razorpay_payment_id IS NOT NULL;

-- line_item_payments: junction — how much of a payment went to each line item
CREATE TABLE public.line_item_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id      UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  line_item_id    UUID NOT NULL REFERENCES public.fee_line_items(id) ON DELETE CASCADE,
  amount_applied  NUMERIC(12,2) NOT NULL CHECK (amount_applied > 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lip_payment ON public.line_item_payments(payment_id);
CREATE INDEX idx_lip_line_item ON public.line_item_payments(line_item_id);

-- RLS
ALTER TABLE public.fee_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_item_payments ENABLE ROW LEVEL SECURITY;

-- fee_line_items: admins/principal/teachers can read; parents can read their student's; admins can write
CREATE POLICY "fli_read" ON public.fee_line_items FOR SELECT
  USING (
    (public.get_my_role() IN ('school_admin', 'principal', 'teacher', 'super_admin')
    AND school_id = public.get_my_school_id())
    OR EXISTS (
      SELECT 1 FROM public.student_profiles sp
      WHERE sp.id = fee_line_items.student_id
      AND sp.parent_profile_id = auth.uid()
    )
  );

CREATE POLICY "fli_write" ON public.fee_line_items FOR INSERT
  WITH CHECK (
    public.get_my_role() = 'super_admin'
    OR (public.get_my_role() = 'school_admin' AND school_id = public.get_my_school_id())
  );

CREATE POLICY "fli_update" ON public.fee_line_items FOR UPDATE
  USING (
    public.get_my_role() = 'super_admin'
    OR (public.get_my_role() = 'school_admin' AND school_id = public.get_my_school_id())
  )
  WITH CHECK (
    public.get_my_role() = 'super_admin'
    OR (public.get_my_role() = 'school_admin' AND school_id = public.get_my_school_id())
  );

-- payments: admins/principal can read; parents can read their student's; admins can write
CREATE POLICY "payments_read" ON public.payments FOR SELECT
  USING (
    (public.get_my_role() IN ('school_admin', 'principal', 'super_admin')
    AND school_id = public.get_my_school_id())
    OR EXISTS (
      SELECT 1 FROM public.student_profiles sp
      WHERE sp.id = payments.student_id
      AND sp.parent_profile_id = auth.uid()
    )
  );

CREATE POLICY "payments_write" ON public.payments FOR INSERT
  WITH CHECK (
    public.get_my_role() = 'super_admin'
    OR (public.get_my_role() = 'school_admin' AND school_id = public.get_my_school_id())
  );

-- line_item_payments: same visibility as payments
CREATE POLICY "lip_read" ON public.line_item_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.payments p
      WHERE p.id = line_item_payments.payment_id
      AND (
        (public.get_my_role() IN ('school_admin', 'principal', 'super_admin') AND p.school_id = public.get_my_school_id())
        OR EXISTS (
          SELECT 1 FROM public.student_profiles sp
          WHERE sp.id = p.student_id AND sp.parent_profile_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "lip_write" ON public.line_item_payments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.payments p
      JOIN public.fee_line_items fli ON fli.id = line_item_payments.line_item_id
      WHERE p.id = line_item_payments.payment_id
      AND p.school_id = fli.school_id
      AND (
        public.get_my_role() = 'super_admin'
        OR (public.get_my_role() = 'school_admin' AND p.school_id = public.get_my_school_id())
      )
    )
  );
