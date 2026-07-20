
-- Ödeme Bilgi Servisi — Parça 2 ön koşulu: taraf, "Büro No"yu (case_process_tracker.buro_no)
-- ödeme açıklaması metninde göstermek için kendi dosyasının process tracker
-- satırını okuyabilmeli. Sadece SELECT, sadece kendi dosyası (is_case_party).
DROP POLICY IF EXISTS "Party can view own case process tracker" ON public.case_process_tracker;
CREATE POLICY "Party can view own case process tracker"
  ON public.case_process_tracker FOR SELECT TO authenticated
  USING (public.is_case_party(case_id, auth.uid()));
