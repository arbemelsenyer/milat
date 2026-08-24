-- 1) Dar yardimci: sahip, o dosyanin TARAFI ise arabulucu yetkisi verilmez.
CREATE OR REPLACE FUNCTION public.is_case_owner_not_party(_case_id uuid, _user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.is_case_owner_safe(_case_id, _user_id)
     AND NOT EXISTS (
       SELECT 1 FROM public.case_parties
       WHERE case_id = _case_id AND user_id = _user_id
     );
$function$;

-- 2) Taraf-gizli bes tabloda dar yardimciya gecilir.

DROP POLICY IF EXISTS "Arabulucu foyleri yonetir" ON public.oturum_hazirlik_foyleri;
CREATE POLICY "Arabulucu foyleri yonetir"
ON public.oturum_hazirlik_foyleri FOR ALL TO authenticated
USING (public.is_case_mediator(case_id, auth.uid()) OR public.is_case_owner_not_party(case_id, auth.uid()))
WITH CHECK (public.is_case_mediator(case_id, auth.uid()) OR public.is_case_owner_not_party(case_id, auth.uid()));

DROP POLICY IF EXISTS "Arabulucu oturum kaydini gorur" ON public.oturum_kayitlari;
CREATE POLICY "Arabulucu oturum kaydini gorur"
ON public.oturum_kayitlari FOR SELECT TO authenticated
USING (public.is_case_mediator(case_id, auth.uid()) OR public.is_case_owner_not_party(case_id, auth.uid()));

DROP POLICY IF EXISTS "Arabulucu kalem ve dayanagi gorur" ON public.taraf_kalemleri;
CREATE POLICY "Arabulucu kalem ve dayanagi gorur"
ON public.taraf_kalemleri FOR SELECT
USING (public.is_case_mediator(case_id, auth.uid()) OR public.is_case_owner_not_party(case_id, auth.uid()));

DROP POLICY IF EXISTS "Arabulucu beyanlari gorur" ON public.bilirkisi_secim_beyani;
CREATE POLICY "Arabulucu beyanlari gorur"
ON public.bilirkisi_secim_beyani FOR SELECT
USING (public.is_case_mediator(case_id, auth.uid()) OR public.is_case_owner_not_party(case_id, auth.uid()));

DROP POLICY IF EXISTS "Arabulucu yanitlari gorur" ON public.bilirkisi_taraf_yanitlari;
CREATE POLICY "Arabulucu yanitlari gorur"
ON public.bilirkisi_taraf_yanitlari FOR SELECT
USING (public.is_case_mediator(case_id, auth.uid()) OR public.is_case_owner_not_party(case_id, auth.uid()));