-- Geoapify-backed per-store Goodies delivery pricing foundation.
-- Existing stores remain on fixed pricing; distance pricing is opt-in.
alter table public.goodies_store_schedules
  add column if not exists delivery_pricing_mode text not null default 'fixed'
    check (delivery_pricing_mode in ('fixed','distance')),
  add column if not exists delivery_base_fee numeric(10,2) not null default 0
    check (delivery_base_fee >= 0 and delivery_base_fee <= 10000),
  add column if not exists delivery_per_km_fee numeric(10,2) not null default 0
    check (delivery_per_km_fee >= 0 and delivery_per_km_fee <= 10000),
  add column if not exists delivery_min_fee numeric(10,2) not null default 0
    check (delivery_min_fee >= 0 and delivery_min_fee <= 10000),
  add column if not exists delivery_max_fee numeric(10,2)
    check (delivery_max_fee is null or (delivery_max_fee >= 0 and delivery_max_fee <= 10000)),
  add column if not exists delivery_max_distance_km numeric(8,2)
    check (delivery_max_distance_km is null or (delivery_max_distance_km > 0 and delivery_max_distance_km <= 500));

create table if not exists public.goodies_delivery_quotes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  store_id text not null references public.goodies_store_schedules(store_id) on delete cascade,
  address_payload jsonb not null,
  distance_m integer not null check (distance_m > 0),
  fee numeric(10,2) not null check (fee >= 0),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '5 minutes'),
  consumed_at timestamptz
);
create index if not exists goodies_delivery_quotes_checkout_idx
  on public.goodies_delivery_quotes(customer_id, store_id, expires_at desc)
  where consumed_at is null;
alter table public.goodies_delivery_quotes enable row level security;
revoke all on public.goodies_delivery_quotes from anon, authenticated;
grant all on public.goodies_delivery_quotes to service_role;
