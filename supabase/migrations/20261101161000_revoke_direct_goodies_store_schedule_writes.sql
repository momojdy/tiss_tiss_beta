-- Store schedules contain publication, pricing, fulfilment and cash-policy controls.
-- All mutations must go through the owner/admin-authorized server RPCs.
revoke insert, update, delete on table public.goodies_store_schedules
  from public, anon, authenticated;
grant select on table public.goodies_store_schedules to anon, authenticated;
