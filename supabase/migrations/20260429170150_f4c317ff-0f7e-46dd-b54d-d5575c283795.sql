CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

INSERT INTO public.app_settings (key, value)
VALUES ('api_logs_retention', '{"enabled": false, "days": 30}'::jsonb)
ON CONFLICT (key) DO NOTHING;

SELECT cron.unschedule(jobname)
FROM cron.job
WHERE jobname IN ('odit-poll-livreur-status-every-minute', 'odit-clean-livreur-api-logs-daily');

SELECT cron.schedule(
  'odit-poll-livreur-status-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ayeyofzfuhvuviwzpnnm.supabase.co/functions/v1/livreur-poll-status',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdWIiOiJhbm9uIiwicmVmIjoiYXlleW9memZ1aHZ1dml3enBubm0iLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc3Njg4ODEyOSwiZXhwIjoyMDkyNDY0MTI5fQ.b6imj__HAZODxfhT-1fTx9lSZawBhTrO_byPeEa3m2w"}'::jsonb,
    body := jsonb_build_object('scheduled', true, 'time', now())
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'odit-clean-livreur-api-logs-daily',
  '15 3 * * *',
  $$
  DELETE FROM public.livreur_api_logs
  WHERE created_at < now() - make_interval(days => GREATEST(COALESCE((SELECT (value->>'days')::int FROM public.app_settings WHERE key = 'api_logs_retention' AND COALESCE((value->>'enabled')::boolean, false)), 30), 1));
  $$
);