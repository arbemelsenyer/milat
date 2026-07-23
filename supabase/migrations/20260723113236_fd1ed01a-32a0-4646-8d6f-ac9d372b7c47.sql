
-- party_analyses'e, analiz üretildiği andaki uyuşmazlık konusu metninin anlık görüntüsü.
-- Nullable — mevcut kayıtlarda NULL kalır (staleness uyarısı NULL'da hiç gösterilmez).
-- RLS değişmez.
ALTER TABLE public.party_analyses
  ADD COLUMN IF NOT EXISTS issue_description_snapshot TEXT;
