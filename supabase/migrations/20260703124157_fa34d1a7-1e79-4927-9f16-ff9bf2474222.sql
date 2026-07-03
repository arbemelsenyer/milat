CREATE TABLE public.case_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  phase integer NOT NULL CHECK (phase BETWEEN 1 AND 8),
  content text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_notes TO authenticated;
GRANT ALL ON public.case_notes TO service_role;

ALTER TABLE public.case_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Assigned mediator can view own notes on their cases"
ON public.case_notes FOR SELECT TO authenticated
USING (
  created_by = auth.uid()
  AND public.is_case_mediator(case_id, auth.uid())
);

CREATE POLICY "Admins can view all notes"
ON public.case_notes FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Assigned mediator can insert notes on their cases"
ON public.case_notes FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND public.is_case_mediator(case_id, auth.uid())
);

CREATE POLICY "Mediator can update own notes"
ON public.case_notes FOR UPDATE TO authenticated
USING (created_by = auth.uid() AND public.is_case_mediator(case_id, auth.uid()))
WITH CHECK (created_by = auth.uid() AND public.is_case_mediator(case_id, auth.uid()));

CREATE POLICY "Mediator can delete own notes"
ON public.case_notes FOR DELETE TO authenticated
USING (created_by = auth.uid() AND public.is_case_mediator(case_id, auth.uid()));

CREATE INDEX idx_case_notes_case_phase ON public.case_notes(case_id, phase);
CREATE INDEX idx_case_notes_created_by ON public.case_notes(created_by);

CREATE TRIGGER update_case_notes_updated_at
  BEFORE UPDATE ON public.case_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();