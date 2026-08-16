-- ============================================================================
-- ELVERİŞLİLİK KONTROLÜ (İBA 2.1)
-- Ajan, dosyanın arabuluculuğa elverişliliği bakımından DİKKAT GEREKTİREN bir
-- işaret bulursa arabulucuyu uyarır. KARAR VERMEZ, hukuki yorum yapmaz.
-- Kaynak YALNIZ bilgi tabanıdır (knowledge_base_chunks); dayanak bulunamazsa
-- uyarı üretilmez, durum 'kaynak_yok' yazılır.
-- GİZLİLİK (m.1): YALNIZ arabulucu / dosya sahibi / yönetici okur — TARAFA
-- HİÇBİR POLİTİKA VERİLMEZ.
-- Lovable SQL çalıştırıcısı için: DO bloğu yok, $$ yok. İdempotenttir.
-- ============================================================================

-- ---- PARÇA 1: tablo ----
CREATE TABLE IF NOT EXISTS public.elverislilik_kontrol (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  durum text NOT NULL DEFAULT 'isaret_yok',
  bulgular jsonb NOT NULL DEFAULT '[]'::jsonb,
  kaynaklar text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---- PARÇA 2: kısıt ve indeks ----
ALTER TABLE public.elverislilik_kontrol DROP CONSTRAINT IF EXISTS elverislilik_case_tekil;
ALTER TABLE public.elverislilik_kontrol ADD CONSTRAINT elverislilik_case_tekil
  UNIQUE (case_id);

ALTER TABLE public.elverislilik_kontrol DROP CONSTRAINT IF EXISTS elverislilik_durum_chk;
ALTER TABLE public.elverislilik_kontrol ADD CONSTRAINT elverislilik_durum_chk
  CHECK (durum IN ('isaret_var','isaret_yok','kaynak_yok'));

CREATE INDEX IF NOT EXISTS idx_elverislilik_case ON public.elverislilik_kontrol(case_id);

-- ---- PARÇA 3: yetkiler ----
GRANT SELECT ON public.elverislilik_kontrol TO authenticated;
GRANT ALL ON public.elverislilik_kontrol TO service_role;
ALTER TABLE public.elverislilik_kontrol ENABLE ROW LEVEL SECURITY;

-- ---- PARÇA 4: politikalar (TARAFA POLİTİKA YOK) ----
DROP POLICY IF EXISTS "Arabulucu elverislilik kontrolunu gorur" ON public.elverislilik_kontrol;
CREATE POLICY "Arabulucu elverislilik kontrolunu gorur" ON public.elverislilik_kontrol
  FOR SELECT TO authenticated
  USING (public.is_case_mediator(case_id, auth.uid()) OR public.is_case_owner_safe(case_id, auth.uid()));

DROP POLICY IF EXISTS "Yonetici elverislilik tam" ON public.elverislilik_kontrol;
CREATE POLICY "Yonetici elverislilik tam" ON public.elverislilik_kontrol
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
