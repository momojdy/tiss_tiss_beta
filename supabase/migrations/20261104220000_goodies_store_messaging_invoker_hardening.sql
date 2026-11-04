-- These RPCs rely on the existing authenticated RLS policies for conversation
-- reads/inserts and message inserts. Keep them SECURITY INVOKER so RLS remains
-- the authority and these endpoints do not add another SECURITY DEFINER surface.
alter function public.goodies_start_store_conversation(text, text) security invoker;
alter function public.goodies_send_store_message(uuid, text) security invoker;
alter function public.goodies_vendor_reply(uuid, text) security invoker;

alter function public.goodies_start_store_conversation(text, text) set search_path = '';
alter function public.goodies_send_store_message(uuid, text) set search_path = '';
alter function public.goodies_vendor_reply(uuid, text) set search_path = '';

revoke all on function public.goodies_start_store_conversation(text, text) from public, anon;
revoke all on function public.goodies_send_store_message(uuid, text) from public, anon;
revoke all on function public.goodies_vendor_reply(uuid, text) from public, anon;
grant execute on function public.goodies_start_store_conversation(text, text) to authenticated;
grant execute on function public.goodies_send_store_message(uuid, text) to authenticated;
grant execute on function public.goodies_vendor_reply(uuid, text) to authenticated;
