CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.order_status_history (order_id, old_status, new_status, changed_by, notes)
    VALUES (NEW.id, NULL, NEW.status, auth.uid(), 'Commande créée');
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.order_status_history (order_id, old_status, new_status, changed_by, notes)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), NULL);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_order_status_insert ON public.orders;
CREATE TRIGGER trg_log_order_status_insert
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.log_order_status_change();

DROP TRIGGER IF EXISTS trg_log_order_status_update ON public.orders;
CREATE TRIGGER trg_log_order_status_update
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.log_order_status_change();

DROP POLICY IF EXISTS "System can insert order history" ON public.order_status_history;
CREATE POLICY "System can insert order history"
ON public.order_status_history
FOR INSERT
TO authenticated
WITH CHECK (order_id IN (SELECT id FROM public.orders));

CREATE INDEX IF NOT EXISTS idx_order_status_history_order_changed
ON public.order_status_history (order_id, changed_at DESC);