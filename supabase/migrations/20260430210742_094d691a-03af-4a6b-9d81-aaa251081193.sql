-- 1. Add driver columns to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS driver_name text,
  ADD COLUMN IF NOT EXISTS driver_phone text;

-- 2. Update trigger to skip when called by service role (auth.uid() IS NULL)
-- Edge functions write history themselves with explicit changed_by.
CREATE OR REPLACE FUNCTION public.log_order_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _actor uuid := auth.uid();
BEGIN
  -- Skip auto-logging when there is no authenticated user (service role / edge functions).
  -- Edge functions are responsible for writing their own history rows with changed_by set.
  IF _actor IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.order_status_history h
      WHERE h.order_id = NEW.id
        AND h.old_status IS NOT DISTINCT FROM NULL
        AND h.new_status IS NOT DISTINCT FROM NEW.status
        AND h.changed_by IS NOT DISTINCT FROM _actor
    ) THEN
      INSERT INTO public.order_status_history (order_id, old_status, new_status, changed_by, notes)
      VALUES (NEW.id, NULL, NEW.status, _actor, 'Commande créée');
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.order_status_history h
      WHERE h.order_id = NEW.id
        AND h.new_status IS NOT DISTINCT FROM NEW.status
        AND h.changed_at >= now() - interval '30 seconds'
    ) THEN
      INSERT INTO public.order_status_history (order_id, old_status, new_status, changed_by, notes)
      VALUES (NEW.id, OLD.status, NEW.status, _actor, NULLIF(NEW.status_note, ''));
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 3. Clean the stale row that left order 42 with status="" earlier
DELETE FROM public.order_status_history WHERE id = 231;
