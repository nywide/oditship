
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS payment_proof_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Admins manage payment proofs" ON storage.objects;
CREATE POLICY "Admins manage payment proofs"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'payment-proofs' AND public.has_role(auth.uid(), 'administrateur'::public.app_role))
WITH CHECK (bucket_id = 'payment-proofs' AND public.has_role(auth.uid(), 'administrateur'::public.app_role));

DROP POLICY IF EXISTS "Comptables manage payment proofs" ON storage.objects;
CREATE POLICY "Comptables manage payment proofs"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'payment-proofs' AND public.has_role(auth.uid(), 'comptable'::public.app_role))
WITH CHECK (bucket_id = 'payment-proofs' AND public.has_role(auth.uid(), 'comptable'::public.app_role));

DROP POLICY IF EXISTS "Vendeurs view own payment proofs" ON storage.objects;
CREATE POLICY "Vendeurs view own payment proofs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'payment-proofs');
