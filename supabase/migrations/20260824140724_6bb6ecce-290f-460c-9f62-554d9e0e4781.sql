DROP POLICY IF EXISTS "Arabulucu dosya bellegini gorur" ON public.ajan_bellek;
CREATE POLICY "Arabulucu dosya bellegini gorur"
ON public.ajan_bellek FOR SELECT
USING (public.is_case_mediator(case_id, auth.uid()) OR public.is_case_owner_not_party(case_id, auth.uid()));

DROP POLICY IF EXISTS "Arabulucu kendi deneyim kaydini gorur" ON public.ajan_deneyim;
CREATE POLICY "Arabulucu kendi deneyim kaydini gorur"
ON public.ajan_deneyim FOR SELECT
USING ((mediator_id = auth.uid()) OR public.is_case_mediator(case_id, auth.uid()) OR public.is_case_owner_not_party(case_id, auth.uid()));

DROP POLICY IF EXISTS "Arabulucu kosum izini gorur" ON public.ajan_kosum_izi;
CREATE POLICY "Arabulucu kosum izini gorur"
ON public.ajan_kosum_izi FOR SELECT TO authenticated
USING (public.is_case_mediator(case_id, auth.uid()) OR public.is_case_owner_not_party(case_id, auth.uid()));

DROP POLICY IF EXISTS "Arabulucu onerileri yonetir" ON public.ajan_onerileri;
CREATE POLICY "Arabulucu onerileri yonetir"
ON public.ajan_onerileri FOR ALL
USING ((hedef = 'arabulucu'::text) AND (public.is_case_mediator(case_id, auth.uid()) OR public.is_case_owner_not_party(case_id, auth.uid())))
WITH CHECK ((hedef = 'arabulucu'::text) AND (public.is_case_mediator(case_id, auth.uid()) OR public.is_case_owner_not_party(case_id, auth.uid())));

DROP POLICY IF EXISTS "Arabulucu duraklatmayi yonetir" ON public.akis_duraklatma;
CREATE POLICY "Arabulucu duraklatmayi yonetir"
ON public.akis_duraklatma FOR ALL
USING (public.is_case_mediator(case_id, auth.uid()) OR public.is_case_owner_not_party(case_id, auth.uid()))
WITH CHECK (public.is_case_mediator(case_id, auth.uid()) OR public.is_case_owner_not_party(case_id, auth.uid()));

DROP POLICY IF EXISTS "Arabulucu akis olaylarini gorur" ON public.akis_olaylari;
CREATE POLICY "Arabulucu akis olaylarini gorur"
ON public.akis_olaylari FOR SELECT
USING (public.is_case_mediator(case_id, auth.uid()) OR public.is_case_owner_not_party(case_id, auth.uid()));

DROP POLICY IF EXISTS "Arabulucu talimatlarini yonetir" ON public.arabulucu_talimatlari;
CREATE POLICY "Arabulucu talimatlarini yonetir"
ON public.arabulucu_talimatlari FOR ALL
USING (public.is_case_mediator(case_id, auth.uid()) OR public.is_case_owner_not_party(case_id, auth.uid()))
WITH CHECK (public.is_case_mediator(case_id, auth.uid()) OR public.is_case_owner_not_party(case_id, auth.uid()));

DROP POLICY IF EXISTS "Arabulucu evrak kumesini yonetir" ON public.bilirkisi_evrak_kumesi;
CREATE POLICY "Arabulucu evrak kumesini yonetir"
ON public.bilirkisi_evrak_kumesi FOR ALL
USING (public.is_case_mediator(case_id, auth.uid()) OR public.is_case_owner_not_party(case_id, auth.uid()))
WITH CHECK (public.is_case_mediator(case_id, auth.uid()) OR public.is_case_owner_not_party(case_id, auth.uid()));

DROP POLICY IF EXISTS "Arabulucu bilirkisi onerilerini yonetir" ON public.bilirkisi_onerileri;
CREATE POLICY "Arabulucu bilirkisi onerilerini yonetir"
ON public.bilirkisi_onerileri FOR ALL
USING (public.is_case_mediator(case_id, auth.uid()) OR public.is_case_owner_not_party(case_id, auth.uid()))
WITH CHECK (public.is_case_mediator(case_id, auth.uid()) OR public.is_case_owner_not_party(case_id, auth.uid()));

DROP POLICY IF EXISTS "Arabulucu raporu gorur" ON public.bilirkisi_raporlari;
CREATE POLICY "Arabulucu raporu gorur"
ON public.bilirkisi_raporlari FOR SELECT
USING (public.is_case_mediator(case_id, auth.uid()) OR public.is_case_owner_not_party(case_id, auth.uid()));

DROP POLICY IF EXISTS "Arabulucu kapanisi yonetir" ON public.dosya_kapanis;
CREATE POLICY "Arabulucu kapanisi yonetir"
ON public.dosya_kapanis FOR ALL
USING (public.is_case_mediator(case_id, auth.uid()) OR public.is_case_owner_not_party(case_id, auth.uid()))
WITH CHECK (public.is_case_mediator(case_id, auth.uid()) OR public.is_case_owner_not_party(case_id, auth.uid()));

DROP POLICY IF EXISTS "Arabulucu elverislilik gorur" ON public.elverislilik_kontrol;
CREATE POLICY "Arabulucu elverislilik gorur"
ON public.elverislilik_kontrol FOR SELECT TO authenticated
USING (public.is_case_mediator(case_id, auth.uid()) OR public.is_case_owner_not_party(case_id, auth.uid()));

DROP POLICY IF EXISTS "Arabulucu foy gonderim kaydini gorur" ON public.foy_gonderim_kayitlari;
CREATE POLICY "Arabulucu foy gonderim kaydini gorur"
ON public.foy_gonderim_kayitlari FOR SELECT
USING (public.is_case_mediator(case_id, auth.uid()) OR public.is_case_owner_not_party(case_id, auth.uid()));

DROP POLICY IF EXISTS "Arabulucu iletisim degisimini gorur" ON public.iletisim_degisim;
CREATE POLICY "Arabulucu iletisim degisimini gorur"
ON public.iletisim_degisim FOR SELECT TO authenticated
USING (public.is_case_mediator(case_id, auth.uid()) OR public.is_case_owner_not_party(case_id, auth.uid()));

DROP POLICY IF EXISTS "Arabulucu kayit talebini yonetir" ON public.kayit_onay_talepleri;
CREATE POLICY "Arabulucu kayit talebini yonetir"
ON public.kayit_onay_talepleri FOR ALL TO authenticated
USING (public.is_case_mediator(case_id, auth.uid()) OR public.is_case_owner_not_party(case_id, auth.uid()))
WITH CHECK (public.is_case_mediator(case_id, auth.uid()) OR public.is_case_owner_not_party(case_id, auth.uid()));

DROP POLICY IF EXISTS "Arabulucu usul engellerini gorur" ON public.usul_engelleri;
CREATE POLICY "Arabulucu usul engellerini gorur"
ON public.usul_engelleri FOR SELECT TO authenticated
USING (public.is_case_mediator(case_id, auth.uid()) OR public.is_case_owner_not_party(case_id, auth.uid()));

DROP POLICY IF EXISTS "Arabulucu usul onerisini gorur" ON public.usul_onerileri;
CREATE POLICY "Arabulucu usul onerisini gorur"
ON public.usul_onerileri FOR SELECT TO authenticated
USING (public.is_case_mediator(case_id, auth.uid()) OR public.is_case_owner_not_party(case_id, auth.uid()));