
-- Hash invite tokens and remove SELECT access from authenticated users
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.case_party_invites ADD COLUMN IF NOT EXISTS token_hash text;
UPDATE public.case_party_invites
  SET token_hash = encode(digest(token, 'sha256'), 'hex')
  WHERE token_hash IS NULL AND token IS NOT NULL;
ALTER TABLE public.case_party_invites ALTER COLUMN token_hash SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_case_party_invites_token_hash ON public.case_party_invites(token_hash);
ALTER TABLE public.case_party_invites DROP COLUMN IF EXISTS token;

-- Remove authenticated SELECT policy so raw hashes are not readable via API
DROP POLICY IF EXISTS "Case owners, mediators, admins can view invites" ON public.case_party_invites;

-- Restrict authenticated grants (functions use service_role which bypasses RLS/grants)
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.case_party_invites FROM authenticated;
