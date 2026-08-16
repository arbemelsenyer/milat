-- ============================================================================
-- USUL ÖNERİSİ (İBA 2.2)
-- Ajan, dosyanın koşullarına göre sürecin BİÇİMİNE dair gerekçeli öneri sunar.
-- Karar ve kurgu ARABULUCUNUNDUR (constitution m.3). İşin esasına dair öneri
-- üretilmez; dayanağı dosya verisinde karşılığı olmayan öneri sunucuda elenir.
-- GİZLİLİK (m.1): YALNIZ arabulucu / dosya sahibi / yönetici okur — TARAFA
-- HİÇBİR POLİTİKA VERİLMEZ.
-- Lovable SQL çalıştırıcısı için: DO bloğu yok, $$ yok. İdempotenttir.
-- ============================================================================

-- ---- PARÇA 1: tablo ----
CREATE TABLE IF NOT EXISTS public.usul_onerileri (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  durum text NOT NULL DEFAULT 'oneri_yok',
  oneriler jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---- PARÇA 2: kısıt ve indeks ----
ALTER TABLE public.usul_onerileri DROP CONSTRAINT IF EXISTS usul_onerileri_case_tekil;
ALTER TABLE public.usul_onerileri ADD CONSTRAINT usul_onerileri_case_tekil
  UNIQUE (case_id);

ALTER TABLE public.usul_onerileri DROP CONSTRAINT IF EXISTS usul_onerileri_durum_chk;
ALTER TABLE public.usul_onerileri ADD CONSTRAINT usul_onerileri_durum_chk
  CHECK (durum IN ('oneri_var','oneri_yok'));

CREATE INDEX IF NOT EXISTS idx_usul_onerileri_case ON public.usul_onerileri(case_id);

-- ---- PARÇA 3: yetkiler ----
GRANT SELECT ON public.usul_onerileri TO authenticated;
GRANT ALL ON public.usul_onerileri TO service_role;
ALTER TABLE public.usul_onerileri ENABLE ROW LEVEL SECURITY;

-- ---- PARÇA 4: politikalar (TARAFA POLİTİKA YOK) ----
DROP POLICY IF EXISTS "Arabulucu usul onerilerini gorur" ON public.usul_onerileri;
CREATE POLICY "Arabulucu usul onerilerini gorur" ON public.usul_onerileri
  FOR SELECT TO authenticated
  USING (public.is_case_mediator(case_id, auth.uid()) OR public.is_case_owner_safe(case_id, auth.uid()));

DROP POLICY IF EXISTS "Yonetici usul onerisi tam" ON public.usul_onerileri;
CREATE POLICY "Yonetici usul onerisi tam" ON public.usul_onerileri
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ---- PARÇA 5: agent_states izinli tip listesine 'usul_onerisi' (22. ad) ----
-- Mevcut 21 ad KORUNUR, yalnız yeni ad eklenir. Kısıt genişletilmezse ajan
-- çalışsa bile durum yazımı sessizce düşer ve panel boş görünür (15.08 dersi).
ALTER TABLE public.agent_states DROP CONSTRAINT IF EXISTS agent_states_agent_type_check;
ALTER TABLE public.agent_states ADD CONSTRAINT agent_states_agent_type_check
  CHECK (agent_type IN (
    'party_a', 'party_b', 'mediator', 'validator',
    'party_analysis', 'common_ground', 'classify_dispute',
    'deadline_detect', 'meeting_notes', 'document_analysis', 'agreement_generation',
    'orchestrator', 'party_consistency', 'party_communication',
    'nobetci',
    'belge_ozeti', 'olay_cizelgesi', 'guc_dengesi', 'iletisim_degisim', 'dosya_ozeti',
    'elverislilik',
    'usul_onerisi'
  ));
