
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any prior schedule with this name
DO $$
BEGIN
  PERFORM cron.unschedule('deadline-reminder-daily');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'deadline-reminder-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://oijdnfibboiinogdmlcj.supabase.co/functions/v1/deadline-reminder-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', current_setting('app.cron_secret', true)
    ),
    body := '{}'::jsonb
  );
  $$
);
