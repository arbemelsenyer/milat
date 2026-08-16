-- ============================================================================
-- İLETİŞİMDE DEĞİŞİM — AYRINTI KAYDI (İBA 1.5 · todo A4/5)
-- Kartın SAYIM kolu ekranda çalışır; bu tablo yalnız "Ayrıntısını çıkar" ile
-- üretilen TEK PARAGRAF ve iki dayanak alıntısını saklar. Kayıt saklanır ki her
-- açılışta yeniden model çağrısı (ücret) çıkmasın; "Yeniden çıkar" ile tazelenir.
-- GİZLİLİK (m.1): YALNIZ arabulucu/dosya sahibi/yönetici okur — tarafa hiçbir
-- SELECT politikası verilmez. Taraf başına TEK satır (party_id UNIQUE).
-- Lovable SQL çalıştırıcısı için: DO bloğu yok, $$ yok. İdempotenttir.
-- ============================================================================

-- ---- PARÇA 1: tablo ----
CREATE TABLE IF NOT EXISTS public.iletisim_degisim (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  party_id uuid NOT NULL REFERENCES public.case_parties(id) ON DELETE CASCADE,
  paragraf text NOT NULL DEFAULT '',
  alinti_ilk text NOT NULL DEFAULT '',
  alinti_son text NOT NULL DEFAULT '',
  tarih_ilk timestamptz,
  tarih_son timestamptz,
  kaynak_ilk text,
  kaynak_son text,
  durum text NOT NULL DEFAULT 'hazir',
  sebep text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---- PARÇA 2: kısıt ve indeks ----
ALTER TABLE public.iletisim_degisim DROP CONSTRAINT IF EXISTS iletisim_degisim_party_tekil;
ALTER TABLE public.iletisim_degisim ADD CONSTRAINT iletisim_degisim_party_tekil
  UNIQUE (party_id);

ALTER TABLE public.iletisim_degisim DROP CONSTRAINT IF EXISTS iletisim_degisim_durum_chk;
ALTER TABLE public.iletisim_degisim ADD CONSTRAINT iletisim_degisim_durum_chk
  CHECK (durum IN ('hazir','degisim_yok','elendi'));

CREATE INDEX IF NOT EXISTS idx_iletisim_degisim_case ON public.iletisim_degisim(case_id);

-- ---- PARÇA 3: yetkiler ----
GRANT SELECT ON public.iletisim_degisim TO authenticated;
GRANT ALL ON public.iletisim_degisim TO service_role;
ALTER TABLE public.iletisim_degisim ENABLE ROW LEVEL SECURITY;

-- ---- PARÇA 4: politikalar (tarafa politika YOK) ----
DROP POLICY IF EXISTS "Arabulucu iletisim degisimini gorur" ON public.iletisim_degisim;
CREATE POLICY "Arabulucu iletisim degisimini gorur" ON public.iletisim_degisim
  FOR SELECT TO authenticated
  USING (public.is_case_mediator(case_id, auth.uid()) OR public.is_case_owner_safe(case_id, auth.uid()));

DROP POLICY IF EXISTS "Yonetici iletisim degisimi tam" ON public.iletisim_degisim;
CREATE POLICY "Yonetici iletisim degisimi tam" ON public.iletisim_degisim
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
