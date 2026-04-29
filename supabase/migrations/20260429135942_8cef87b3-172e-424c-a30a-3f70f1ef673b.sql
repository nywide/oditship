ALTER TABLE public.order_status_history
ADD COLUMN IF NOT EXISTS provider_note text,
ADD COLUMN IF NOT EXISTS reported_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS scheduled_date timestamp with time zone;