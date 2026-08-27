-- SAKLAMA SÜRESİ PARAMETRE TABLOSU + PERİYODİK İMHA
-- mimari §15.2 · constitution m.10 (süresiz saklama yasağı)
-- Code YAZDI, ÇALIŞTIRMADI (CLAUDE.md §10). Süre DEĞERLERİ kurucu kararıdır
-- (HAT H-15); tablo boş kurulur, değerler karar gelince girilir.
--
-- NEDEN TABLO: §15.2 "saklama süreleri PARAMETRE TABLOSUNDAN okunuyor" diyor.
-- Bugün süre kodda sabit: yalnız oturum kaydı için 24 saat (`ajan-nobetci`
-- kayıt silme kolu). Diğer veri türleri için süre kavramı hiç yok.
-- Kodda sabit süre, hukuki süre değiştiğinde deploy gerektirir; parametre
-- tablosu bunu veri düzeyine indirir.

create table if not exists public.saklama_sureleri (
  id uuid primary key default gen_random_uuid(),
  -- Hangi veri türü: 'oturum_kaydi_ses' · 'oturum_kaydi_dokum' · 'case_documents'
  -- · 'dosya_kapanis_sonrasi' gibi. Kod bu anahtarla okur.
  veri_turu text not null unique,
  -- Sürenin kendisi. NULL = "süre belirlenmedi" → imha kolu o türe DOKUNMAZ.
  -- Böylece değer girilmeden hiçbir şey silinmez (güvenli yön).
  saklama_gun integer check (saklama_gun is null or saklama_gun > 0),
  -- Sayacın nereden başladığı: 'olusturma' | 'dosya_kapanisi'
  baslangic text not null default 'olusturma'
    check (baslangic in ('olusturma', 'dosya_kapanisi')),
  aciklama text,
  guncelleyen uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.saklama_sureleri enable row level security;

-- Okuma: kimliği doğrulanmış herkes (süreler gizli değil, şeffaflık gerektirir).
create policy "Saklama süreleri okunabilir"
on public.saklama_sureleri for select to authenticated using (true);

-- Yazma: yalnız admin. Süre değiştirmek hukuki sonuç doğurur.
create policy "Saklama sürelerini yalnız admin değiştirir"
on public.saklama_sureleri for all to authenticated
using (has_role(auth.uid(), 'admin'::app_role))
with check (has_role(auth.uid(), 'admin'::app_role));

-- Satırlar DEĞER OLMADAN kurulur: `saklama_gun` NULL → imha kolu dokunmaz.
insert into public.saklama_sureleri (veri_turu, baslangic, aciklama) values
  ('oturum_kaydi_ses',     'olusturma',      'Sesli notun ham ses dosyası. Bugün kodda: metne çevrilir çevrilmez silinir (H-14 şart 1).'),
  ('oturum_kaydi_dokum',   'dosya_kapanisi', 'Sesli nottan çıkan metin.'),
  ('case_documents',       'dosya_kapanisi', 'Tarafların yüklediği belgeler.'),
  ('case_notes',           'dosya_kapanisi', 'Görüşme notları ve analizleri.'),
  ('dosya_kapanis_sonrasi','dosya_kapanisi', 'Dosyanın kendisi (anonim kapanış kaydı hariç).')
on conflict (veri_turu) do nothing;

-- DOĞRULAMA:
--   select veri_turu, saklama_gun, baslangic from public.saklama_sureleri order by veri_turu;
-- Beklenen: 5 satır, `saklama_gun` hepsinde NULL (değer kurucu kararıyla girilecek).
