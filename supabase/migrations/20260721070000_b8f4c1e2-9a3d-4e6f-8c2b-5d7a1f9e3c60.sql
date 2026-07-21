-- Kök Neden Katmanı: party_root_cause_analysis
-- common_ground_reports ile BİREBİR aynı RLS deseni: SADECE arabulucu + admin.
-- Bilinçli olarak "Party sees own ..." policy'si YOK — party_analyses'in aksine
-- (parti kendi satırını görür), bu tablo tarafın kendisine dahi kapalı.
CREATE TABLE IF NOT EXISTS public.party_root_cause_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  party_id UUID NOT NULL REFERENCES public.case_parties(id) ON DELETE CASCADE,
  kok_neden JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.party_root_cause_analysis TO authenticated;
GRANT ALL ON public.party_root_cause_analysis TO service_role;
ALTER TABLE public.party_root_cause_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mediator only root cause" ON public.party_root_cause_analysis
  FOR ALL USING (public.is_case_mediator(case_id, auth.uid()))
  WITH CHECK (public.is_case_mediator(case_id, auth.uid()));
CREATE POLICY "Admin full root cause" ON public.party_root_cause_analysis
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_party_root_cause_case ON public.party_root_cause_analysis(case_id);
CREATE INDEX IF NOT EXISTS idx_party_root_cause_party ON public.party_root_cause_analysis(party_id);
