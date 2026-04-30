alter publication supabase_realtime add table public.orders;
alter table public.orders replica identity full;