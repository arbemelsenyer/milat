
-- Experts (Bilirkişi) table
CREATE TABLE IF NOT EXISTS public.experts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  title TEXT,
  specialization TEXT NOT NULL,
  niche_area TEXT NOT NULL,
  bio TEXT,
  hourly_rate NUMERIC(10,2) DEFAULT 0,
  city TEXT,
  email TEXT,
  phone TEXT,
  years_experience INTEGER DEFAULT 0,
  rating NUMERIC(2,1) DEFAULT 4.5,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.experts TO authenticated, anon;
GRANT ALL ON public.experts TO service_role;
ALTER TABLE public.experts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Experts are viewable by anyone authenticated"
  ON public.experts FOR SELECT
  TO authenticated, anon
  USING (active = true);

CREATE POLICY "Admins manage experts"
  ON public.experts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_experts_updated_at
  BEFORE UPDATE ON public.experts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Link expert to case
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS assigned_expert_id UUID REFERENCES public.experts(id);

-- Seed 6 sample experts
INSERT INTO public.experts (full_name, title, specialization, niche_area, bio, hourly_rate, city, years_experience, rating) VALUES
  ('Dr. Mehmet Yıldız', 'Mali Müşavir / Bilirkişi', 'Şirket Değerleme, Ticari Hesaplar', 'Ticari', 'TÜRMOB üyesi, 15 yıllık ticari uyuşmazlık deneyimi.', 1500, 'İstanbul', 15, 4.8),
  ('Prof. Dr. Ayşe Kara', 'İnşaat Mühendisi', 'Yapı Denetimi, Eser Sözleşmeleri', 'İnşaat', 'İTÜ öğretim üyesi, müteahhitlik uyuşmazlıkları uzmanı.', 1800, 'İstanbul', 22, 4.9),
  ('Av. Selim Demir', 'İş Hukuku Uzmanı', 'Kıdem, İhbar, Mobbing Hesaplamaları', 'İşçi-İşveren', 'İş mahkemelerinde 12 yıl bilirkişilik.', 1200, 'Ankara', 12, 4.7),
  ('Dr. Zeynep Aksoy', 'Tıp Doktoru / Adli Tıp', 'Malpraktis, Hekim Sorumluluğu', 'Sağlık Hukuku', 'Adli Tıp Kurumu eski üyesi.', 2000, 'İzmir', 18, 4.9),
  ('Hasan Çelik', 'Sigorta Eksperi', 'Hasar Tespiti, Aktüerya', 'Sigorta', 'SEDDK lisanslı eksper, 10 yıl deneyim.', 1100, 'İstanbul', 10, 4.6),
  ('Av. Burcu Erdem', 'Marka & Patent Vekili', 'Fikri Sınai Haklar, Lisanslama', 'Fikri Sınai Mülkiyet', 'TÜRKPATENT vekili, marka uyuşmazlıkları.', 1600, 'İstanbul', 14, 4.8)
ON CONFLICT DO NOTHING;
