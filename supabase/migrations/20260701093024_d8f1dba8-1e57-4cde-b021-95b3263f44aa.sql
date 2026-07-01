
ALTER TABLE public.party_analyses ADD COLUMN IF NOT EXISTS risk_analizi jsonb;
ALTER TABLE public.common_ground_reports ADD COLUMN IF NOT EXISTS risk_ozeti jsonb;
