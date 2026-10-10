-- Additive compatibility migration for Wantiss Business Space.
-- Staging-only until RLS, Auth routing, and payment-ledger integration are verified.
-- Deliberately does not alter profiles, notifications, wallets, wallet_transactions,
-- Stripe tables, or existing Edge Functions.

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  verification text not null default 'setup'
    check (verification in ('setup','pending','verified','action_required','restricted','suspended')),
  payout_ready boolean not null default false,
  is_live boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_members (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','admin','manager','staff','analyst')),
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);

create table if not exists public.business_features (
  business_id uuid not null references public.businesses(id) on delete cascade,
  feature text not null,
  status text not null default 'setup' check (status in ('setup','active','restricted','paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_id, feature)
);

create table if not exists public.business_activity (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  title text not null,
  kind text not null default 'business',
  feature text,
  at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  title text not null,
  feature text not null,
  status text not null default 'draft' check (status in ('draft','pending','published','archived','rejected')),
  price numeric(12,2) check (price is null or price >= 0),
  stock integer check (stock is null or stock >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.feature_orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  title text not null,
  feature text not null,
  status text not null default 'pending',
  amount numeric(12,2) not null default 0 check (amount >= 0),
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

-- This table is a reporting/audit ledger only. It is not a second spendable wallet.
-- No rows are automatically inferred from customer wallet transactions.
create table if not exists public.wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  label text not null,
  type text not null check (type in ('sale','fee','refund','payout','adjustment')),
  status text not null default 'pending' check (status in ('pending','available','completed','failed','reversed')),
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'USD' check (currency in ('USD','HTG','DOP')),
  reference_id text,
  idempotency_key text,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique (business_id, idempotency_key)
);

create index if not exists business_members_user_idx on public.business_members(user_id);
create index if not exists business_activity_business_at_idx on public.business_activity(business_id, at desc);
create index if not exists listings_business_created_idx on public.listings(business_id, created_at desc);
create index if not exists feature_orders_business_created_idx on public.feature_orders(business_id, created_at desc);
create index if not exists wallet_ledger_business_created_idx on public.wallet_ledger(business_id, created_at desc);

alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.business_features enable row level security;
alter table public.business_activity enable row level security;
alter table public.listings enable row level security;
alter table public.feature_orders enable row level security;
alter table public.wallet_ledger enable row level security;

create or replace function public.is_business_member(p_business uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.business_members bm
    where bm.business_id = p_business and bm.user_id = auth.uid()
  );
$$;

revoke all on function public.is_business_member(uuid) from public;
grant execute on function public.is_business_member(uuid) to authenticated;

drop policy if exists businesses_member_read on public.businesses;
create policy businesses_member_read on public.businesses for select to authenticated
using (public.is_business_member(id));
drop policy if exists businesses_owner_insert on public.businesses;
create policy businesses_owner_insert on public.businesses for insert to authenticated
with check (
  owner_user_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and lower(trim(coalesce(p.role, ''))) in ('vendor', 'business', 'seller', 'merchant')
  )
);
drop policy if exists businesses_owner_update on public.businesses;
create policy businesses_owner_update on public.businesses for update to authenticated
using (
  owner_user_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and lower(trim(coalesce(p.role, ''))) in ('vendor', 'business', 'seller', 'merchant')
  )
)
with check (
  owner_user_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and lower(trim(coalesce(p.role, ''))) in ('vendor', 'business', 'seller', 'merchant')
  )
);

drop policy if exists business_members_member_read on public.business_members;
create policy business_members_member_read on public.business_members for select to authenticated
using (public.is_business_member(business_id));
drop policy if exists business_members_owner_manage on public.business_members;
create policy business_members_owner_manage on public.business_members for all to authenticated
using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_user_id = auth.uid()))
with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_user_id = auth.uid()));

drop policy if exists business_features_member_read on public.business_features;
create policy business_features_member_read on public.business_features for select to authenticated
using (public.is_business_member(business_id));
drop policy if exists business_features_owner_manage on public.business_features;
create policy business_features_owner_manage on public.business_features for all to authenticated
using (exists (select 1 from public.business_members bm where bm.business_id = business_features.business_id and bm.user_id = auth.uid() and bm.role in ('owner','admin')))
with check (exists (select 1 from public.business_members bm where bm.business_id = business_features.business_id and bm.user_id = auth.uid() and bm.role in ('owner','admin')));

drop policy if exists business_activity_member_read on public.business_activity;
create policy business_activity_member_read on public.business_activity for select to authenticated
using (public.is_business_member(business_id));
drop policy if exists business_activity_member_insert on public.business_activity;
create policy business_activity_member_insert on public.business_activity for insert to authenticated
with check (public.is_business_member(business_id) and (actor_user_id is null or actor_user_id = auth.uid()));

drop policy if exists listings_member_read on public.listings;
create policy listings_member_read on public.listings for select to authenticated
using (public.is_business_member(business_id));
drop policy if exists listings_manager_write on public.listings;
create policy listings_manager_write on public.listings for all to authenticated
using (exists (select 1 from public.business_members bm where bm.business_id = listings.business_id and bm.user_id = auth.uid() and bm.role in ('owner','admin','manager')))
with check (exists (select 1 from public.business_members bm where bm.business_id = listings.business_id and bm.user_id = auth.uid() and bm.role in ('owner','admin','manager')));

drop policy if exists feature_orders_member_read on public.feature_orders;
create policy feature_orders_member_read on public.feature_orders for select to authenticated
using (public.is_business_member(business_id));

drop policy if exists wallet_ledger_member_read on public.wallet_ledger;
create policy wallet_ledger_member_read on public.wallet_ledger for select to authenticated
using (public.is_business_member(business_id));

create or replace function public.create_business(p_name text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_business uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  -- Authorize using the trusted server-managed profile role, not editable Auth user metadata.
  if not exists (
    select 1 from public.profiles p
    where p.id = v_user
      and lower(trim(coalesce(p.role, ''))) in ('vendor', 'business', 'seller', 'merchant')
  ) then
    raise exception 'A vendor account is required to create a business';
  end if;
  if p_name is null or length(trim(p_name)) not between 1 and 120 then
    raise exception 'Business name must be between 1 and 120 characters';
  end if;

  insert into public.businesses(name, owner_user_id)
  values (trim(p_name), v_user)
  returning id into v_business;

  insert into public.business_members(business_id, user_id, role)
  values (v_business, v_user, 'owner');

  insert into public.business_activity(business_id, actor_user_id, title, kind)
  values (v_business, v_user, 'Business profile created', 'onboarding');

  return v_business;
end;
$$;
revoke all on function public.create_business(text) from public;
grant execute on function public.create_business(text) to authenticated;

create or replace function public.dashboard_summary(
  p_business uuid,
  p_days integer default 30,
  p_feature text default null
)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_available numeric := 0;
  v_pending numeric := 0;
  v_series jsonb := '[]'::jsonb;
begin
  if not public.is_business_member(p_business) then raise exception 'Not authorized for this business'; end if;
  if p_days not in (7,30,90,365) then raise exception 'Unsupported period'; end if;

  select coalesce(sum(amount),0) into v_available
  from public.wallet_ledger
  where business_id = p_business and type = 'sale' and status = 'available';

  select coalesce(sum(amount),0) into v_pending
  from public.wallet_ledger
  where business_id = p_business and type = 'sale' and status = 'pending';

  select coalesce(jsonb_agg(jsonb_build_object('date', d::date, 'amount', coalesce(x.total,0)) order by d), '[]'::jsonb)
  into v_series
  from generate_series(current_date - (p_days - 1), current_date, interval '1 day') d
  left join (
    select date_trunc('day', created_at)::date as day, sum(amount) as total
    from public.wallet_ledger
    where business_id = p_business and type = 'sale' and status in ('available','completed')
      and created_at >= now() - make_interval(days => p_days)
    group by 1
  ) x on x.day = d::date;

  return jsonb_build_object('available', v_available, 'pending', v_pending, 'series', v_series);
end;
$$;
revoke all on function public.dashboard_summary(uuid,integer,text) from public;
grant execute on function public.dashboard_summary(uuid,integer,text) to authenticated;

create or replace function public.earnings_breakdown(p_business uuid, p_days integer default 30)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare v_gross numeric := 0; v_fees numeric := 0; v_refunds numeric := 0;
begin
  if not public.is_business_member(p_business) then raise exception 'Not authorized for this business'; end if;
  if p_days not in (7,30,90,365) then raise exception 'Unsupported period'; end if;

  select
    coalesce(sum(amount) filter (where type = 'sale'),0),
    coalesce(sum(amount) filter (where type = 'fee'),0),
    coalesce(sum(amount) filter (where type = 'refund'),0)
  into v_gross, v_fees, v_refunds
  from public.wallet_ledger
  where business_id = p_business and status in ('available','completed','reversed')
    and created_at >= now() - make_interval(days => p_days);

  return jsonb_build_object('gross',v_gross,'fees',v_fees,'refunds',v_refunds);
end;
$$;
revoke all on function public.earnings_breakdown(uuid,integer) from public;
grant execute on function public.earnings_breakdown(uuid,integer) to authenticated;

grant select on public.businesses, public.business_members, public.business_features,
  public.business_activity, public.listings, public.feature_orders, public.wallet_ledger to authenticated;
grant insert, update on public.businesses, public.business_features, public.business_activity, public.listings to authenticated;
