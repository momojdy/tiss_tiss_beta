-- The scheduled worker is not a client RPC. Keep it callable only by trusted database/service roles.
revoke all on function public.goodies_auto_complete_self_deliveries() from public, anon, authenticated;
