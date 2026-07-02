
CREATE TABLE IF NOT EXISTS public.case_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  fee_type text NOT NULL CHECK (fee_type IN ('anlasma','anlasamama','ihtiyari')),
  dispute_value numeric NOT NULL DEFAULT 0,
  session_count integer NOT NULL DEFAULT 1,
  calculated_fee numeric NOT NULL DEFAULT 0,
  vat_amount numeric NOT NULL DEFAULT 0,
  total_fee numeric NOT NULL DEFAULT 0,
  tarife_yili integer NOT NULL DEFAULT 2026,
  tarife_maddesi text,
  ai_breakdown jsonb,
  notes text,
  invoice_generated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_fees TO authenticated;
GRANT ALL ON public.case_fees TO service_role;

ALTER TABLE public.case_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Case mediator or admin can view fees"
  ON public.case_fees FOR SELECT TO authenticated
  USING (public.is_case_mediator(case_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Case mediator or admin can insert fees"
  ON public.case_fees FOR INSERT TO authenticated
  WITH CHECK (public.is_case_mediator(case_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Case mediator or admin can update fees"
  ON public.case_fees FOR UPDATE TO authenticated
  USING (public.is_case_mediator(case_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.is_case_mediator(case_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Case mediator or admin can delete fees"
  ON public.case_fees FOR DELETE TO authenticated
  USING (public.is_case_mediator(case_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_case_fees_case ON public.case_fees(case_id);

CREATE TRIGGER trg_case_fees_updated_at
  BEFORE UPDATE ON public.case_fees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
