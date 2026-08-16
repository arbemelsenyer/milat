-- ============================================================================
-- OTURUM KAYIT PROTOKOLÜ (İBA 1.8 / B18) — İZİN ve SİLME altyapısı
-- Bu göç kayıt ALMAZ; yalnız (a) onay formu talebi, (b) katılımcı onayları,
-- (c) silme kaydının tutulacağı kayıt defterini açar.
-- KURALLAR: 48 saat · oybirliği · tek kapı · ses 24 saat sonra / döküm süreç
-- sonunda silinir (constitution m.10 süresiz saklama yasağı).
-- GİZLİLİK (m.1): kayıt ve döküm YALNIZ arabulucuya görünür — oturum_kayitlari
-- üzerinde tarafa hiçbir politika verilmez. Taraf yalnız kendi onay satırını
-- görür ve yazar; karşı tarafın kararını hiçbir sorguyla göremez.
-- Lovable SQL çalıştırıcısı için: DO bloğu yok, $$ yok. İdempotenttir.
-- ============================================================================

-- ---- PARÇA 1: onay formu talebi (48 saat sayacı buradan başlar) ----
CREATE TABLE IF NOT EXISTS public.kayit_onay_talepleri (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  gonderen_user_id uuid DEFAULT auth.uid(),
  gonderim_zamani timestamptz NOT NULL DEFAULT now(),
  metin_surumu text NOT NULL DEFAULT 'v1',
  iptal_zamani timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kayit_onay_talepleri_case
  ON public.kayit_onay_talepleri(case_id, gonderim_zamani DESC);

GRANT SELECT, INSERT, UPDATE ON public.kayit_onay_talepleri TO authenticated;
GRANT ALL ON public.kayit_onay_talepleri TO service_role;
ALTER TABLE public.kayit_onay_talepleri ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Arabulucu kayit talebini yonetir" ON public.kayit_onay_talepleri;
CREATE POLICY "Arabulucu kayit talebini yonetir" ON public.kayit_onay_talepleri
  FOR ALL TO authenticated
  USING (public.is_case_mediator(case_id, auth.uid()) OR public.is_case_owner_safe(case_id, auth.uid()))
  WITH CHECK (public.is_case_mediator(case_id, auth.uid()) OR public.is_case_owner_safe(case_id, auth.uid()));

DROP POLICY IF EXISTS "Taraf kayit talebini gorur" ON public.kayit_onay_talepleri;
CREATE POLICY "Taraf kayit talebini gorur" ON public.kayit_onay_talepleri
  FOR SELECT TO authenticated
  USING (public.is_case_party(case_id, auth.uid()));

DROP POLICY IF EXISTS "Yonetici kayit talebi tam" ON public.kayit_onay_talepleri;
CREATE POLICY "Yonetici kayit talebi tam" ON public.kayit_onay_talepleri
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ---- PARÇA 2: katılımcı onayları (oybirliği burada ölçülür) ----
-- katilimci_anahtari: 'taraf:<party_id>' · 'vekil:<party_id>' · 'uzman:<atama_id>'
-- Vekil ve uzmanın uygulamada girişi olmadığı için onayları arabulucu kaydeder;
-- 'dayanak' o kaydın nereden geldiğini yazar (kayıtsız onay yazılmaz).
CREATE TABLE IF NOT EXISTS public.kayit_onaylari (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  talep_id uuid NOT NULL REFERENCES public.kayit_onay_talepleri(id) ON DELETE CASCADE,
  party_id uuid REFERENCES public.case_parties(id) ON DELETE CASCADE,
  katilimci_tipi text NOT NULL,
  katilimci_anahtari text NOT NULL,
  katilimci_adi text,
  durum text NOT NULL,
  dayanak text,
  metin_surumu text NOT NULL DEFAULT 'v1',
  kaydeden_user_id uuid DEFAULT auth.uid(),
  karar_zamani timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.kayit_onaylari DROP CONSTRAINT IF EXISTS kayit_onaylari_tip_chk;
ALTER TABLE public.kayit_onaylari ADD CONSTRAINT kayit_onaylari_tip_chk
  CHECK (katilimci_tipi IN ('taraf','vekil','uzman'));

ALTER TABLE public.kayit_onaylari DROP CONSTRAINT IF EXISTS kayit_onaylari_durum_chk;
ALTER TABLE public.kayit_onaylari ADD CONSTRAINT kayit_onaylari_durum_chk
  CHECK (durum IN ('onay','ret'));

ALTER TABLE public.kayit_onaylari DROP CONSTRAINT IF EXISTS kayit_onaylari_tekil;
ALTER TABLE public.kayit_onaylari ADD CONSTRAINT kayit_onaylari_tekil
  UNIQUE (talep_id, katilimci_anahtari);

CREATE INDEX IF NOT EXISTS idx_kayit_onaylari_talep ON public.kayit_onaylari(talep_id);

GRANT SELECT, INSERT, UPDATE ON public.kayit_onaylari TO authenticated;
GRANT ALL ON public.kayit_onaylari TO service_role;
ALTER TABLE public.kayit_onaylari ENABLE ROW LEVEL SECURITY;

-- Taraf: yalnız KENDİ satırını görür ve yazar (karşı tarafın kararını göremez).
DROP POLICY IF EXISTS "Taraf kendi kayit onayini gorur" ON public.kayit_onaylari;
CREATE POLICY "Taraf kendi kayit onayini gorur" ON public.kayit_onaylari
  FOR SELECT TO authenticated
  USING (katilimci_tipi = 'taraf' AND public.is_own_case_party(party_id, auth.uid()));

DROP POLICY IF EXISTS "Taraf kendi kayit onayini yazar" ON public.kayit_onaylari;
CREATE POLICY "Taraf kendi kayit onayini yazar" ON public.kayit_onaylari
  FOR INSERT TO authenticated
  WITH CHECK (katilimci_tipi = 'taraf' AND public.is_own_case_party(party_id, auth.uid()));

-- Rıza her an geri alınabilir (constitution m.10): taraf kendi satırını günceller.
DROP POLICY IF EXISTS "Taraf kendi kayit onayini gunceller" ON public.kayit_onaylari;
CREATE POLICY "Taraf kendi kayit onayini gunceller" ON public.kayit_onaylari
  FOR UPDATE TO authenticated
  USING (katilimci_tipi = 'taraf' AND public.is_own_case_party(party_id, auth.uid()))
  WITH CHECK (katilimci_tipi = 'taraf' AND public.is_own_case_party(party_id, auth.uid()));

DROP POLICY IF EXISTS "Arabulucu kayit onaylarini yonetir" ON public.kayit_onaylari;
CREATE POLICY "Arabulucu kayit onaylarini yonetir" ON public.kayit_onaylari
  FOR ALL TO authenticated
  USING (public.is_case_mediator(case_id, auth.uid()) OR public.is_case_owner_safe(case_id, auth.uid()))
  WITH CHECK (public.is_case_mediator(case_id, auth.uid()) OR public.is_case_owner_safe(case_id, auth.uid()));

DROP POLICY IF EXISTS "Yonetici kayit onayi tam" ON public.kayit_onaylari;
CREATE POLICY "Yonetici kayit onayi tam" ON public.kayit_onaylari
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ---- PARÇA 3: kayıt defteri (silme altyapısı — kayıt/döküm hattı AYRI İŞ) ----
-- Ses dosyası 'oturum-kayitlari' kovasında tutulacaktır; kova, kayıt hattı
-- kurulurken açılır. Nöbetçi ajan bu satırları okuyup siler ve silmeyi buraya
-- yazar. Tarafa hiçbir SELECT politikası VERİLMEZ (m.1).
CREATE TABLE IF NOT EXISTS public.oturum_kayitlari (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.case_sessions(id) ON DELETE SET NULL,
  talep_id uuid REFERENCES public.kayit_onay_talepleri(id) ON DELETE SET NULL,
  ses_dosya_yolu text,
  dokum_metni text,
  ses_silindi_at timestamptz,
  dokum_silindi_at timestamptz,
  ses_silme_notu text,
  dokum_silme_notu text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_oturum_kayitlari_case ON public.oturum_kayitlari(case_id);

GRANT SELECT ON public.oturum_kayitlari TO authenticated;
GRANT ALL ON public.oturum_kayitlari TO service_role;
ALTER TABLE public.oturum_kayitlari ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Arabulucu oturum kaydini gorur" ON public.oturum_kayitlari;
CREATE POLICY "Arabulucu oturum kaydini gorur" ON public.oturum_kayitlari
  FOR SELECT TO authenticated
  USING (public.is_case_mediator(case_id, auth.uid()) OR public.is_case_owner_safe(case_id, auth.uid()));

DROP POLICY IF EXISTS "Yonetici oturum kaydi tam" ON public.oturum_kayitlari;
CREATE POLICY "Yonetici oturum kaydi tam" ON public.oturum_kayitlari
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
