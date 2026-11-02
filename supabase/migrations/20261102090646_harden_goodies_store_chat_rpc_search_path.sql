-- Keep built-ins ahead of the exposed public schema for this SECURITY DEFINER RPC.
alter function public.goodies_start_store_conversation(text, text)
  set search_path = pg_catalog, public, pg_temp;
