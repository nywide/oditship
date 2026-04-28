REVOKE ALL ON FUNCTION public.log_order_status_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_order_status_change() FROM anon;
REVOKE ALL ON FUNCTION public.log_order_status_change() FROM authenticated;