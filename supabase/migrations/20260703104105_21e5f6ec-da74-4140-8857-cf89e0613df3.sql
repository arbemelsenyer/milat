
-- Make the case-owner access model on case_parties explicit and PII-safe.
-- The scanner flagged ambiguity: case owners can INSERT/DELETE parties but have
-- no explicit SELECT policy. We intentionally do NOT grant owners broad SELECT
-- on case_parties (which would expose TC kimlik, vergi no, phone, address of
-- the opposing party). Owners see only their own party row (if they are a
-- party) via the existing "Party can view case_parties" policy.

-- 1. Add explicit self-only SELECT policy for case owners, mirroring the
--    existing party self-view. This is intentionally NOT broadened to all
--    parties on the case to avoid cross-party PII leakage.
DROP POLICY IF EXISTS "Case owner can view own party row" ON public.case_parties;
CREATE POLICY "Case owner can view own party row"
  ON public.case_parties
  FOR SELECT
  TO authenticated
  USING (
    is_case_owner_safe(case_id, auth.uid())
    AND user_id = auth.uid()
  );

-- 2. Document the intentional restriction on the table so future changes
--    don't accidentally widen owner access.
COMMENT ON TABLE public.case_parties IS
  'PII-bearing party records. SELECT is intentionally restricted: admins (all), assigned mediator (all rows on their cases), and each party (only their own row). Case owners do NOT have broad SELECT on other parties to prevent cross-party PII exposure (TC kimlik, vergi no, phone, address).';
