
-- Restrict cases_private_keys INSERT to case owner, assigned mediator, or admin
DROP POLICY IF EXISTS "cpk insert case access" ON public.cases_private_keys;
CREATE POLICY "cpk insert owner mediator admin"
ON public.cases_private_keys
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_case_owner_safe(case_id, auth.uid())
  OR public.is_case_mediator(case_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- Harden case_party_invites: add a restrictive SELECT policy that always excludes
-- token_hash by denying all direct SELECT access. Reads must go through edge
-- functions using the service role.
DROP POLICY IF EXISTS "case_party_invites deny select" ON public.case_party_invites;
CREATE POLICY "case_party_invites deny select"
ON public.case_party_invites
AS RESTRICTIVE
FOR SELECT
TO authenticated, anon
USING (false);
