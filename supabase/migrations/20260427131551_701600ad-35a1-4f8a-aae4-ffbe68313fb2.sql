CREATE TABLE IF NOT EXISTS public.livreur_api_settings (
  livreur_id uuid PRIMARY KEY,
  create_package_url text,
  create_package_method text NOT NULL DEFAULT 'POST',
  create_package_headers jsonb NOT NULL DEFAULT '{}'::jsonb,
  create_package_mapping jsonb NOT NULL DEFAULT '{"price":"order_value","description":"product_name","name":"product_name","comment":"comment","orderId":"id","partnerTrackingID":"partner_tracking_id","destination.name":"customer_name","destination.phone":"customer_phone","destination.city":"customer_city","destination.streetAddress":"customer_address"}'::jsonb,
  validation_rules jsonb NOT NULL DEFAULT '{"product_name":{"min_alnum":3},"customer_name":{"min_length":2},"customer_address":{"min_length":2},"customer_phone":{"digits":10},"order_value":{"min":1}}'::jsonb,
  status_mapping jsonb NOT NULL DEFAULT '{"DELIVERED":"Livré","CANCELED":"Annulé","REFUSED":"Refusé","RETURNED":"Retourné","IN_TRANSIT":"En transit","PICKUP":"Pickup","CONFIRMED":"Confirmé"}'::jsonb,
  webhook_updates_current_status boolean NOT NULL DEFAULT true,
  webhook_status_field text NOT NULL DEFAULT 'status',
  webhook_tracking_field text NOT NULL DEFAULT 'trackingID',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.livreur_api_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Administrators manage livreur api settings" ON public.livreur_api_settings;
CREATE POLICY "Administrators manage livreur api settings"
ON public.livreur_api_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'administrateur'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'administrateur'::public.app_role));

DROP POLICY IF EXISTS "Livreurs view own api settings" ON public.livreur_api_settings;
CREATE POLICY "Livreurs view own api settings"
ON public.livreur_api_settings
FOR SELECT
TO authenticated
USING (livreur_id = auth.uid());

DROP TRIGGER IF EXISTS update_livreur_api_settings_updated_at ON public.livreur_api_settings;
CREATE TRIGGER update_livreur_api_settings_updated_at
BEFORE UPDATE ON public.livreur_api_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE UNIQUE INDEX IF NOT EXISTS hub_cities_city_name_unique ON public.hub_cities (lower(city_name));