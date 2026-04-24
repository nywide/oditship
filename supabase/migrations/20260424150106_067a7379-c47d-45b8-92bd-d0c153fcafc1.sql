
-- Profile fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bank_account_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
  ADD COLUMN IF NOT EXISTS agent_pages JSONB;

-- Vendeurs must see orders created by their own agents
DROP POLICY IF EXISTS "Vendeurs see their agents' orders" ON public.orders;
CREATE POLICY "Vendeurs see their agents' orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    agent_id IN (
      SELECT id FROM public.profiles WHERE agent_of = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Vendeurs update their agents' orders" ON public.orders;
CREATE POLICY "Vendeurs update their agents' orders"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (
    agent_id IN (
      SELECT id FROM public.profiles WHERE agent_of = auth.uid()
    )
  );
