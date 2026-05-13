DROP FUNCTION IF EXISTS public.ramassoire_mark_orders_ramasse(integer[]);

DROP POLICY IF EXISTS "Ramassoires see Confirmé and Pickup" ON public.orders;
CREATE POLICY "Ramassoires see ramassage orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'ramassoire'::public.app_role)
  AND status IN ('Confirmé', 'Pickup', 'Ramassé')
);

DROP POLICY IF EXISTS "Ramassoires update Pickup to Ramasse" ON public.orders;
CREATE POLICY "Ramassoires update Pickup to Ramasse"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'ramassoire'::public.app_role)
  AND status = 'Pickup'
)
WITH CHECK (
  public.has_role(auth.uid(), 'ramassoire'::public.app_role)
  AND status IN ('Pickup', 'Ramassé')
);