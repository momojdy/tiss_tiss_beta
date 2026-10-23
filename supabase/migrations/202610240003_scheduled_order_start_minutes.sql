-- Vendor-configurable earliest scheduled-order time relative to opening.
alter table public.businesses
  add column if not exists scheduled_order_start_minutes integer not null default 60
  check (scheduled_order_start_minutes >= 0 and scheduled_order_start_minutes <= 1440);
comment on column public.businesses.scheduled_order_start_minutes is
  'Minimum minutes after the store opening time before a customer may schedule an order while the store is closed.';
