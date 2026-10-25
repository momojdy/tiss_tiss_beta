create table if not exists public.goodies_builder_configs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  builder_id text not null check (length(trim(builder_id)) between 1 and 120),
  config jsonb not null check (jsonb_typeof(config)='object'),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(business_id,builder_id)
);
create index if not exists goodies_builder_configs_business_enabled_idx on public.goodies_builder_configs(business_id,enabled);
alter table public.goodies_builder_configs enable row level security;
drop policy if exists "Business members manage Goodies builders" on public.goodies_builder_configs;
create policy "Business members manage Goodies builders" on public.goodies_builder_configs
  for all to authenticated
  using (exists(select 1 from public.business_members bm where bm.business_id=goodies_builder_configs.business_id and bm.user_id=(select auth.uid())))
  with check (exists(select 1 from public.business_members bm where bm.business_id=goodies_builder_configs.business_id and bm.user_id=(select auth.uid())));
drop policy if exists "Live Goodies builders are readable" on public.goodies_builder_configs;
create policy "Live Goodies builders are readable" on public.goodies_builder_configs
  for select to authenticated
  using (
    (enabled and exists(select 1 from public.goodies_store_schedules gs where gs.business_id=goodies_builder_configs.business_id and gs.is_live=true))
    or exists(select 1 from public.business_members bm where bm.business_id=goodies_builder_configs.business_id and bm.user_id=(select auth.uid()))
  );
