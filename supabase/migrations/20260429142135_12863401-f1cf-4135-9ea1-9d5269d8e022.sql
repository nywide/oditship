CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _actor uuid := auth.uid();
BEGIN
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
        AND h.old_status IS NOT DISTINCT FROM OLD.status
        AND h.new_status IS NOT DISTINCT FROM NEW.status
        AND h.changed_by IS NOT DISTINCT FROM _actor
        AND h.changed_at >= now() - interval '10 seconds'
    ) THEN
      INSERT INTO public.order_status_history (order_id, old_status, new_status, changed_by, notes)
      VALUES (NEW.id, OLD.status, NEW.status, _actor, NULLIF(NEW.status_note, ''));
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY order_id, old_status, new_status, changed_by, changed_at
           ORDER BY id
         ) AS rn
  FROM public.order_status_history
)
DELETE FROM public.order_status_history h
USING ranked r
WHERE h.id = r.id
  AND r.rn > 1;