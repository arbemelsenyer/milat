-- ============================================================================
-- GÜVENLİK: check-new-tariff artık verify_jwt = true ile yayına alınıyor.
-- Gateway bundan sonra JWT'siz isteği içeri ALMAZ; bu yüzden cron çağrılarının
-- Authorization başlığı taşıması gerekir. Fonksiyonun KENDİ kapısı değişmedi
-- (x-cron-secret VEYA admin JWT); iki kapı birlikte çalışır.
--
-- BU SQL DEPLOY'DAN ÖNCE ÇALIŞTIRILMALIDIR. Aksi hâlde Aralık/Ocak koşumu 401 alır.
--
-- <SERVICE_KEY> ve <CRON_SECRET> yerine gerçek değerleri yazın:
--   SERVICE_KEY  → Lovable Cloud > proje ayarları > API > service_role anahtarı
--   CRON_SECRET  → edge fonksiyonların CRON_SECRET gizli değişkeni
-- Lovable SQL çalıştırıcısı için: DO bloğu ve $$ kullanılmadı; parça parça çalıştırılır.
--
-- ÖNCE MEVCUT KOMUTU GÖRÜN (kayıt için):
--   SELECT jobid, jobname, schedule, command FROM cron.job WHERE jobname LIKE 'check-new-tariff%';
-- ============================================================================

-- ---- PARÇA 1: Aralık işi — eskisini kaldır ----
SELECT cron.unschedule('check-new-tariff-december')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'check-new-tariff-december');

-- ---- PARÇA 2: Aralık işi — Authorization başlığıyla yeniden kur ----
SELECT cron.schedule(
  'check-new-tariff-december',
  '0 9 1 12 *',
  'SELECT net.http_post(
     url := ''https://oijdnfibboiinogdmlcj.supabase.co/functions/v1/check-new-tariff'',
     headers := jsonb_build_object(
       ''Content-Type'', ''application/json'',
       ''x-cron-secret'', ''<CRON_SECRET>'',
       ''apikey'', ''<SERVICE_KEY>'',
       ''Authorization'', ''Bearer <SERVICE_KEY>''
     ),
     body := ''{}''::jsonb
   );'
);

-- ---- PARÇA 3: Ocak işi — eskisini kaldır ----
SELECT cron.unschedule('check-new-tariff-january')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'check-new-tariff-january');

-- ---- PARÇA 4: Ocak işi — Authorization başlığıyla yeniden kur ----
SELECT cron.schedule(
  'check-new-tariff-january',
  '0 9 5 1 *',
  'SELECT net.http_post(
     url := ''https://oijdnfibboiinogdmlcj.supabase.co/functions/v1/check-new-tariff'',
     headers := jsonb_build_object(
       ''Content-Type'', ''application/json'',
       ''x-cron-secret'', ''<CRON_SECRET>'',
       ''apikey'', ''<SERVICE_KEY>'',
       ''Authorization'', ''Bearer <SERVICE_KEY>''
     ),
     body := ''{}''::jsonb
   );'
);

-- ---- PARÇA 5: doğrulama ----
SELECT jobid, jobname, schedule FROM cron.job WHERE jobname LIKE 'check-new-tariff%';
