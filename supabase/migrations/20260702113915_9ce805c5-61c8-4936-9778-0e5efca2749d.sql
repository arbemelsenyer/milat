CREATE POLICY "Mediator can update assigned case_parties"
ON public.case_parties FOR UPDATE
USING (public.is_case_mediator(case_id, auth.uid()))
WITH CHECK (public.is_case_mediator(case_id, auth.uid()));