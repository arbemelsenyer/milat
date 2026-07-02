
CREATE TABLE IF NOT EXISTS public.party_invite_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  party_id uuid NOT NULL REFERENCES public.case_parties(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('accepted','revoked')),
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.party_invite_logs TO authenticated;
GRANT ALL ON public.party_invite_logs TO service_role;

ALTER TABLE public.party_invite_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view invite logs"
  ON public.party_invite_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_party_invite_logs_case ON public.party_invite_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_party_invite_logs_created ON public.party_invite_logs(created_at DESC);
