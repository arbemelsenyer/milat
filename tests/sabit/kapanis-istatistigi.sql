-- ANONİM KAPANIŞ KAYDI — dosya silindikten SONRA da yaşayan tek satır.
--
-- ÇALIŞTIRAN: Cowork / kurucu (CLAUDE.md §10 — SQL metnini Code yazar,
-- çalıştırmayı Cowork yapar). HİÇBİR ŞEY SİLMEZ; yalnız tablo kurar.
--
-- NEDEN (29.08.2026 kusuru). `dosya-verilerini-sil` anonim kapanış kaydını
-- `dosya_kapanis` tablosuna yazıyordu. Ama `dosya_kapanis.case_id`,
-- `cases(id)` üzerine **ON DELETE CASCADE** bağlıdır ve yazım `cases`
-- silindikten SONRA yapılıyordu: satır çoktan gitmiş oluyor, güncelleme
-- 0 satır etkiliyor ve `supabase-js` bunu HATA SAYMIYOR. Yani silme
-- kaydı ne yazılıyor ne de yazılmadığı söyleniyor. Kolun kendi yorumu
-- "bir KVKK silme işleminin kanıtı sessizce kaybolamaz" diyordu; tam bu
-- oluyordu. `case_outcome_analytics` de kurtarmıyor: o bir GÖRÜNÜM,
-- `cases` silinince o da yok oluyor.
--
-- Kurucu kararı (20.08): kişisel veri İÇERMEYEN sayımlar KALIR. Bu tablo
-- o kararın tek dayanağıdır ve `cases`e YABANCI ANAHTARLA BAĞLANMAZ —
-- bağlanırsa aynı kusur geri gelir.

create table if not exists public.kapanis_istatistigi (
  id            uuid primary key default gen_random_uuid(),
  -- Dosya kimliği YAZILMAZ: satır anonimdir. Aynı dosyanın iki kez
  -- silinmesini engellemek için değil, yalnız SAYMAK için tutulur.
  silindi_at    timestamptz not null default now(),
  -- "arabulucu" (C3, elle) · "sure_doldu" (emniyet süpürgesi)
  sebep         text        not null,
  -- Dosyanın sonuç türü ve süreç uzunluğu — kişi, taraf, tutar YOK.
  sonuc         text,
  surec_gun     integer,
  -- Silinen satır ve belge sayısı: sözün kanıtı ("N kayıt silindi").
  silinen_kayit integer,
  silinen_belge integer,
  constraint kapanis_istatistigi_sebep_gecerli
    check (sebep in ('arabulucu', 'sure_doldu'))
);

comment on table public.kapanis_istatistigi is
  'Dosya silindikten sonra kalan ANONİM kapanış kaydı. cases''e yabancı anahtarla BAĞLANMAZ (bağlanırsa cascade ile silinir ve kanıt kaybolur). Kişisel veri içermez.';

alter table public.kapanis_istatistigi enable row level security;

-- Yalnız yönetici okur. Yazma servis anahtarıyla (edge function) yapılır;
-- servis anahtarı RLS'i aştığı için ayrı bir insert politikası GEREKMEZ —
-- ve konmaz, yoksa istemci sahte kayıt yazabilir.
drop policy if exists "Kapanis istatistigini yalniz admin gorur" on public.kapanis_istatistigi;
create policy "Kapanis istatistigini yalniz admin gorur"
  on public.kapanis_istatistigi for select
  using (public.has_role(auth.uid(), 'admin'::app_role));

-- DOĞRULAMA (çalıştırdıktan sonra koşun; üçü de beklenen değeri vermeli):
--   select count(*) from public.kapanis_istatistigi;                      -- 0
--   select relrowsecurity from pg_class
--     where oid = 'public.kapanis_istatistigi'::regclass;                 -- true
--   select count(*) from information_schema.table_constraints
--     where table_name = 'kapanis_istatistigi'
--       and constraint_type = 'FOREIGN KEY';                              -- 0
