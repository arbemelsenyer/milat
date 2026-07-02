
-- 1. case_parties: split "Case creator can manage parties" ALL into non-SELECT ops
DROP POLICY IF EXISTS "Case creator can manage parties" ON public.case_parties;

CREATE POLICY "Case creator can insert parties" ON public.case_parties
  FOR INSERT TO authenticated
  WITH CHECK (public.is_case_owner_safe(case_id, auth.uid()));

CREATE POLICY "Case creator can update parties" ON public.case_parties
  FOR UPDATE TO authenticated
  USING (public.is_case_owner_safe(case_id, auth.uid()))
  WITH CHECK (public.is_case_owner_safe(case_id, auth.uid()));

CREATE POLICY "Case creator can delete parties" ON public.case_parties
  FOR DELETE TO authenticated
  USING (public.is_case_owner_safe(case_id, auth.uid()));

-- Case owner can only SELECT their OWN party row (if they are one) via existing
-- "Party can view case_parties" policy. Opposing parties' PII no longer visible.

-- 2. experts: drop unsafe self-view policy (no user_id column; id != auth.uid guarantee)
DROP POLICY IF EXISTS "Experts can view their own row" ON public.experts;

-- 3. party_invite_logs: allow case owner and case parties to read their own logs
CREATE POLICY "Case owner can view invite logs" ON public.party_invite_logs
  FOR SELECT TO authenticated
  USING (public.is_case_owner_safe(case_id, auth.uid()));

CREATE POLICY "Case party can view invite logs" ON public.party_invite_logs
  FOR SELECT TO authenticated
  USING (public.is_case_party(case_id, auth.uid()));
