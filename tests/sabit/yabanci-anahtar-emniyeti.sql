-- YABANCI ANAHTAR EMNİYETİ — cascade gerçekten bir emniyet ağı olsun
-- HAT H-30 · 30.08.2026 · P2
--
-- ÇALIŞTIRAN: Cowork ya da kurucu (CLAUDE.md §10 — Code SQL koşturmaz).
--
-- ── NEDEN ────────────────────────────────────────────────────────────────────
-- 30.08.2026'da üç silme kolunun üçü de aynı sınıftan kusur verdi ve kökü
-- şuydu: **cascade bir emniyet ağı sanılıyordu, oysa değil.** `cases` ve
-- `case_parties`e bağlı 90 yabancı anahtardan DÖRDÜ ON DELETE NO ACTION'dır ve
-- silmeyi 23503 ile düşürür:
--
--   `ajan_gorevleri.case_id`            → `cases`
--   `taraf_musaitlik.party_id`          → `case_parties`
--   `yz_beyan_onaylari.case_id`         → `cases`         ⟵ HAT H-28'de
--   `yz_beyan_onaylari.party_id`        → `case_parties`  ⟵ HAT H-28'de
--
-- İlk ikisi bu dosyanın konusu; son ikisi kalıcı onay kaydıdır ve AYRI bir
-- kararla (H-28) SET NULL yapılır — silinmemeleri gerekiyor.
--
-- ── BU SQL ZORUNLU DEĞİL; LANDMİNİ KALDIRIR ─────────────────────────────────
-- Bugün kırık bir yol YOKTUR: üç silme kolu da `_shared/dosya-silme.ts`ten
-- geçiyor ve `SILME_SIRASI` bu iki tabloyu AÇIKÇA siliyor. Ama:
--   · Dördüncü bir silme yolu yazan (ya da elle `delete from cases` koşan)
--     biri aynı tuzağa yeniden düşer — 30.08'de `basvuru-sil` tam bunu yaptı:
--     "cascade halleder" varsayımıyla yazıldı, cascade halletmedi, canlıda
--     belgeler geri alınamaz biçimde silinip dosya satırı kaldı.
--   · TARAF SİLME bugün fiilen kırık: `MediationEngine.tsx` → `remove()`
--     doğrudan `case_parties` satırını siler; müsaitlik satırı olan bir taraf
--     silinemez. (Ham hata metni 30.08'de `trErr`de kapatıldı, ama işlemin
--     kendisi hâlâ düşüyor.)
--
-- ── NİYE CASCADE DOĞRU SEÇİM ────────────────────────────────────────────────
-- İkisi de dosyanın/tarafın KENDİ verisidir, saklanacak bir kayıt değildir:
--   `ajan_gorevleri`  — ajan iş kuyruğu; dosya gidince anlamı kalmaz.
--   `taraf_musaitlik` — tarafın girdiği randevu müsaitliği; taraf gidince
--                       anlamı kalmaz ve KİŞİSEL VERİDİR, kalması KVKK'ya
--                       aykırı olurdu (constitution m.10).
-- Yani "sessizce silinmesinler" diye bir gerekçe yok; tersine, silinmemeleri
-- kusur. Açık liste yine de KALIR — silinen satır sayısı çağırana bildirilen
-- sözün kanıtıdır (bkz. `SILME_SIRASI` başlığı).

begin;

-- Kısıt adları canlıdan doğrulanmalı; farklıysa önce:
--   select conname, conrelid::regclass, confrelid::regclass
--   from pg_constraint
--   where contype = 'f'
--     and conrelid in ('public.ajan_gorevleri'::regclass,
--                      'public.taraf_musaitlik'::regclass);

alter table public.ajan_gorevleri
  drop constraint if exists ajan_gorevleri_case_id_fkey,
  add  constraint ajan_gorevleri_case_id_fkey
       foreign key (case_id) references public.cases(id) on delete cascade;

alter table public.taraf_musaitlik
  drop constraint if exists taraf_musaitlik_party_id_fkey,
  add  constraint taraf_musaitlik_party_id_fkey
       foreign key (party_id) references public.case_parties(id) on delete cascade;

commit;

-- ── DOĞRULAMA (koşumdan sonra; beklenen: 2 satır, ikisi de CASCADE) ─────────
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
--   and tc.table_name in ('ajan_gorevleri', 'taraf_musaitlik')
-- order by tc.table_name;
--
-- ── H-28 İLE BİRLİKTE KOŞULURSA: geriye NO ACTION KALMAMALI ────────────────
-- select tc.table_name, kcu.column_name, rc.delete_rule
-- from information_schema.table_constraints tc
-- join information_schema.key_column_usage kcu
--   on kcu.constraint_name = tc.constraint_name
--  and kcu.constraint_schema = tc.constraint_schema
-- join information_schema.referential_constraints rc
--   on rc.constraint_name = tc.constraint_name
--  and rc.constraint_schema = tc.constraint_schema
-- join information_schema.constraint_column_usage ccu
--   on ccu.constraint_name = tc.constraint_name
--  and ccu.constraint_schema = tc.constraint_schema
-- where tc.constraint_type = 'FOREIGN KEY'
--   and tc.table_schema = 'public'
--   and ccu.table_name in ('cases', 'case_parties')
--   and rc.delete_rule = 'NO ACTION';
-- -- beklenen: 0 satır
