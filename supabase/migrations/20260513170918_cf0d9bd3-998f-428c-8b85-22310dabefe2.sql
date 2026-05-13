CREATE OR REPLACE FUNCTION public.ramassoire_mark_orders_ramasse(_order_ids integer[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _updated_count integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT (public.has_role(auth.uid(), 'ramassoire'::public.app_role) OR public.has_role(auth.uid(), 'administrateur'::public.app_role)) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  UPDATE public.orders
  SET status = 'Ramassé', updated_at = now()
  WHERE id = ANY(_order_ids)
    AND status = 'Pickup';

  GET DIAGNOSTICS _updated_count = ROW_COUNT;
  RETURN _updated_count;
END;
$$;

REVOKE ALL ON FUNCTION public.ramassoire_mark_orders_ramasse(integer[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ramassoire_mark_orders_ramasse(integer[]) TO authenticated;