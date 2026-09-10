-- AŞAMA 1 — YENİ BAŞVURU EKRANI · İKİ YENİ ALAN (kurucu kararı 10.09.2026)
-- Kaynak: tasks/PILOT-ASAMA-1-DOSYA-KURULUMU.md §1.3 ve §1.8
-- Çalıştıran: COWORK (CLAUDE.md §10 — Code SQL metnini yazar, çalıştırmaz).
--
-- SADECE EKLER; hiçbir şey değiştirmez, silmez, taşımaz. Alanların hepsi
-- NULL/boş kabul eder → mevcut satırlar olduğu gibi kalır, mevcut hiçbir sorgu
-- etkilenmez. Koşmadan önce ekran çalışır; yalnız bu iki alanın KAYDI düşmez
-- (ekran bunu amber bir satırla açıkça söyler, sessizce yutmaz).
--
-- 1) cases.arabuluculuga_uygunluk — §1.3 "Arabuluculuğa uygun mu?" adımındaki
--    ARABULUCUNUN ELLE SEÇİMİ. AI'nın önerisi değil, insanın kararı burada
--    durur. Değerler: 'uygun' | 'uygun_degil'. AI "uygun değil" dese bile süreç
--    ENGELLENMEZ (kurucu kararı); bu alan yalnız kaydeder.
--    Yanındaki iki alan AI önerisinin gerekçesi ve kaynağıdır — §2-A gereği
--    kaynaksız hukuki cümle ekranda durmaz, dolayısıyla kaynağı da saklanır.
--
-- 2) case_parties.gonderim_kanallari — §1.8: "her iletişim kanalının yanında
--    seçim kutusu; işaretlenen kanal o tarafa gönderimde kullanılır."
--    Değerler: 'eposta' ve/veya 'telefon'. Boş dizi = arabulucu henüz seçmedi;
--    o hâlde bugünkü davranış (e-posta) aynen korunur.
--
-- BAŞARI KONTROLÜ (koşumdan sonra):
--   select column_name from information_schema.columns
--    where table_schema='public' and table_name='cases'
--      and column_name in ('arabuluculuga_uygunluk','uygunluk_gerekcesi','uygunluk_kaynaklari');
--   -- beklenen: 3 satır
--   select column_name from information_schema.columns
--    where table_schema='public' and table_name='case_parties'
--      and column_name='gonderim_kanallari';
--   -- beklenen: 1 satır

alter table public.cases
  add column if not exists arabuluculuga_uygunluk text,
  add column if not exists uygunluk_gerekcesi     text,
  add column if not exists uygunluk_kaynaklari    jsonb;

-- Kapalı liste: yazım hatası ya da uydurma değer satıra giremez.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'cases_arabuluculuga_uygunluk_chk'
  ) then
    alter table public.cases
      add constraint cases_arabuluculuga_uygunluk_chk
      check (arabuluculuga_uygunluk is null
             or arabuluculuga_uygunluk in ('uygun', 'uygun_degil'));
  end if;
end $$;

alter table public.case_parties
  add column if not exists gonderim_kanallari text[] not null default '{}'::text[];

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'case_parties_gonderim_kanallari_chk'
  ) then
    alter table public.case_parties
      add constraint case_parties_gonderim_kanallari_chk
      check (gonderim_kanallari <@ array['eposta', 'telefon']::text[]);
  end if;
end $$;

comment on column public.cases.arabuluculuga_uygunluk is
  'Arabulucunun elle verdigi uygunluk karari (uygun | uygun_degil). AI onerisi degil, insan karari. Sureci engellemez.';
comment on column public.cases.uygunluk_gerekcesi is
  'Uygunluk adiminda ekranda duran AI gerekcesi (kaynaklidir; kaynaksiz cumle yazilmaz).';
comment on column public.cases.uygunluk_kaynaklari is
  'Gerekcenin kaynak kunyeleri: [{tur, ad, yer, baglanti}]. Sira: modul -> mevzuat -> ictihat.';
comment on column public.case_parties.gonderim_kanallari is
  'Bu tarafa gonderimde kullanilacak kanallar: eposta ve/veya telefon. Bossa bugunku davranis (e-posta) korunur.';

-- RLS NOTU: iki tabloda da politika DEĞİŞMEZ. Yeni kolonlar mevcut satır
-- politikalarına tabidir; taraf yüzeyine yeni bir okuma kapısı açılmaz.
