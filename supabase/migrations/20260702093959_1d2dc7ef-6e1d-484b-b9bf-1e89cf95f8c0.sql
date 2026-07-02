
-- 1) Security definer view -> security invoker
ALTER VIEW public.mediators_public SET (security_invoker = on);

-- Allow directory browsing on base table (rows), but hide hourly_rate via column privileges
CREATE POLICY "Public can view mediator directory"
  ON public.mediators FOR SELECT
  TO authenticated, anon
  USING (true);

REVOKE SELECT (hourly_rate) ON public.mediators FROM anon, authenticated;
GRANT SELECT (hourly_rate) ON public.mediators TO service_role;

-- 2) experts: allow self-read
CREATE POLICY "Experts can view their own row"
  ON public.experts FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- 3) case_party_invites: scoped SELECT for case owners, mediators, admins
ALTER TABLE public.case_party_invites ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.case_party_invites TO authenticated;
GRANT ALL ON public.case_party_invites TO service_role;

CREATE POLICY "Case owners, mediators, admins can view invites"
  ON public.case_party_invites FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.case_parties cp
      JOIN public.cases c ON c.id = cp.case_id
      WHERE cp.id = case_party_invites.case_party_id
        AND (c.user_id = auth.uid() OR c.assigned_mediator_id = auth.uid())
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- 4) Tighten mediator delete policy on cases: require mediator role
DROP POLICY IF EXISTS "Mediators can delete assigned cases" ON public.cases;
CREATE POLICY "Mediators can delete assigned cases"
  ON public.cases FOR DELETE
  TO authenticated
  USING (
    assigned_mediator_id = auth.uid()
    AND public.has_role(auth.uid(), 'mediator'::app_role)
  );
