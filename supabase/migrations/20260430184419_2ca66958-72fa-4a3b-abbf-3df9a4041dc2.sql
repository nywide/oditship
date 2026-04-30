ALTER TABLE public.livreur_api_settings
ADD COLUMN IF NOT EXISTS polling_status_mapping jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Seed polling mapping from existing status_mapping for rows where it is empty
UPDATE public.livreur_api_settings
SET polling_status_mapping = status_mapping
WHERE polling_status_mapping = '{}'::jsonb;