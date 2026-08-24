DROP POLICY IF EXISTS "Arabulucu kayit onaylarini yonetir" ON public.kayit_onaylari;
CREATE POLICY "Arabulucu kayit onaylarini yonetir"
ON public.kayit_onaylari FOR ALL
USING (public.is_case_mediator(case_id, auth.uid()) OR public.is_case_owner_not_party(case_id, auth.uid()))
WITH CHECK (public.is_case_mediator(case_id, auth.uid()) OR public.is_case_owner_not_party(case_id, auth.uid()));