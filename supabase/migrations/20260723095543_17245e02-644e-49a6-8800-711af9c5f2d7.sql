
-- Opsiyonel vekil (avukat) bilgisi alanları — case_parties
-- Tümü NULL'a izinli, mevcut RLS politikaları değişmeden geçerli kalır.
ALTER TABLE public.case_parties
  ADD COLUMN IF NOT EXISTS vekil_ad_soyad TEXT,
  ADD COLUMN IF NOT EXISTS vekil_baro TEXT,
  ADD COLUMN IF NOT EXISTS vekil_sicil_no TEXT;
