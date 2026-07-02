-- Fix 1: Restrict party_analyses SELECT to still-active parties on the case
DROP POLICY IF EXISTS "Party sees own analysis" ON public.party_analyses;
CREATE POLICY "Party sees own analysis" ON public.party_analyses
FOR SELECT
USING (user_id = auth.uid() AND public.is_case_party(case_id, auth.uid()));

-- Fix 2: Revoke anon/public EXECUTE on SECURITY DEFINER trigger function
REVOKE EXECUTE ON FUNCTION public.notify_admins_new_mevzuat() FROM PUBLIC, anon;