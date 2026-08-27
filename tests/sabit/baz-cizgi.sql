-- KAZANIM SAYACI — arabulucunun BAZ ÇİZGİSİ (H-15/4 · seçim B)
-- mimari §5.9 ("Arabulucu kayıt olurken bir kere 'bu iş elle ne kadar
-- sürüyordu' baz çizgisi alınır") + §13 mini anketi.
-- Code YAZDI, ÇALIŞTIRMADI (CLAUDE.md §10).
--
-- KURUCU KARARI: katsayıyı BİZ KOYMUYORUZ. Rakam arabulucunun kendi beyanıdır.
-- Ekranda hesabın kendisi görünür ("kendi verdiğiniz 2 saat × 6 belge = 12 saat")
-- → §15.1 camdan kutu şartı böyle sağlanır.
--
-- KURUCU TALİMATI: baz çizgi KAYIT ANINDA alınır. Pilot arabulucuları baz çizgi
-- sorulmadan kaydolursa kazanım rakamı bir daha geriye dönük kurulamaz.
--
-- GİZLİLİK (§14, constitution m.1): burada yalnız SÜRE durur. Dosya içeriği,
-- taraf adı, tutar bu tabloya GİRMEZ.

create table if not exists public.arabulucu_baz_cizgi (
  user_id uuid primary key references auth.users(id) on delete cascade,
  -- §5.9'un üç sorusu. Saat cinsinden, ondalıklı olabilir (ör. 1.5).
  -- NULL = arabulucu o soruyu yanıtlamadı → o kalem saate ÇEVRİLMEZ.
  belge_saat numeric(4,2) check (belge_saat is null or belge_saat >= 0),
  analiz_saat numeric(4,2) check (analiz_saat is null or analiz_saat >= 0),
  beyan_saat numeric(4,2) check (beyan_saat is null or beyan_saat >= 0),
  -- Beyanın ne zaman alındığı; baz çizgi sonradan değiştirilirse iz kalsın.
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.arabulucu_baz_cizgi enable row level security;

-- Arabulucu YALNIZ kendi baz çizgisini görür ve yazar.
create policy "Baz çizgisini kendi görür"
on public.arabulucu_baz_cizgi for select to authenticated
using (user_id = auth.uid() or has_role(auth.uid(), 'admin'::app_role));

create policy "Baz çizgisini kendi yazar"
on public.arabulucu_baz_cizgi for insert to authenticated
with check (user_id = auth.uid());

create policy "Baz çizgisini kendi günceller"
on public.arabulucu_baz_cizgi for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

-- DOĞRULAMA:
--   select count(*) from public.arabulucu_baz_cizgi;
--   select policyname, cmd from pg_policies
--     where schemaname='public' and tablename='arabulucu_baz_cizgi';
-- Beklenen: tablo boş, 3 politika (select/insert/update).
--
-- NOT: `kazanim_katsayilari` tablosu ARTIK GEREKMİYOR — katsayı yöneticiden
-- değil arabulucudan gelir (H-15/4 seçim B). O göç (`kazanim-katsayilari.sql`)
-- ÇALIŞTIRILMAMALIDIR.
