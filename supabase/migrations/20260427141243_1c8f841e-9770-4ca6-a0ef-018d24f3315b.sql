ALTER TABLE public.livreur_api_settings
ADD COLUMN IF NOT EXISTS auth_config jsonb NOT NULL DEFAULT '{"type":"none","url":"","method":"POST","headers":{},"payload_mapping":{},"response_token_path":"token","token_header":"Authorization","token_prefix":"Bearer ","expires_in_path":"expiresIn"}'::jsonb,
ADD COLUMN IF NOT EXISTS api_operations jsonb NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS polling_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS polling_interval_minutes integer NOT NULL DEFAULT 15,
ADD COLUMN IF NOT EXISTS polling_status_url text,
ADD COLUMN IF NOT EXISTS polling_status_method text NOT NULL DEFAULT 'GET',
ADD COLUMN IF NOT EXISTS polling_status_headers jsonb NOT NULL DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS polling_status_payload_mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS polling_tracking_field text NOT NULL DEFAULT 'trackingID',
ADD COLUMN IF NOT EXISTS polling_status_field text NOT NULL DEFAULT 'status',
ADD COLUMN IF NOT EXISTS polling_message_field text NOT NULL DEFAULT 'message';

CREATE INDEX IF NOT EXISTS idx_livreur_api_settings_polling_enabled
ON public.livreur_api_settings (polling_enabled)
WHERE polling_enabled = true;

CREATE OR REPLACE FUNCTION public.validate_livreur_api_settings()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.polling_interval_minutes < 1 THEN
    RAISE EXCEPTION 'polling_interval_minutes must be at least 1';
  END IF;

  IF NEW.create_package_method NOT IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE') THEN
    RAISE EXCEPTION 'create_package_method is invalid';
  END IF;

  IF NEW.polling_status_method NOT IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE') THEN
    RAISE EXCEPTION 'polling_status_method is invalid';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_livreur_api_settings_trigger ON public.livreur_api_settings;
CREATE TRIGGER validate_livreur_api_settings_trigger
BEFORE INSERT OR UPDATE ON public.livreur_api_settings
FOR EACH ROW
EXECUTE FUNCTION public.validate_livreur_api_settings();