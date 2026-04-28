CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'livreur-poll-status-every-minute') THEN
    PERFORM cron.unschedule('livreur-poll-status-every-minute');
  END IF;
END $$;

SELECT cron.schedule(
  'livreur-poll-status-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ayeyofzfuhvuviwzpnnm.supabase.co/functions/v1/livreur-poll-status',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5ZXlvZnpmdWh2dXZpd3pwbm5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4ODgxMjksImV4cCI6MjA5MjQ2NDEyOX0.b6imj__HAZODxfhT-1fTx9lSZawBhTrO_byPeEa3m2w","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5ZXlvZnpmdWh2dXZpd3pwbm5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4ODgxMjksImV4cCI6MjA5MjQ2NDEyOX0.b6imj__HAZODxfhT-1fTx9lSZawBhTrO_byPeEa3m2w"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);