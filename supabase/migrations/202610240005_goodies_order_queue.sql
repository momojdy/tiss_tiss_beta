-- Server-backed Goodies order queue. Demo payments are explicitly labelled and are
-- never treated as a real captured payment.
create table if not exists public.goodies_orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique,
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete cascade,
  store_id text not null,
  status text not null default 'placed' check (status in ('scheduled','placed','accepted','preparing','ready','completed','cancelled')),
  scheduled_for timestamptz,
  order_type text not null default 'delivery' check (order_type in ('delivery','pickup')),
  address jsonb,
  contact_phone text,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(12,2) not null default 0,
  delivery_fee numeric(12,2) not null default 0,
  service_fee numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  tip numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  payment_method text not null default 'demo',
  payment_status text not null default 'demo',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists goodies_orders_business_created_idx on public.goodies_orders (business_id, created_at desc);
create index if not exists goodies_orders_customer_created_idx on public.goodies_orders (customer_id, created_at desc);
create index if not exists goodies_orders_scheduled_idx on public.goodies_orders (business_id, scheduled_for) where status = 'scheduled';
alter table public.goodies_orders enable row level security;
drop policy if exists "Customers can create Goodies orders for mapped stores" on public.goodies_orders;
create policy "Customers can create Goodies orders for mapped stores"
on public.goodies_orders for insert to authenticated
with check (
  customer_id = (select auth.uid())
  and exists (select 1 from public.goodies_store_schedules gs where gs.business_id = goodies_orders.business_id and gs.store_id = goodies_orders.store_id and gs.is_live = true)
);
drop policy if exists "Customers and store members can read Goodies orders" on public.goodies_orders;
create policy "Customers and store members can read Goodies orders"
on public.goodies_orders for select to authenticated
using (
  customer_id = (select auth.uid())
  or exists (select 1 from public.business_members bm where bm.business_id = goodies_orders.business_id and bm.user_id = (select auth.uid()))
);
drop policy if exists "Store members can update Goodies orders" on public.goodies_orders;
create policy "Store members can update Goodies orders"
on public.goodies_orders for update to authenticated
using (exists (select 1 from public.business_members bm where bm.business_id = goodies_orders.business_id and bm.user_id = (select auth.uid())))
with check (exists (select 1 from public.business_members bm where bm.business_id = goodies_orders.business_id and bm.user_id = (select auth.uid())));
grant select, insert on public.goodies_orders to authenticated;
grant update (status, updated_at) on public.goodies_orders to authenticated;
