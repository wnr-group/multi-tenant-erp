CREATE TABLE public.fee_structures (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id        UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id         UUID NOT NULL REFERENCES public.classes(id),
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id),
  fee_type         TEXT NOT NULL,
  amount           NUMERIC(10,2) NOT NULL,
  due_date         DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.fee_payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id         UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id        UUID NOT NULL REFERENCES public.profiles(id),
  fee_structure_id  UUID NOT NULL REFERENCES public.fee_structures(id),
  amount_paid       NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_date      DATE,
  payment_method    TEXT,
  receipt_number    TEXT,
  status            public.fee_payment_status NOT NULL DEFAULT 'pending',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fee_structures_school_id ON public.fee_structures(school_id);
CREATE INDEX idx_fee_payments_school_id ON public.fee_payments(school_id);
CREATE INDEX idx_fee_payments_student_id ON public.fee_payments(student_id);
