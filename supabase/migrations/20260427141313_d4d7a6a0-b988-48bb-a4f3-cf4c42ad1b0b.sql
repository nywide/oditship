ALTER TABLE public.livreur_api_settings
ADD COLUMN IF NOT EXISTS polling_last_run_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_livreur_api_settings_polling_due
ON public.livreur_api_settings (polling_enabled, polling_last_run_at);