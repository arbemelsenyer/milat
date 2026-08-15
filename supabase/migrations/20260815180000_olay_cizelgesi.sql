-- ============================================================================
-- OLAY ZAMAN ÇİZELGESİ (İBA 2.3 · mimari/05 §5.2g "hafif kademe")
-- Olay Haritası'nın (§9, K2) tam şeması beklenmeden, belge metni çıkarma
-- hattından ve dosya kayıtlarından tarihler çekilir. Her satır bir kaynağa
-- bağlıdır; dayanaksız tarih çizelgeye giremez (constitution m.2).
-- YALNIZ ARABULUCU/YÖNETİCİ okur — tarafa hiçbir SELECT politikası verilmez.
-- Lovable SQL çalıştırıcısı için: DO bloğu ve $$ kullanılmadı.
-- ============================================================================

-- ---- PARÇA 1: tablo ----
CREATE TABLE IF NOT EXISTS public.olay_cizelgesi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  tarih date,
  tarih_metni text NOT NULL,
  olay text NOT NULL,
  kaynak_tipi text NOT NULL DEFAULT 'belge',
  kaynak_document_id uuid REFERENCES public.case_documents(id) ON DELETE SET NULL,
  kaynak_adi text,
  kaynak_bolum text,
  celiski_notu text,
  sira integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---- PARÇA 2: kısıt ve indeks ----
ALTER TABLE public.olay_cizelgesi DROP CONSTRAINT IF EXISTS olay_cizelgesi_kaynak_tipi_chk;
ALTER TABLE public.olay_cizelgesi ADD CONSTRAINT olay_cizelgesi_kaynak_tipi_chk
  CHECK (kaynak_tipi IN ('belge','beyan','kayit'));

CREATE INDEX IF NOT EXISTS idx_olay_cizelgesi_case ON public.olay_cizelgesi(case_id, sira);

-- ---- PARÇA 3: yetkiler ----
GRANT SELECT ON public.olay_cizelgesi TO authenticated;
GRANT ALL ON public.olay_cizelgesi TO service_role;
ALTER TABLE public.olay_cizelgesi ENABLE ROW LEVEL SECURITY;

-- ---- PARÇA 4: politikalar (tarafa politika YOK) ----
DROP POLICY IF EXISTS "Arabulucu olay cizelgesini gorur" ON public.olay_cizelgesi;
CREATE POLICY "Arabulucu olay cizelgesini gorur" ON public.olay_cizelgesi
  FOR SELECT TO authenticated
  USING (public.is_case_mediator(case_id, auth.uid()));

DROP POLICY IF EXISTS "Yonetici olay cizelgesi tam" ON public.olay_cizelgesi;
CREATE POLICY "Yonetici olay cizelgesi tam" ON public.olay_cizelgesi
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
