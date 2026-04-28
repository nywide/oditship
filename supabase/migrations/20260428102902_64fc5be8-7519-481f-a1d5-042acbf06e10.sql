DROP TRIGGER IF EXISTS orders_status_history_trigger ON public.orders;

CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.order_status_history (order_id, old_status, new_status, changed_by, notes)
    VALUES (NEW.id, NULL, NEW.status, auth.uid(), 'Commande créée');
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.order_status_history (order_id, old_status, new_status, changed_by, notes)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), NULLIF(NEW.status_note, ''));
  END IF;

  RETURN NEW;
END;
$function$;