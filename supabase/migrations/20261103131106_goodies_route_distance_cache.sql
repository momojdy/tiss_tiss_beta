create table if not exists public.goodies_route_cache (
  store_id text not null references public.goodies_store_schedules(store_id) on delete cascade,
  address_hash text not null check (address_hash ~ '^[0-9a-f]{64}$'),
  origin_latitude double precision not null check (origin_latitude between -90 and 90),
  origin_longitude double precision not null check (origin_longitude between -180 and 180),
  distance_m integer not null check (distance_m > 0),
  route_geometry jsonb,
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  primary key (store_id, address_hash)
);
alter table public.goodies_route_cache enable row level security;
revoke all on public.goodies_route_cache from anon, authenticated;
grant all on public.goodies_route_cache to service_role;
create index if not exists goodies_route_cache_expiry_idx on public.goodies_route_cache(expires_at);