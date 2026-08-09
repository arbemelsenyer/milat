-- İç Tutarlılık Denetimi: party_consistency_findings
-- party_root_cause_analysis (20260721070000) ile BİREBİR aynı RLS deseni:
-- SADECE arabulucu + admin. Bilinçli olarak "Party sees own ..." policy'si YOK —
-- party_analyses'in aksine (parti kendi satırını görür), bu tablo tarafın kendisine
-- dahi kapalı: aynı tarafın beyanı ile kendi belgeleri arasındaki uyumsuzluk gözlemi
-- yalnızca arabulucuya gösterilir, karşı tarafa asla.
CREATE TABLE IF NOT EXISTS public.party_consistency_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  party_id UUID NOT NULL REFERENCES public.case_parties(id) ON DELETE CASCADE,
  findings JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.party_consistency_findings TO authenticated;
GRANT ALL ON public.party_consistency_findings TO service_role;
ALTER TABLE public.party_consistency_findings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Mediator only consistency findings" ON public.party_consistency_findings;
CREATE POLICY "Mediator only consistency findings" ON public.party_consistency_findings
  FOR ALL USING (public.is_case_mediator(case_id, auth.uid()))
  WITH CHECK (public.is_case_mediator(case_id, auth.uid()));

DROP POLICY IF EXISTS "Admin full consistency findings" ON public.party_consistency_findings;
CREATE POLICY "Admin full consistency findings" ON public.party_consistency_findings
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Taraf başına tek satır: fonksiyon her koşumda upsert eder (ON CONFLICT hedefi).
CREATE UNIQUE INDEX IF NOT EXISTS idx_party_consistency_case_party
  ON public.party_consistency_findings(case_id, party_id);
CREATE INDEX IF NOT EXISTS idx_party_consistency_case ON public.party_consistency_findings(case_id);
CREATE INDEX IF NOT EXISTS idx_party_consistency_party ON public.party_consistency_findings(party_id);
