-- ============================================================================
-- GÜÇ DENGESİ İŞARETİ (İBA 2.4 · todo B16)
-- Taraflar arasındaki dengesizlik GÖSTERGELERİ — durum tespitidir, kişilik
-- değerlendirmesi değildir (constitution m.2 teşhis dili yasağı, §11).
-- Her göstergenin dayanağı ZORUNLUDUR; dayanaksız gösterge yazılmaz.
-- YALNIZ ARABULUCU/YÖNETİCİ okur — tarafa hiçbir SELECT politikası verilmez.
-- Lovable SQL çalıştırıcısı için: DO bloğu ve $$ kullanılmadı.
-- ============================================================================

-- ---- PARÇA 1: tablo ----
CREATE TABLE IF NOT EXISTS public.guc_dengesi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  gosterge_tipi text NOT NULL,
  baslik text NOT NULL,
  aciklama text NOT NULL,
  dayanak text NOT NULL,
  sira integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---- PARÇA 2: kısıt ve indeks ----
ALTER TABLE public.guc_dengesi DROP CONSTRAINT IF EXISTS guc_dengesi_tip_chk;
ALTER TABLE public.guc_dengesi ADD CONSTRAINT guc_dengesi_tip_chk
  CHECK (gosterge_tipi IN ('vekil','nitelik','belge','katilim','anlatim','yok'));

CREATE INDEX IF NOT EXISTS idx_guc_dengesi_case ON public.guc_dengesi(case_id, sira);

-- ---- PARÇA 3: yetkiler ----
GRANT SELECT ON public.guc_dengesi TO authenticated;
GRANT ALL ON public.guc_dengesi TO service_role;
ALTER TABLE public.guc_dengesi ENABLE ROW LEVEL SECURITY;

-- ---- PARÇA 4: politikalar (tarafa politika YOK) ----
DROP POLICY IF EXISTS "Arabulucu guc dengesini gorur" ON public.guc_dengesi;
CREATE POLICY "Arabulucu guc dengesini gorur" ON public.guc_dengesi
  FOR SELECT TO authenticated
  USING (public.is_case_mediator(case_id, auth.uid()));

DROP POLICY IF EXISTS "Yonetici guc dengesi tam" ON public.guc_dengesi;
CREATE POLICY "Yonetici guc dengesi tam" ON public.guc_dengesi
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
