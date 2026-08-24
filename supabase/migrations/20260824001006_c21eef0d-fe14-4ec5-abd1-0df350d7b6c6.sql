DO $do$
DECLARE v_sir text; v_k text;
BEGIN
  SELECT (regexp_match(command, '''x-cron-secret''\s*,\s*''([^'']+)'''))[1]
    INTO v_sir FROM cron.job WHERE jobid = 7;
  IF v_sir IS NULL OR length(v_sir) < 8 THEN
    RAISE EXCEPTION 'cron sirri jobid 7 komutundan okunamadi - hicbir sey degistirilmedi';
  END IF;

  -- jobid 1: send-session-reminders-hourly (Authorization korunur, x-cron-secret EKLENIR)
  SELECT command INTO v_k FROM cron.job WHERE jobid = 1;
  IF position('x-cron-secret' in v_k) = 0 THEN
    v_k := replace(v_k, '''::jsonb,',
      '''::jsonb || jsonb_build_object(''x-cron-secret'', ' || quote_literal(v_sir) || '),');
    v_k := replace(v_k, ') as request_id;', ', timeout_milliseconds := 30000) as request_id;');
    IF position('x-cron-secret' in v_k) = 0 OR position('timeout_milliseconds' in v_k) = 0 THEN
      RAISE EXCEPTION 'jobid 1 komutunda beklenen kalip bulunamadi - dokunulmadi';
    END IF;
    PERFORM cron.schedule('send-session-reminders-hourly', '0 * * * *', v_k);
  END IF;

  -- jobid 2: dual-ai-validate-nightly (apikey korunur, x-cron-secret EKLENIR)
  SELECT command INTO v_k FROM cron.job WHERE jobid = 2;
  IF position('x-cron-secret' in v_k) = 0 THEN
    v_k := replace(v_k, '''::jsonb,',
      '''::jsonb || jsonb_build_object(''x-cron-secret'', ' || quote_literal(v_sir) || '),');
    v_k := replace(v_k, 'now())', 'now()), timeout_milliseconds := 30000');
    IF position('x-cron-secret' in v_k) = 0 OR position('timeout_milliseconds' in v_k) = 0 THEN
      RAISE EXCEPTION 'jobid 2 komutunda beklenen kalip bulunamadi - dokunulmadi';
    END IF;
    PERFORM cron.schedule('dual-ai-validate-nightly', '0 2 * * *', v_k);
  END IF;

  -- jobid 7: ajan-nobetci-5dk (yalniz zaman asimi eklenir)
  SELECT command INTO v_k FROM cron.job WHERE jobid = 7;
  IF position('timeout_milliseconds' in v_k) = 0 THEN
    v_k := replace(v_k, 'body := ''{}''::jsonb', 'body := ''{}''::jsonb, timeout_milliseconds := 30000');
    IF position('timeout_milliseconds' in v_k) = 0 THEN
      RAISE EXCEPTION 'jobid 7 komutunda beklenen kalip bulunamadi - dokunulmadi';
    END IF;
    PERFORM cron.schedule('ajan-nobetci-5dk', '*/3 * * * *', v_k);
  END IF;
END $do$;

-- Geriye donuk tek satir: kapanmis ama outcome'u bos kalmis dosya.
-- set_case_closed_at tetikleyicisi outcome degisimini gorunce closed_at'i kendisi doldurur.
UPDATE public.cases SET outcome = 'anlasma'
WHERE status = 'agreed' AND outcome IS NULL;