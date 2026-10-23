-- Vendor-controlled scheduled orders for Goodies.
-- Defaults to disabled so no business silently accepts future orders.
alter table public.businesses
  add column if not exists accept_scheduled_orders boolean not null default false;

comment on column public.businesses.accept_scheduled_orders is
  'When true, the business may accept customer orders scheduled for a future opening-time slot while currently closed. The Goodies customer catalog must read this field before offering scheduled checkout.';
