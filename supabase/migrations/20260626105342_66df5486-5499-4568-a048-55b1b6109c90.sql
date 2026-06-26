
CREATE OR REPLACE FUNCTION public.is_case_owner_safe(_case_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.cases WHERE id = _case_id AND user_id = _user_id);
$$;

DROP POLICY IF EXISTS "Parties can view their cases" ON public.cases;
CREATE POLICY "Parties can view their cases"
ON public.cases FOR SELECT
USING (public.is_case_party(id, auth.uid()));

DROP POLICY IF EXISTS "Case creator can manage parties" ON public.case_parties;
CREATE POLICY "Case creator can manage parties"
ON public.case_parties FOR ALL
USING (public.is_case_owner_safe(case_id, auth.uid()))
WITH CHECK (public.is_case_owner_safe(case_id, auth.uid()));

DROP POLICY IF EXISTS "Mediator can view assigned case_parties" ON public.case_parties;
CREATE POLICY "Mediator can view assigned case_parties"
ON public.case_parties FOR SELECT
USING (public.is_case_mediator(case_id, auth.uid()));
