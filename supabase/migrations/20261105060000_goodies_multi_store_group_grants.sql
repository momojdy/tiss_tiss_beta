-- Order-group rows are customer-readable only. Writes are performed by the
-- SECURITY DEFINER checkout RPC, never by direct client table access.
revoke all on table public.goodies_order_groups from anon, authenticated;
grant select on table public.goodies_order_groups to authenticated;
