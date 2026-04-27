ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS authentication_config JSONB,
ADD COLUMN IF NOT EXISTS create_package_config JSONB;

COMMENT ON COLUMN public.profiles.authentication_config IS 'Optional generic authentication configuration for delivery provider APIs.';
COMMENT ON COLUMN public.profiles.create_package_config IS 'Generic create-package API configuration array/object for delivery provider integrations.';