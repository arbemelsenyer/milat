-- TUR C-1 — İLK TEMAS VE KATILIM TEYİDİ
-- Bu göç idempotenttir; Lovable Cloud > SQL bölümünden çalıştırılır.
--
-- Tarafa dosya açılışında gönderilen bilgilendirme e-postasındaki tek dokunuşluk
-- cevabın kaydı. Cevap sayfası girişsizdir ve yalnız token ile çalışır; token
-- case_parties üzerinde tutulur ve cevap verildikten sonra kullanılamaz
-- (katilim_durumu 'beklemede' değilse edge fonksiyonu ikinci cevabı kabul etmez).
ALTER TABLE public.case_parties
  ADD COLUMN IF NOT EXISTS katilim_durumu TEXT NOT NULL DEFAULT 'beklemede',
  ADD COLUMN IF NOT EXISTS katilim_zamani TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS katilim_token TEXT;

COMMENT ON COLUMN public.case_parties.katilim_durumu IS
  'İlk temas cevabı: beklemede | katiliyor | katilmiyor | bilgi_istiyor';
COMMENT ON COLUMN public.case_parties.katilim_zamani IS
  'Tarafın katılım cevabını verdiği an.';
COMMENT ON COLUMN public.case_parties.katilim_token IS
  'Girişsiz katılım cevabı sayfasının tek kullanımlık anahtarı (yalnız edge fonksiyonu okur).';

-- Değer alanı serbest metne kaymasın: yalnız dört durum kabul edilir.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'case_parties_katilim_durumu_check'
      AND conrelid = 'public.case_parties'::regclass
  ) THEN
    ALTER TABLE public.case_parties
      ADD CONSTRAINT case_parties_katilim_durumu_check
      CHECK (katilim_durumu IN ('beklemede', 'katiliyor', 'katilmiyor', 'bilgi_istiyor'));
  END IF;
END $$;

-- Token benzersiz olmalı (çakışma hâlinde yanlış tarafa cevap yazılmasın).
CREATE UNIQUE INDEX IF NOT EXISTS case_parties_katilim_token_key
  ON public.case_parties (katilim_token)
  WHERE katilim_token IS NOT NULL;

-- NOT: katilim_token hiçbir istemci yüzeyine açılmaz; okuma/yazma yalnız
-- taraf-katilim edge fonksiyonunda service role ile yapılır. case_parties
-- üzerindeki mevcut RLS politikaları değiştirilmemiştir.
