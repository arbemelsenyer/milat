-- ONAY KAYITLARI GERÇEKTEN KALICI OLSUN — şema düzeltmesi
-- HAT H-28 · 30.08.2026 · P0
-- Kurucu kararı: HAT H-15 · CEVAP (25.08.2026) madde 2 — "Onay kayıtları →
-- KALICI. Silinmez. Ama içerik taşımaz: yalnız kim · ne zaman · hangi metnin
-- hangi sürümü · onay/ret."
--
-- ÇALIŞTIRAN: Cowork ya da kurucu (CLAUDE.md §10 — Code SQL koşturmaz).
--
-- ── SORUN ────────────────────────────────────────────────────────────────────
-- `src/pages/Verilerim.tsx` tarafa İKİ kaydı "kalıcı" diye gösteriyor:
--   · "Yapay zekâ kullanım bilgilendirmesi onayım"  → `yz_beyan_onaylari`
--   · "Oturum kaydı onayım / reddim"                → `kayit_onaylari`
-- 30.08.2026'da canlı şema ölçüldü. İkisi de sözü tutmuyor, üstelik TERS
-- YÖNDE bozuk:
--
--   | tablo               | case_id   | party_id  | talep_id | gerçekte olan          |
--   |---------------------|-----------|-----------|----------|------------------------|
--   | `kayit_onaylari`    | CASCADE   | CASCADE   | CASCADE  | dosyayla SİLİNİYOR     |
--   | `yz_beyan_onaylari` | NO ACTION | NO ACTION | —        | dosyayı SİLDİRMİYOR    |
--
--   · `kayit_onaylari`: dosya silinince üç yoldan birden gider (`talep_id`
--     zinciri de cascade: `kayit_onay_talepleri.case_id` → `cases` CASCADE).
--     Tarafa verilen "kalıcı" sözü sessizce bozuluyor.
--   · `yz_beyan_onaylari`: satırı olan bir dosya HİÇ silinemez — ne arabulucunun
--     "Verileri sil" düğmesiyle ne emniyet süpürgesiyle. `cases` silmesi 23503
--     (yabancı anahtar ihlali) ile düşer, geriye "içerik silindi ama dosya
--     satırı kaldı" kalır. KVKK silme hakkı bloke.
--
-- CANLI ÖLÇÜM (30.08.2026): `yz_beyan_onaylari` 1 satır · `kayit_onaylari`
-- 1 satır; ikisi de AÇIK dosya `5186ee1d-bc52-4dc1-b03a-1fe75844a14e`de.
-- Yani blokaj bugün görünmüyor; o dosya kapandığı gün görünür olacaktı.
--
-- ── ÇÖZÜM ────────────────────────────────────────────────────────────────────
-- Kayıt KALIR, dosya/taraf BAĞI KOPAR. Ama koptuktan sonra kaydın hâlâ bir
-- anlamı olmalı ("kim · hangi dosya"), yoksa kalıcı tutmanın amacı kalmaz.
-- Kurucu bunu da sınırlamıştı (H-15 · cevabın son paragrafı):
--     "kimlik alanı EN DAR tutulacak: ad-soyad + dosya numarası.
--      TCKN, adres, iletişim, beyan bu kayda GİRMEZ."
-- Bu yüzden bağ koparılmadan önce iki alan kaydın ÜSTÜNE yazılır:
--   `dosya_no`       — `cases.uyap_no`, yoksa `cases.application_no`
--   `katilimci_adi`  — `kayit_onaylari`da ZATEN VAR; `yz_beyan_onaylari`a eklenir
--
-- Kodun karşılığı: `supabase/functions/_shared/dosya-silme.ts` → `KALICI_BAGLAR`.
-- Tezgâh: `tests/dosya-verilerini-sil.test.ts` → "kalıcı onay kayıtları".
--
-- ⚠ SIRA ÖNEMLİ: bu SQL koşmadan kod tarafı bağı koparamaz (kolonlar NOT NULL).
--    Kod bunu SESSİZ GEÇMEZ; `uyarilar`a "şema düzeltmesi bekliyor (HAT H-28)"
--    yazar ve silme yine de denenir.

begin;

-- ── 1) yz_beyan_onaylari · kimlik anlık görüntüsü ───────────────────────────
alter table public.yz_beyan_onaylari
  add column if not exists dosya_no text,
  add column if not exists katilimci_adi text;

-- ── 2) kayit_onaylari · kimlik anlık görüntüsü (`katilimci_adi` zaten var) ──
alter table public.kayit_onaylari
  add column if not exists dosya_no text;

-- ── 3) Bağ kolonları NULL alabilsin ─────────────────────────────────────────
--     "Bağı kopmuş kalıcı kayıt" ancak böyle ifade edilebilir.
alter table public.yz_beyan_onaylari alter column case_id  drop not null;
alter table public.yz_beyan_onaylari alter column party_id drop not null;
alter table public.kayit_onaylari    alter column case_id  drop not null;
alter table public.kayit_onaylari    alter column talep_id drop not null;
-- `kayit_onaylari.party_id` zaten NULL alabiliyor.

-- ── 4) Yabancı anahtarlar → ON DELETE SET NULL ──────────────────────────────
--     Kısıt adları canlıdan okunmalı; aşağıdaki adlar postgres'in varsayılan
--     kalıbıdır (`<tablo>_<kolon>_fkey`). Farklıysa önce şunu koşun:
--       select conname, conrelid::regclass, confrelid::regclass
--       from pg_constraint
--       where contype = 'f'
--         and conrelid in ('public.yz_beyan_onaylari'::regclass,
--                          'public.kayit_onaylari'::regclass);

alter table public.yz_beyan_onaylari
  drop constraint if exists yz_beyan_onaylari_case_id_fkey,
  add  constraint yz_beyan_onaylari_case_id_fkey
       foreign key (case_id) references public.cases(id) on delete set null;

alter table public.yz_beyan_onaylari
  drop constraint if exists yz_beyan_onaylari_party_id_fkey,
  add  constraint yz_beyan_onaylari_party_id_fkey
       foreign key (party_id) references public.case_parties(id) on delete set null;

alter table public.kayit_onaylari
  drop constraint if exists kayit_onaylari_case_id_fkey,
  add  constraint kayit_onaylari_case_id_fkey
       foreign key (case_id) references public.cases(id) on delete set null;

alter table public.kayit_onaylari
  drop constraint if exists kayit_onaylari_party_id_fkey,
  add  constraint kayit_onaylari_party_id_fkey
       foreign key (party_id) references public.case_parties(id) on delete set null;

alter table public.kayit_onaylari
  drop constraint if exists kayit_onaylari_talep_id_fkey,
  add  constraint kayit_onaylari_talep_id_fkey
       foreign key (talep_id) references public.kayit_onay_talepleri(id) on delete set null;

commit;

-- ── DOĞRULAMA (koşumdan sonra çalıştırın; beklenen: 5 satır, hepsi SET NULL) ─
-- select tc.table_name, kcu.column_name, rc.delete_rule
-- from information_schema.table_constraints tc
-- join information_schema.key_column_usage kcu
--   on kcu.constraint_name = tc.constraint_name
--  and kcu.constraint_schema = tc.constraint_schema
-- join information_schema.referential_constraints rc
--   on rc.constraint_name = tc.constraint_name
--  and rc.constraint_schema = tc.constraint_schema
-- where tc.constraint_type = 'FOREIGN KEY'
--   and tc.table_schema = 'public'
--   and tc.table_name in ('yz_beyan_onaylari', 'kayit_onaylari')
-- order by tc.table_name, kcu.column_name;
--
-- Ayrıca kolonların NULL alabildiği:
-- select table_name, column_name, is_nullable
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name in ('yz_beyan_onaylari', 'kayit_onaylari')
--   and column_name in ('case_id', 'party_id', 'talep_id', 'dosya_no', 'katilimci_adi')
-- order by table_name, column_name;
