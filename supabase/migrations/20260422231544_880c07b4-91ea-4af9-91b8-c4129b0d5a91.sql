CREATE OR REPLACE FUNCTION public.get_user_email_by_username(_username TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT u.email::text
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.username = lower(_username)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_email_by_username(TEXT) TO anon, authenticated;