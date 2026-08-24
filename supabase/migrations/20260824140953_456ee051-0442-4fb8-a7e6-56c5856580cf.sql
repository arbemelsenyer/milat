DROP POLICY IF EXISTS "Arabulucu kendi tercihini yonetir" ON public.arabulucu_kontrol_tercihleri;
CREATE POLICY "Arabulucu kendi tercihini yonetir"
ON public.arabulucu_kontrol_tercihleri FOR ALL
USING (public.is_case_mediator(case_id, auth.uid()) OR public.is_case_owner_not_party(case_id, auth.uid()))
WITH CHECK (public.is_case_mediator(case_id, auth.uid()) OR public.is_case_owner_not_party(case_id, auth.uid()));

DROP POLICY IF EXISTS "Arabulucu davet kayitlarini gorur" ON public.case_party_invites;
CREATE POLICY "Arabulucu davet kayitlarini gorur"
ON public.case_party_invites FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.case_parties cp
  WHERE cp.id = case_party_invites.case_party_id
    AND (public.is_case_mediator(cp.case_id, auth.uid())
         OR public.is_case_owner_not_party(cp.case_id, auth.uid()))
));