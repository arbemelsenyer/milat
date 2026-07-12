
-- Taraf Beyanı: case_parties'e serbest metin beyan/pozisyon/anlatım kolonu ekle.
-- Nullable; mevcut RLS politikaları ve trg_case_parties_self_update_guard trigger'ı
-- (yalnızca case_id/user_id/role/party_role/invite_status/tc_kimlik/created_at'i
-- kilitliyor) statement kolonunu otomatik olarak kapsar — taraf kendi satırını
-- güncelleyebilir, arabulucu/admin tüm satırları görüp güncelleyebilir.
ALTER TABLE public.case_parties ADD COLUMN IF NOT EXISTS statement TEXT NULL;
