-- Drop legacy fee tables (no live data, safe to cascade)
DROP TABLE IF EXISTS public.fee_payments CASCADE;
DROP TABLE IF EXISTS public.fee_structures CASCADE;

-- fee_types: global predefined (school_id IS NULL) + per-school custom
CREATE TABLE public.fee_types (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  category      TEXT NOT NULL CHECK (category IN ('core', 'ancillary', 'miscellaneous')),
  is_predefined BOOLEAN NOT NULL DEFAULT false,
  school_id     UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  is_one_time   BOOLEAN NOT NULL DEFAULT false,
  is_refundable BOOLEAN NOT NULL DEFAULT false,
  is_optional   BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fee_types_scope CHECK (
    (is_predefined = true AND school_id IS NULL) OR
    (is_predefined = false AND school_id IS NOT NULL)
  )
);

-- Prevent duplicate names within same scope
CREATE UNIQUE INDEX fee_types_predefined_name ON public.fee_types(name)
  WHERE school_id IS NULL;
CREATE UNIQUE INDEX fee_types_school_name ON public.fee_types(name, school_id)
  WHERE school_id IS NOT NULL;

CREATE INDEX idx_fee_types_school ON public.fee_types(school_id);

-- RLS
ALTER TABLE public.fee_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fee_types_read" ON public.fee_types FOR SELECT
  USING (
    school_id IS NULL
    OR public.get_my_role() = 'super_admin'
    OR school_id = public.get_my_school_id()
  );

CREATE POLICY "fee_types_insert" ON public.fee_types FOR INSERT
  WITH CHECK (
    is_predefined = false
    AND (
      public.get_my_role() = 'super_admin'
      OR (public.get_my_role() = 'school_admin' AND school_id = public.get_my_school_id())
    )
  );

CREATE POLICY "fee_types_update" ON public.fee_types FOR UPDATE
  USING (
    is_predefined = false
    AND (
      public.get_my_role() = 'super_admin'
      OR (public.get_my_role() = 'school_admin' AND school_id = public.get_my_school_id())
    )
  )
  WITH CHECK (
    is_predefined = false
    AND (
      public.get_my_role() = 'super_admin'
      OR (public.get_my_role() = 'school_admin' AND school_id = public.get_my_school_id())
    )
  );

CREATE POLICY "fee_types_delete" ON public.fee_types FOR DELETE
  USING (
    is_predefined = false
    AND (
      public.get_my_role() = 'super_admin'
      OR (public.get_my_role() = 'school_admin' AND school_id = public.get_my_school_id())
    )
  );

-- Seed 13 predefined fee types
INSERT INTO public.fee_types (name, category, is_predefined, is_one_time, is_refundable, is_optional) VALUES
  ('Tuition Fee',                                      'core',          true, false, false, false),
  ('Special Fee / Smart Class Fee',                    'core',          true, false, false, false),
  ('Examination Fee',                                  'core',          true, false, false, false),
  ('Admission Fee',                                    'ancillary',     true, true,  false, false),
  ('Caution Deposit',                                  'ancillary',     true, false, true,  false),
  ('Books, Notebooks, and Stationery Fee',             'ancillary',     true, false, false, false),
  ('Uniform and Identity Card Charges',                'ancillary',     true, false, false, false),
  ('Transport / Van Fee',                              'ancillary',     true, false, false, false),
  ('Extracurricular / Co-curricular Activity Fee',     'ancillary',     true, false, false, false),
  ('Capitation Fee / Donation',                        'miscellaneous', true, false, false, true),
  ('Building Fund / Infrastructure Development Fee',   'miscellaneous', true, false, false, true),
  ('Tie-up / Compulsory Tie-in Fees',                  'miscellaneous', true, false, false, false),
  ('Skill-Class Fees',                                 'miscellaneous', true, false, false, false);

-- Migrate fee_line_items: replace free-text fee_type with FK
ALTER TABLE public.fee_line_items DROP COLUMN fee_type;
ALTER TABLE public.fee_line_items ADD COLUMN fee_type_id UUID REFERENCES public.fee_types(id);
ALTER TABLE public.fee_line_items ALTER COLUMN fee_type_id SET NOT NULL;
CREATE INDEX idx_fee_line_items_fee_type ON public.fee_line_items(fee_type_id);
