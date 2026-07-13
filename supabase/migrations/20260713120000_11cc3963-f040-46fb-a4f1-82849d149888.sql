-- Kör Teklif (Smartsettle ONE tarzı, arabulucu-asist kör pazarlık): taraflar birbirinin
-- teklifini görmeden min-max aralık girer; yalnızca arabulucu/admin iki tarafın teklif
-- durumunu ve örtüşmeyi (ZOPA) görebilir. is_own_case_party, is_case_party ile aynı
-- SECURITY DEFINER desenini izler (RLS özyinelemesinden kaçınmak için).
CREATE TABLE IF NOT EXISTS public.blind_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  party_id uuid NOT NULL REFERENCES public.case_parties(id) ON DELETE CASCADE,
  min_amount numeric,
  max_amount numeric,
  currency text NOT NULL DEFAULT 'TRY',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (case_id, party_id)
);

GRANT SELECT, INSERT, UPDATE ON public.blind_bids TO authenticated;
GRANT ALL ON public.blind_bids TO service_role;

ALTER TABLE public.blind_bids ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_own_case_party(_party_id uuid, _user_id uuid)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.case_parties
    WHERE id = _party_id AND user_id = _user_id
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_own_case_party(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_own_case_party(uuid, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Party selects own blind bid" ON public.blind_bids;
CREATE POLICY "Party selects own blind bid" ON public.blind_bids
  FOR SELECT TO authenticated
  USING (public.is_own_case_party(party_id, auth.uid()));

DROP POLICY IF EXISTS "Party inserts own blind bid" ON public.blind_bids;
CREATE POLICY "Party inserts own blind bid" ON public.blind_bids
  FOR INSERT TO authenticated
  WITH CHECK (public.is_own_case_party(party_id, auth.uid()));

DROP POLICY IF EXISTS "Party updates own blind bid" ON public.blind_bids;
CREATE POLICY "Party updates own blind bid" ON public.blind_bids
  FOR UPDATE TO authenticated
  USING (public.is_own_case_party(party_id, auth.uid()))
  WITH CHECK (public.is_own_case_party(party_id, auth.uid()));

DROP POLICY IF EXISTS "Mediator sees all blind bids" ON public.blind_bids;
CREATE POLICY "Mediator sees all blind bids" ON public.blind_bids
  FOR SELECT TO authenticated
  USING (public.is_case_mediator(case_id, auth.uid()));

DROP POLICY IF EXISTS "Admin full blind bids" ON public.blind_bids;
CREATE POLICY "Admin full blind bids" ON public.blind_bids
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS trg_blind_bids_updated_at ON public.blind_bids;
CREATE TRIGGER trg_blind_bids_updated_at
  BEFORE UPDATE ON public.blind_bids
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_blind_bids_case ON public.blind_bids(case_id);
