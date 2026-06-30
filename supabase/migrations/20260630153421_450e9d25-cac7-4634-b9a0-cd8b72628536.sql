
-- 1. Create private invite table (service-role only)
CREATE TABLE IF NOT EXISTS public.case_party_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_party_id uuid NOT NULL REFERENCES public.case_parties(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  invite_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz
);
GRANT ALL ON public.case_party_invites TO service_role;
ALTER TABLE public.case_party_invites ENABLE ROW LEVEL SECURITY;
-- No policies for anon/authenticated → table only reachable via service role (edge functions).
CREATE INDEX IF NOT EXISTS idx_case_party_invites_token ON public.case_party_invites(token);
CREATE INDEX IF NOT EXISTS idx_case_party_invites_party ON public.case_party_invites(case_party_id);

-- 2. Migrate existing tokens
INSERT INTO public.case_party_invites (case_party_id, token, invite_status)
SELECT id, invite_token, COALESCE(invite_status, 'pending')
FROM public.case_parties
WHERE invite_token IS NOT NULL
ON CONFLICT (token) DO NOTHING;

-- 3. Drop invite_token from case_parties
ALTER TABLE public.case_parties DROP COLUMN IF EXISTS invite_token;

-- 4. Allow a party to update their own case_parties row (account linkage, status acknowledgement)
DROP POLICY IF EXISTS "Party can update own row" ON public.case_parties;
CREATE POLICY "Party can update own row"
  ON public.case_parties
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 5. Restrict mediators directory to authenticated users (drop public anon read)
DROP POLICY IF EXISTS "med public read" ON public.mediators;
CREATE POLICY "Authenticated users can view mediators"
  ON public.mediators
  FOR SELECT
  TO authenticated
  USING (true);
