-- ============================================================================
-- TUR C-2 — KÖR TEKLİF v2: KOŞULLU ARALIK / BRAKETLEME
-- Mimari: mimari/05-yetenek-envanteri.md, [v0.36 EKLEME — KÖR TEKLİF v2]
--
-- Kör veri kapısı:
--  · teklif_braketleri  → taraf YALNIZ kendi satırını görür/yazar; arabulucu ikisini görür.
--  · braket_bant_sorulari → tarafa RLS ile HİÇ açılmaz; taraf yalnız SECURITY DEFINER
--    fonksiyon üzerinden kendi sorusunun BANDINI görür. Sorunun kimden geldiği
--    (kaynak_braket_id) hiçbir yüzeyden tarafa dönmez.
--  · braket_denetim_izi → yalnız arabulucu/yönetici okur; append-only (UPDATE/DELETE yetkisi yok).
--
-- İdempotent: tekrar tekrar çalıştırılabilir.
-- ============================================================================

-- ---------------------------------------------------------------- 1) BRAKET
CREATE TABLE IF NOT EXISTS public.teklif_braketleri (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  party_id uuid NOT NULL REFERENCES public.case_parties(id) ON DELETE CASCADE,
  alt_sinir numeric,
  ust_sinir numeric,
  para_birimi text NOT NULL DEFAULT 'TRY',
  -- Koşullu taahhüt: "karşı taraf şu bandın altına inerse ben de şuraya inerim"
  kosul_bant_alt numeric,
  kosul_bant_ust numeric,
  kosullu_deger numeric,
  kosul_notu text,
  -- yok | aktif | soruldu | kabul | dustu
  kosul_durumu text NOT NULL DEFAULT 'yok',
  ajan_islendi_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (case_id, party_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'teklif_braketleri_kosul_durumu_chk'
  ) THEN
    ALTER TABLE public.teklif_braketleri
      ADD CONSTRAINT teklif_braketleri_kosul_durumu_chk
      CHECK (kosul_durumu IN ('yok','aktif','soruldu','kabul','dustu'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_teklif_braketleri_case ON public.teklif_braketleri(case_id);

GRANT SELECT, INSERT, UPDATE ON public.teklif_braketleri TO authenticated;
GRANT ALL ON public.teklif_braketleri TO service_role;
ALTER TABLE public.teklif_braketleri ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Taraf kendi braketini gorur" ON public.teklif_braketleri;
CREATE POLICY "Taraf kendi braketini gorur" ON public.teklif_braketleri
  FOR SELECT TO authenticated
  USING (public.is_own_case_party(party_id, auth.uid()));

DROP POLICY IF EXISTS "Taraf kendi braketini yazar" ON public.teklif_braketleri;
CREATE POLICY "Taraf kendi braketini yazar" ON public.teklif_braketleri
  FOR INSERT TO authenticated
  WITH CHECK (public.is_own_case_party(party_id, auth.uid()));

DROP POLICY IF EXISTS "Taraf kendi braketini gunceller" ON public.teklif_braketleri;
CREATE POLICY "Taraf kendi braketini gunceller" ON public.teklif_braketleri
  FOR UPDATE TO authenticated
  USING (public.is_own_case_party(party_id, auth.uid()))
  WITH CHECK (public.is_own_case_party(party_id, auth.uid()));

DROP POLICY IF EXISTS "Arabulucu braketleri gorur" ON public.teklif_braketleri;
CREATE POLICY "Arabulucu braketleri gorur" ON public.teklif_braketleri
  FOR SELECT TO authenticated
  USING (public.is_case_mediator(case_id, auth.uid()));

DROP POLICY IF EXISTS "Yonetici braket tam" ON public.teklif_braketleri;
CREATE POLICY "Yonetici braket tam" ON public.teklif_braketleri
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS trg_teklif_braketleri_updated_at ON public.teklif_braketleri;
CREATE TRIGGER trg_teklif_braketleri_updated_at
  BEFORE UPDATE ON public.teklif_braketleri
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------ 2) DENETİM İZİ
CREATE TABLE IF NOT EXISTS public.braket_denetim_izi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  party_id uuid REFERENCES public.case_parties(id) ON DELETE SET NULL,
  olay text NOT NULL,
  detay jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_braket_denetim_case ON public.braket_denetim_izi(case_id, created_at DESC);

-- Append-only: authenticated'a yalnız SELECT verilir; yazım service_role ve
-- SECURITY DEFINER fonksiyonlar üzerindendir.
GRANT SELECT ON public.braket_denetim_izi TO authenticated;
GRANT ALL ON public.braket_denetim_izi TO service_role;
ALTER TABLE public.braket_denetim_izi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Arabulucu braket izini gorur" ON public.braket_denetim_izi;
CREATE POLICY "Arabulucu braket izini gorur" ON public.braket_denetim_izi
  FOR SELECT TO authenticated
  USING (public.is_case_mediator(case_id, auth.uid()));

DROP POLICY IF EXISTS "Yonetici braket izini gorur" ON public.braket_denetim_izi;
CREATE POLICY "Yonetici braket izini gorur" ON public.braket_denetim_izi
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Braketin girilmesi/değiştirilmesi izi: yalnız gerçek değer değiştiğinde yazılır
-- (ajan_islendi_at / kosul_durumu gibi servis alanları iz üretmez).
CREATE OR REPLACE FUNCTION public.braket_izi_yaz()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.alt_sinir IS NOT DISTINCT FROM OLD.alt_sinir
     AND NEW.ust_sinir IS NOT DISTINCT FROM OLD.ust_sinir
     AND NEW.kosul_bant_alt IS NOT DISTINCT FROM OLD.kosul_bant_alt
     AND NEW.kosul_bant_ust IS NOT DISTINCT FROM OLD.kosul_bant_ust
     AND NEW.kosullu_deger IS NOT DISTINCT FROM OLD.kosullu_deger THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.braket_denetim_izi (case_id, party_id, olay, detay)
  VALUES (NEW.case_id, NEW.party_id, 'braket_girildi', jsonb_build_object(
    'alt_sinir', NEW.alt_sinir,
    'ust_sinir', NEW.ust_sinir,
    'para_birimi', NEW.para_birimi,
    'kosul_bant_alt', NEW.kosul_bant_alt,
    'kosul_bant_ust', NEW.kosul_bant_ust,
    'kosullu_deger', NEW.kosullu_deger,
    'kosul_durumu', NEW.kosul_durumu
  ));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_braket_izi ON public.teklif_braketleri;
CREATE TRIGGER trg_braket_izi
  AFTER INSERT OR UPDATE ON public.teklif_braketleri
  FOR EACH ROW EXECUTE FUNCTION public.braket_izi_yaz();

-- ---------------------------------------------------------- 3) BANT SORULARI
CREATE TABLE IF NOT EXISTS public.braket_bant_sorulari (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  hedef_party_id uuid NOT NULL REFERENCES public.case_parties(id) ON DELETE CASCADE,
  kaynak_braket_id uuid NOT NULL REFERENCES public.teklif_braketleri(id) ON DELETE CASCADE,
  bant_alt numeric NOT NULL,
  bant_ust numeric NOT NULL,
  para_birimi text NOT NULL DEFAULT 'TRY',
  -- soruldu | kabul | ret
  durum text NOT NULL DEFAULT 'soruldu',
  cevap_at timestamptz,
  islendi_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'braket_bant_sorulari_durum_chk'
  ) THEN
    ALTER TABLE public.braket_bant_sorulari
      ADD CONSTRAINT braket_bant_sorulari_durum_chk
      CHECK (durum IN ('soruldu','kabul','ret'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_braket_bant_case ON public.braket_bant_sorulari(case_id);
CREATE INDEX IF NOT EXISTS idx_braket_bant_hedef ON public.braket_bant_sorulari(hedef_party_id);

-- Tarafa SELECT verilmez: soru yalnız RPC üzerinden, kaynağı gizlenerek döner.
GRANT SELECT ON public.braket_bant_sorulari TO authenticated;
GRANT ALL ON public.braket_bant_sorulari TO service_role;
ALTER TABLE public.braket_bant_sorulari ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Arabulucu bant sorularini gorur" ON public.braket_bant_sorulari;
CREATE POLICY "Arabulucu bant sorularini gorur" ON public.braket_bant_sorulari
  FOR SELECT TO authenticated
  USING (public.is_case_mediator(case_id, auth.uid()));

DROP POLICY IF EXISTS "Yonetici bant sorulari tam" ON public.braket_bant_sorulari;
CREATE POLICY "Yonetici bant sorulari tam" ON public.braket_bant_sorulari
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ------------------------------------------------------------------ 4) RPC'ler
-- Tarafın kendi bant sorusu — kaynak taraf/braket bilgisi DÖNMEZ.
CREATE OR REPLACE FUNCTION public.braket_bant_sorularim(p_case_id uuid)
RETURNS TABLE (
  id uuid,
  bant_alt numeric,
  bant_ust numeric,
  para_birimi text,
  durum text,
  created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.id, s.bant_alt, s.bant_ust, s.para_birimi, s.durum, s.created_at
  FROM public.braket_bant_sorulari s
  WHERE s.case_id = p_case_id
    AND s.hedef_party_id IN (
      SELECT cp.id FROM public.case_parties cp
      WHERE cp.case_id = p_case_id AND cp.user_id = auth.uid()
    )
  ORDER BY s.created_at DESC;
$$;

REVOKE EXECUTE ON FUNCTION public.braket_bant_sorularim(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.braket_bant_sorularim(uuid) TO authenticated, service_role;

-- Bant sorusuna cevap. Cevap yalnız kayda düşer; taahhüdün düşmesini nöbetçi işler.
CREATE OR REPLACE FUNCTION public.braket_bant_cevapla(p_soru_id uuid, p_kabul boolean)
RETURNS text
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_soru public.braket_bant_sorulari%ROWTYPE;
  v_yeni text;
BEGIN
  SELECT * INTO v_soru FROM public.braket_bant_sorulari WHERE id = p_soru_id;
  IF NOT FOUND THEN
    RETURN 'bulunamadi';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.case_parties cp
    WHERE cp.id = v_soru.hedef_party_id AND cp.user_id = auth.uid()
  ) THEN
    RETURN 'yetkisiz';
  END IF;
  IF v_soru.durum <> 'soruldu' THEN
    RETURN 'zaten_cevaplandi';
  END IF;

  v_yeni := CASE WHEN p_kabul THEN 'kabul' ELSE 'ret' END;

  UPDATE public.braket_bant_sorulari
    SET durum = v_yeni, cevap_at = now()
    WHERE id = p_soru_id;

  INSERT INTO public.braket_denetim_izi (case_id, party_id, olay, detay)
  VALUES (v_soru.case_id, v_soru.hedef_party_id,
    CASE WHEN p_kabul THEN 'bant_sorusu_kabul' ELSE 'bant_sorusu_ret' END,
    jsonb_build_object(
      'soru_id', v_soru.id,
      'bant_alt', v_soru.bant_alt,
      'bant_ust', v_soru.bant_ust,
      'para_birimi', v_soru.para_birimi
    ));

  RETURN v_yeni;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.braket_bant_cevapla(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.braket_bant_cevapla(uuid, boolean) TO authenticated, service_role;
