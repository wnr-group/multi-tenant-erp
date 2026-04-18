-- Audit log: every write action records who did it and under what role context
CREATE TABLE public.audit_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id      UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  performed_by   UUID NOT NULL REFERENCES auth.users(id),
  acting_as_role public.app_role NOT NULL,
  action         TEXT NOT NULL,
  entity_type    TEXT NOT NULL,
  entity_id      UUID,
  metadata       JSONB NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_school_id ON public.audit_log(school_id);
CREATE INDEX idx_audit_log_performed_by ON public.audit_log(performed_by);
CREATE INDEX idx_audit_log_created_at ON public.audit_log(created_at DESC);
