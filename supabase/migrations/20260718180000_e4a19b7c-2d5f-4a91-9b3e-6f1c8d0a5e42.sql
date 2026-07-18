
-- Ücret sözleşmesi alanları (Faz 4b — Ödeme & Muhasebe genişletmesi)
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS ucret_sozlesmesi BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS kararlastirilan_ucret NUMERIC;

-- Ödeme defteri: dosya bazlı ücret/masraf tahsilat kayıtları
CREATE TABLE IF NOT EXISTS public.case_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  payment_date date NOT NULL DEFAULT current_date,
  payer_party_id uuid REFERENCES public.case_parties(id) ON DELETE SET NULL,
  payer_label text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('ucret', 'masraf')),
  description text,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'bekliyor' CHECK (status IN ('bekliyor', 'odendi')),
  receipt_no text,
  paid_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_payments TO authenticated;
GRANT ALL ON public.case_payments TO service_role;

ALTER TABLE public.case_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Case mediator or admin can view payments"
  ON public.case_payments FOR SELECT TO authenticated
  USING (public.is_case_mediator(case_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Case mediator or admin can insert payments"
  ON public.case_payments FOR INSERT TO authenticated
  WITH CHECK (public.is_case_mediator(case_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Case mediator or admin can update payments"
  ON public.case_payments FOR UPDATE TO authenticated
  USING (public.is_case_mediator(case_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.is_case_mediator(case_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Case mediator or admin can delete payments"
  ON public.case_payments FOR DELETE TO authenticated
  USING (public.is_case_mediator(case_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_case_payments_case ON public.case_payments(case_id);

CREATE TRIGGER trg_case_payments_updated_at
  BEFORE UPDATE ON public.case_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
