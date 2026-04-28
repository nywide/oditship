ALTER TABLE public.livreur_api_settings
ADD COLUMN IF NOT EXISTS webhook_driver_name_field TEXT NOT NULL DEFAULT 'transport.currentDriverName',
ADD COLUMN IF NOT EXISTS webhook_driver_phone_field TEXT NOT NULL DEFAULT 'transport.currentDriverPhone',
ADD COLUMN IF NOT EXISTS webhook_extra_fields_mapping JSONB NOT NULL DEFAULT '{}'::jsonb;