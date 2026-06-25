
CREATE TABLE public.case_expert_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  expert_id uuid NOT NULL REFERENCES public.experts(id) ON DELETE CASCADE,
  assigned_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  approvals jsonb NOT NULL DEFAULT '{}'::jsonb,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_expert_assignments TO authenticated;
GRANT ALL ON public.case_expert_assignments TO service_role;

ALTER TABLE public.case_expert_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "case members can view expert assignments"
  ON public.case_expert_assignments FOR SELECT TO authenticated
  USING (public.can_access_case(case_id, auth.uid()));

CREATE POLICY "mediator inserts expert assignment"
  ON public.case_expert_assignments FOR INSERT TO authenticated
  WITH CHECK (public.is_case_mediator(case_id, auth.uid()));

CREATE POLICY "mediator or party updates expert assignment"
  ON public.case_expert_assignments FOR UPDATE TO authenticated
  USING (
    public.is_case_mediator(case_id, auth.uid())
    OR public.is_case_party(case_id, auth.uid())
  )
  WITH CHECK (
    public.is_case_mediator(case_id, auth.uid())
    OR public.is_case_party(case_id, auth.uid())
  );

CREATE POLICY "mediator deletes expert assignment"
  ON public.case_expert_assignments FOR DELETE TO authenticated
  USING (public.is_case_mediator(case_id, auth.uid()));

CREATE TRIGGER trg_cea_updated
  BEFORE UPDATE ON public.case_expert_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
