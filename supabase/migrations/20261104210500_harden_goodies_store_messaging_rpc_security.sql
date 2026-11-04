-- Explicitly retain the SECURITY DEFINER execution mode on the three
-- Goodies messaging RPCs. Each function authenticates auth.uid() and enforces
-- the customer/store-member relationship itself; the empty search_path and
-- fully qualified object references prevent object-shadowing attacks.
alter function public.goodies_start_store_conversation(text, text) security definer;
alter function public.goodies_start_store_conversation(text, text) set search_path = '';

alter function public.goodies_send_store_message(uuid, text) security definer;
alter function public.goodies_send_store_message(uuid, text) set search_path = '';

alter function public.goodies_vendor_reply(uuid, text) security definer;
alter function public.goodies_vendor_reply(uuid, text) set search_path = '';
