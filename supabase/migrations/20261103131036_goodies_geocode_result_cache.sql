create table if not exists public.goodies_geocode_cache (
  address_hash text primary key check (address_hash ~ '^[0-9a-f]{64}$'),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '90 days')
);
alter table public.goodies_geocode_cache enable row level security;
revoke all on public.goodies_geocode_cache from anon, authenticated;
grant all on public.goodies_geocode_cache to service_role;
create index if not exists goodies_geocode_cache_expiry_idx on public.goodies_geocode_cache(expires_at);