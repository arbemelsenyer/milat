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

-- ⚠ 29.08.2026 — BU LİSTE CANLIYLA HİZALANDI.
--   Betik 5 tür kuruyordu; canlıda 8 tür var. Üçü (`odeme_kayitlari` ·
--   `onay_kayitlari` · `anonim_kapanis_istatistigi`) sonradan Cowork
--   tarafından eklendi ve betiğe hiç yazılmadı. Temiz bir kurulumda üçü
--   eksik kalırdı; `Verilerim.tsx` o türleri sorduğunda tarafa "bu kayıt
--   tipi için saklama süresi henüz tanımlanmadı" derdi — yani gizlilik
--   ekranı sessizce eksik konuşurdu. `tests/verilerim-saklama.test.ts`
--   artık ekranın sorduğu her türün BU LİSTEDE olmasını denetler.
--
--   `kalici` kolonu da Cowork tarafından eklendi (H-15/1): NULL süre iki
--   ayrı şey demekti — "karar bekliyor" ve "kurucu kararıyla süresiz".
--   Ayrım yapılmadan `Verilerim.tsx` kalıcı kayda "işlenir işlenmez silinir"
--   diyordu, yani tarafa gerçeğin TERSİNİ söylüyordu.
alter table public.saklama_sureleri
  add column if not exists kalici boolean not null default false;

comment on column public.saklama_sureleri.kalici is
  'true = kurucu kararıyla süresiz saklanır. NULL saklama_gun ile birlikte okunur: kalici=false + NULL => karar bekliyor, dokunma; kalici=true => bilerek kalıcı.';

-- Satırlar DEĞER OLMADAN kurulur: `saklama_gun` NULL → imha kolu dokunmaz.
insert into public.saklama_sureleri (veri_turu, baslangic, aciklama) values
  ('oturum_kaydi_ses',     'olusturma',      'Sesli notun ham ses dosyası. Bugün kodda: metne çevrilir çevrilmez silinir (H-14 şart 1).'),
  ('oturum_kaydi_dokum',   'dosya_kapanisi', 'Sesli nottan çıkan metin.'),
  ('case_documents',       'dosya_kapanisi', 'Tarafların yüklediği belgeler.'),
  ('case_notes',           'dosya_kapanisi', 'Görüşme notları ve analizleri.'),
  ('dosya_kapanis_sonrasi','dosya_kapanisi', 'Dosyanın kendisi (anonim kapanış kaydı hariç).'),
  ('odeme_kayitlari',      'dosya_kapanisi', 'Ücret hesabı/dökümü. Makbuz Medipact''te kesilmez (H-15 · 1. madde), dosyayla birlikte silinir.'),
  ('onay_kayitlari',       'olusturma',      'KALICI (H-15 · 2. madde). İçerik taşımaz: kim, ne zaman, hangi metnin hangi sürümü, onay/ret.'),
  ('anonim_kapanis_istatistigi','olusturma', 'KALICI (H-15 · 3. madde). Kişisel veri içermez; `kapanis_istatistigi` tablosunda durur.')
on conflict (veri_turu) do nothing;

-- Kalıcı olan ikisi işaretlenir (insert'te yeni satır yoksa da doğru kalsın).
update public.saklama_sureleri set kalici = true
where veri_turu in ('onay_kayitlari', 'anonim_kapanis_istatistigi');

-- DOĞRULAMA:
--   select veri_turu, saklama_gun, baslangic, kalici from public.saklama_sureleri order by veri_turu;
-- Beklenen: 8 satır. Yeni kurulumda `saklama_gun` hepsinde NULL (değer kurucu
-- kararıyla girilir); `kalici` yalnız iki satırda true.
