-- Per-student homework engagement. ONE row per (homework, student), created
-- lazily on first parent action. Parents own state/viewed_at/done_at; teachers
-- own rating/teacher_comment/reviewed_at/reviewed_by. All writes go through the
-- RPCs in migration 48 — clients get NO direct INSERT/UPDATE/DELETE.

CREATE TYPE public.homework_state  AS ENUM ('viewed', 'done');
CREATE TYPE public.homework_rating AS ENUM ('good', 'satisfactory', 'needs_improvement');

CREATE TABLE public.homework_status (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_id     UUID NOT NULL REFERENCES public.homework(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  school_id       UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  state           public.homework_state NOT NULL,
  viewed_at       TIMESTAMPTZ,
  done_at         TIMESTAMPTZ,
  rating          public.homework_rating,
  teacher_comment TEXT,
  reviewed_at     TIMESTAMPTZ,
  reviewed_by     UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (homework_id, student_id)
);

CREATE INDEX idx_homework_status_homework ON public.homework_status (homework_id);
CREATE INDEX idx_homework_status_student  ON public.homework_status (student_id);

ALTER TABLE public.homework_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "homework_status_select" ON public.homework_status FOR SELECT
  USING (
    public.get_my_role() = 'super_admin'
    OR (
      school_id = public.get_my_school_id()
      AND (
        public.get_my_role() IN ('school_admin', 'principal', 'teacher')
        OR EXISTS (
          SELECT 1 FROM public.student_profiles sp
          WHERE sp.id = homework_status.student_id
            AND sp.parent_profile_id = auth.uid()
        )
      )
    )
  );

-- NO INSERT / UPDATE / DELETE policies. RLS is deny-by-default.
