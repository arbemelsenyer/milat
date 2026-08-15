-- ============================================================================
-- BELGE ÖZETİ (İBA 1.2 kararı — tasks/todo.md A1)
-- Her belge için tek paragraf özet + "neyi kanıtlıyor" satırı.
-- YALNIZ ARABULUCU/YÖNETİCİ okur — tarafa hiçbir SELECT politikası verilmez.
-- Belge silinince özet de silinir (ON DELETE CASCADE) — kırıntı kalmaz.
-- Lovable SQL çalıştırıcısı için: DO bloğu ve $$ kullanılmadı; parça parça
-- çalıştırılabilir.
-- ============================================================================

-- ---- PARÇA 1: tablo ----
CREATE TABLE IF NOT EXISTS public.belge_ozetleri (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.case_documents(id) ON DELETE CASCADE,
  ozet text,
  kaniti text,
  durum text NOT NULL DEFAULT 'uretildi',
  sebep text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id)
);

-- ---- PARÇA 2: kısıt ve indeks ----
ALTER TABLE public.belge_ozetleri DROP CONSTRAINT IF EXISTS belge_ozetleri_durum_chk;
ALTER TABLE public.belge_ozetleri ADD CONSTRAINT belge_ozetleri_durum_chk
  CHECK (durum IN ('uretildi','metin_yok','elendi'));

CREATE INDEX IF NOT EXISTS idx_belge_ozetleri_case ON public.belge_ozetleri(case_id);

-- ---- PARÇA 3: yetkiler ----
GRANT SELECT ON public.belge_ozetleri TO authenticated;
GRANT ALL ON public.belge_ozetleri TO service_role;
ALTER TABLE public.belge_ozetleri ENABLE ROW LEVEL SECURITY;

-- ---- PARÇA 4: politikalar (tarafa politika YOK) ----
DROP POLICY IF EXISTS "Arabulucu belge ozetlerini gorur" ON public.belge_ozetleri;
CREATE POLICY "Arabulucu belge ozetlerini gorur" ON public.belge_ozetleri
  FOR SELECT TO authenticated
  USING (public.is_case_mediator(case_id, auth.uid()));

DROP POLICY IF EXISTS "Yonetici belge ozetlerini gorur" ON public.belge_ozetleri;
CREATE POLICY "Yonetici belge ozetlerini gorur" ON public.belge_ozetleri
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
