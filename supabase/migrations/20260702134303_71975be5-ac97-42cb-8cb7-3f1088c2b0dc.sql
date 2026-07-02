
-- 1. Remove mediator DELETE on cases
DROP POLICY IF EXISTS "Mediators can delete assigned cases" ON public.cases;

-- 2. Tighten case_discovery_questions UPDATE — must still be an active party
DROP POLICY IF EXISTS "Party answers own discovery" ON public.case_discovery_questions;
CREATE POLICY "Party answers own discovery"
ON public.case_discovery_questions
FOR UPDATE
USING (user_id = auth.uid() AND public.is_case_party(case_id, auth.uid()))
WITH CHECK (user_id = auth.uid() AND public.is_case_party(case_id, auth.uid()));

-- 3. Tighten party_analyses UPDATE — must still be an active party
DROP POLICY IF EXISTS "Party updates own analysis answers" ON public.party_analyses;
CREATE POLICY "Party updates own analysis answers"
ON public.party_analyses
FOR UPDATE
USING (user_id = auth.uid() AND public.is_case_party(case_id, auth.uid()))
WITH CHECK (user_id = auth.uid() AND public.is_case_party(case_id, auth.uid()));

-- 4. Remove case-owner broad UPDATE on case_parties (protects opposing party PII).
--    Owners can still INSERT parties initially and DELETE. Edits go through mediator/admin.
DROP POLICY IF EXISTS "Case creator can update parties" ON public.case_parties;

-- 5. Lock down SECURITY DEFINER function from anon execution
REVOKE EXECUTE ON FUNCTION public.notify_admins_new_tariff() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_admins_new_tariff() TO service_role;
