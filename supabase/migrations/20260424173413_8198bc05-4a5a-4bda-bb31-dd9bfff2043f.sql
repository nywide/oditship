CREATE TABLE IF NOT EXISTS public.plain_passwords (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  password TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.plain_passwords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Administrators manage plain passwords"
ON public.plain_passwords
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'administrateur'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'administrateur'::public.app_role));