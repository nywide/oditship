ALTER TABLE public.livreur_api_settings
ADD COLUMN IF NOT EXISTS webhook_note_field text NOT NULL DEFAULT 'note',
ADD COLUMN IF NOT EXISTS webhook_reported_date_field text NOT NULL DEFAULT 'reportedDate',
ADD COLUMN IF NOT EXISTS webhook_scheduled_date_field text NOT NULL DEFAULT 'scheduledDate',
ADD COLUMN IF NOT EXISTS polling_reported_date_field text NOT NULL DEFAULT 'reportedDate',
ADD COLUMN IF NOT EXISTS polling_scheduled_date_field text NOT NULL DEFAULT 'scheduledDate';

CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users view app settings" ON public.app_settings;
CREATE POLICY "Authenticated users view app settings"
ON public.app_settings
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Administrators manage app settings" ON public.app_settings;
CREATE POLICY "Administrators manage app settings"
ON public.app_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'administrateur'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'administrateur'::public.app_role));

DROP TRIGGER IF EXISTS update_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER update_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.app_settings (key, value)
VALUES (
  'sticker_template',
  jsonb_build_object(
    'brand_title', 'POSTESHIP',
    'brand_subtitle', 'logistique & e-com service',
    'sender_label', 'Expéditeur',
    'sender_name', 'ODiT',
    'phone_label', 'Tél',
    'date_label', 'Date',
    'recipient_label', 'Destinataire',
    'city_label', 'Ville',
    'address_label', 'Adresse',
    'hub_label', 'HUB',
    'qr_label', 'QR',
    'tracking_label', '#NUMERO DE SUIVI',
    'product_label', 'Produit',
    'open_package_allowed', 'AUTORISER D''OUVRIR',
    'open_package_denied', 'NE PAS OUVRIR',
    'comment_label', 'Commentaire',
    'currency', 'DH',
    'show_border', true,
    'show_qr', true,
    'show_barcode', true
  )
)
ON CONFLICT (key) DO NOTHING;