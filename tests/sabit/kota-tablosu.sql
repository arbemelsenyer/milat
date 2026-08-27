-- ÜYELİK / PAKET / KOTA — parametre tablosu
-- mimari §15.2 · HAT H-15/3 · Code YAZDI, ÇALIŞTIRMADI (CLAUDE.md §10).
--
-- KARARI VERİYE TAŞIMA: madde "hangi paket, hangi kota, dolunca ne olur"
-- kararını bekliyordu. Karar beklemek yerine tablo öyle kuruldu ki
-- **"pilotta kota yok" kararı da bir VERİ durumudur**: `limit_deger` NULL =
-- SINIRSIZ. Yani kurucu hiçbir şey girmezse sistem bugünkü gibi çalışır;
-- kota istendiğinde kod değişmeden değer girilir.
--
-- Bu sayede kod hazır, karar geciktiğinde pilot beklemiyor.

create table if not exists public.uyelik_paketleri (
  id uuid primary key default gen_random_uuid(),
  kod text not null unique,              -- 'pilot' | 'temel' | 'kurumsal' …
  ad text not null,
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.paket_kotalari (
  id uuid primary key default gen_random_uuid(),
  paket_kod text not null references public.uyelik_paketleri(kod) on delete cascade,
  -- Neyin kotası: 'dosya' | 'ajan_kosumu' | 'belge_uretimi' | 'sesli_not'
  kota_turu text not null,
  -- NULL = SINIRSIZ. Pilotun varsayılanı budur.
  limit_deger integer check (limit_deger is null or limit_deger >= 0),
  -- Sayacın sıfırlandığı aralık: 'ay' | 'toplam'
  periyot text not null default 'ay' check (periyot in ('ay', 'toplam')),
  -- Kota dolunca ne olur: 'engelle' | 'uyar'. Varsayılan UYAR — pilotta
  -- kimsenin işi sessizce durmasın; engelleme bilinçli bir karardır.
  dolunca text not null default 'uyar' check (dolunca in ('engelle', 'uyar')),
  updated_at timestamptz not null default now(),
  unique (paket_kod, kota_turu)
);

-- Arabulucunun hangi pakette olduğu. Satırı yoksa 'pilot' varsayılır.
create table if not exists public.arabulucu_paketleri (
  user_id uuid primary key references auth.users(id) on delete cascade,
  paket_kod text not null references public.uyelik_paketleri(kod),
  baslangic timestamptz not null default now(),
  bitis timestamptz
);

alter table public.uyelik_paketleri enable row level security;
alter table public.paket_kotalari enable row level security;
alter table public.arabulucu_paketleri enable row level security;

create policy "Paketler okunabilir" on public.uyelik_paketleri
  for select to authenticated using (true);
create policy "Kotalar okunabilir" on public.paket_kotalari
  for select to authenticated using (true);
create policy "Kendi paketini görür" on public.arabulucu_paketleri
  for select to authenticated using (user_id = auth.uid() or has_role(auth.uid(), 'admin'::app_role));

create policy "Paketleri yalnız admin değiştirir" on public.uyelik_paketleri
  for all to authenticated using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));
create policy "Kotaları yalnız admin değiştirir" on public.paket_kotalari
  for all to authenticated using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));
create policy "Paket atamasını yalnız admin değiştirir" on public.arabulucu_paketleri
  for all to authenticated using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

-- PİLOT PAKETİ: dört kota türü de SINIRSIZ (limit_deger NULL).
-- Bu, H-15/3'teki "pilotta kota yok" önerisinin veri karşılığıdır.
insert into public.uyelik_paketleri (kod, ad) values
  ('pilot', 'Pilot (3 ay ücretsiz)')
on conflict (kod) do nothing;

insert into public.paket_kotalari (paket_kod, kota_turu, limit_deger, periyot, dolunca) values
  ('pilot', 'dosya',          null, 'toplam', 'uyar'),
  ('pilot', 'ajan_kosumu',    null, 'ay',     'uyar'),
  ('pilot', 'belge_uretimi',  null, 'ay',     'uyar'),
  ('pilot', 'sesli_not',      null, 'ay',     'uyar')
on conflict (paket_kod, kota_turu) do nothing;

-- DOĞRULAMA:
--   select paket_kod, kota_turu, limit_deger, dolunca from public.paket_kotalari;
-- Beklenen: 4 satır, `limit_deger` hepsinde NULL → hiçbir sınır uygulanmaz.
