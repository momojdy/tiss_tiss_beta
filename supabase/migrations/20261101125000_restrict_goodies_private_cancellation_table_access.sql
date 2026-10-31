revoke all on public.goodies_order_cancellation_private from public, anon, authenticated;
grant select on public.goodies_order_cancellation_private to authenticated;
grant all on public.goodies_order_cancellation_private to service_role;
