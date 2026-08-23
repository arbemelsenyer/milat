-- ============================================================================
-- B18 · KAYITLI OTURUM İŞARETİ (kurucu kararı 24.08.2026 — seçenek (a))
--
-- SORUN: Bir oturumun "kayıtlı oturum" olduğunu söyleyen işaret yoktu.
-- `kayit_onay_talepleri` DOSYA düzeyinde (case_id), `oturum_kayitlari` ancak
-- kayıt ALINDIKTAN sonra doğuyor. Kapının ikisinden de önce çalışması gerekiyor.
--
-- ÇÖZÜM: `case_sessions.kayitli` — arabulucu oturumu planlarken işaretler.
-- 48 saat + oybirliği kapısı YALNIZ bu alan true iken çalışır.
--
-- ÇALIŞAN YOLA ETKİSİ YOK: varsayılan false. Göç anındaki mevcut oturumların
-- (24.08 itibarıyla 31 satır, 4'ünde video bağlantısı var) hepsi false alır;
-- hiçbirinde kapı çalışmaz, hiçbirinin video odası kapanmaz. Kapı yalnız bu
-- göçten SONRA bilerek "kayıtlı" işaretlenen oturumlarda devreye girer.
--
-- Lovable SQL çalıştırıcısı için: DO bloğu yok, $$ yok. İdempotenttir.
-- ============================================================================

ALTER TABLE public.case_sessions
  ADD COLUMN IF NOT EXISTS kayitli boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.case_sessions.kayitli IS
  'Bu oturum kayda alinacak mi (B18). Varsayilan false. true ise create-video-room, kayit izni kapisini (onay formundan 48 saat gecmis olmasi + butun katilimcilarin onayi) uygular; false ise kapi hic calismaz.';

-- Doğrulama (çalıştırdıktan sonra): aşağıdaki sorgu 0 dönmelidir.
--   SELECT count(*) FROM public.case_sessions WHERE kayitli IS DISTINCT FROM false;
