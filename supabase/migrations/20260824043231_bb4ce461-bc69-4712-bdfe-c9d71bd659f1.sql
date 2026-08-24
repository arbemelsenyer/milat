DO $do$
DECLARE v_sir text; v_k text; v_id uuid; v_alt text; r record;
BEGIN
  SELECT (regexp_match(command, '''x-cron-secret''\s*,\s*''([^'']+)'''))[1]
    INTO v_sir FROM cron.job WHERE jobid = 7;
  IF v_sir IS NULL OR length(v_sir) < 8 THEN
    RAISE EXCEPTION 'cron sirri okunamadi - hicbir sey degistirilmedi';
  END IF;

  SELECT id INTO v_id FROM vault.secrets WHERE name = 'cron_secret';
  IF v_id IS NULL THEN
    PERFORM vault.create_secret(v_sir, 'cron_secret', 'Edge function cron kapisi (x-cron-secret)');
  ELSE
    PERFORM vault.update_secret(v_id, v_sir, 'cron_secret', 'Edge function cron kapisi (x-cron-secret)');
  END IF;

  -- DOGRULAMA: Vault'tan okunan deger birebir ayni mi?
  IF (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
     IS DISTINCT FROM v_sir THEN
    RAISE EXCEPTION 'Vault dogrulamasi basarisiz - cron komutlarina DOKUNULMADI';
  END IF;

  v_alt := '(select decrypted_secret from vault.decrypted_secrets where name = ''cron_secret'')';

  FOR r IN SELECT jobid, jobname, schedule, command FROM cron.job
           WHERE command LIKE '%' || v_sir || '%' LOOP
    v_k := replace(r.command, quote_literal(v_sir), v_alt);
    IF position(v_sir in v_k) > 0 THEN
      RAISE EXCEPTION 'jobid %: duz metin sir komutta kaldi - dokunulmadi', r.jobid;
    END IF;
    PERFORM cron.schedule(r.jobname, r.schedule, v_k);
  END LOOP;
END $do$;