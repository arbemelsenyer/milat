
-- Dosya sahibi (cases.user_id), atanmış arabulucu olmasa bile kendi dosyasının
-- taraflarını (case_parties) görebilsin. Mevcut policy'lere ek — hiçbiri
-- DROP/değiştirilmedi (mediator/party/admin SELECT ve UPDATE politikaları aynen
-- kalıyor; karşı taraf PII koruması UPDATE tarafında bilinçli olarak korunuyor).
CREATE POLICY "Case owner can view case_parties" ON public.case_parties
  FOR SELECT TO authenticated
  USING (public.is_case_owner_safe(case_id, auth.uid()));
