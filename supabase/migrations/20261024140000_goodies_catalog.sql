-- Goodies live catalog: vendor-managed products with stock, store setup, server-side
-- publishing gated on admin verification, and product-aware order validation.
-- Also gives vendors a safe way to edit their business info (businesses is SELECT-only
-- for clients) and closes the direct is_live write on goodies_store_schedules.

-- 1. Store setup columns on the public store row.
alter table public.goodies_store_schedules
  add column if not exists category text,
  add column if not exists kind text,
  add column if not exists min_order numeric(10,2) not null default 0 check (min_order >= 0 and min_order <= 100000),
  add column if not exists delivery_fee numeric(10,2) not null default 0 check (delivery_fee >= 0 and delivery_fee <= 10000),
  add column if not exists eta_min integer not null default 20 check (eta_min between 1 and 1440),
  add column if not exists eta_max integer not null default 35 check (eta_max between 1 and 1440),
  add column if not exists promo text,
  add column if not exists names jsonb not null default '{}'::jsonb;

-- 2. Products (vendor-managed, stock set by the vendor).
create table if not exists public.goodies_products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  description text check (description is null or char_length(description) <= 500),
  price numeric(10,2) not null check (price >= 0 and price <= 100000),
  emoji text not null default '🛍️' check (char_length(emoji) <= 16),
  aisle text check (aisle is null or char_length(aisle) <= 60),
  stock integer not null default 0 check (stock >= 0 and stock <= 100000),
  is_available boolean not null default true,
  restriction text not null default 'none' check (restriction in ('none', 'otc', 'alcohol')),
  photo_url text check (photo_url is null or char_length(photo_url) <= 1000),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists goodies_products_business_idx on public.goodies_products (business_id, sort_order, created_at);
alter table public.goodies_products enable row level security;

drop policy if exists "Public can read products of live stores" on public.goodies_products;
create policy "Public can read products of live stores" on public.goodies_products
  for select to anon, authenticated using (
    is_available = true
    and exists (select 1 from public.goodies_store_schedules gs where gs.business_id = goodies_products.business_id and gs.is_live = true)
  );
drop policy if exists "Business members can read their products" on public.goodies_products;
create policy "Business members can read their products" on public.goodies_products
  for select to authenticated using (
    exists (select 1 from public.business_members bm where bm.business_id = goodies_products.business_id and bm.user_id = (select auth.uid()))
  );
drop policy if exists "Business managers can insert products" on public.goodies_products;
create policy "Business managers can insert products" on public.goodies_products
  for insert to authenticated with check (
    exists (select 1 from public.business_members bm where bm.business_id = goodies_products.business_id and bm.user_id = (select auth.uid()) and bm.role in ('owner', 'manager'))
  );
drop policy if exists "Business managers can update products" on public.goodies_products;
create policy "Business managers can update products" on public.goodies_products
  for update to authenticated using (
    exists (select 1 from public.business_members bm where bm.business_id = goodies_products.business_id and bm.user_id = (select auth.uid()) and bm.role in ('owner', 'manager'))
  ) with check (
    exists (select 1 from public.business_members bm where bm.business_id = goodies_products.business_id and bm.user_id = (select auth.uid()) and bm.role in ('owner', 'manager'))
  );
drop policy if exists "Business managers can delete products" on public.goodies_products;
create policy "Business managers can delete products" on public.goodies_products
  for delete to authenticated using (
    exists (select 1 from public.business_members bm where bm.business_id = goodies_products.business_id and bm.user_id = (select auth.uid()) and bm.role in ('owner', 'manager'))
  );
revoke all on public.goodies_products from anon, authenticated;
grant select on public.goodies_products to anon, authenticated;
grant insert (business_id, name, description, price, emoji, aisle, stock, is_available, restriction, photo_url, sort_order) on public.goodies_products to authenticated;
grant update (name, description, price, emoji, aisle, stock, is_available, restriction, photo_url, sort_order, updated_at) on public.goodies_products to authenticated;
grant delete on public.goodies_products to authenticated;

-- 3. Internal helper: copy business info onto the public store row; unpublish if not verified.
create or replace function public.goodies_sync_store_from_business(p_business uuid)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.goodies_store_schedules s set
    hours = b.hours,
    accept_scheduled_orders = b.accept_scheduled_orders,
    scheduled_order_start_minutes = b.scheduled_order_start_minutes,
    business_name = b.name, description = b.description, phone = b.phone, email = b.email,
    website = b.website, address = b.address, city = b.city, country = b.country,
    delivery_modes = coalesce(b.delivery_modes, '{}'::text[]), logo_url = b.logo_url,
    is_live = case when b.verification = 'verified' then s.is_live else false end,
    updated_at = now()
  from public.businesses b
  where b.id = s.business_id and s.business_id = p_business;
$$;
revoke all on function public.goodies_sync_store_from_business(uuid) from public, anon, authenticated;

-- 4. Vendors edit business info through a whitelisted function.
create or replace function public.update_my_business_info(p_business uuid, p_fields jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_start integer;
begin
  if v_uid is null then raise exception 'Sign in required' using errcode = '28000'; end if;
  if not exists (select 1 from public.business_members bm where bm.business_id = p_business and bm.user_id = v_uid and bm.role in ('owner', 'manager')) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if p_fields is null or jsonb_typeof(p_fields) <> 'object' then raise exception 'Invalid fields' using errcode = '22023'; end if;
  if p_fields ? 'name' and (char_length(trim(coalesce(p_fields ->> 'name', ''))) not between 2 and 160) then
    raise exception 'Business name must be between 2 and 160 characters' using errcode = '22023';
  end if;
  if p_fields ? 'hours' and jsonb_typeof(p_fields -> 'hours') <> 'object' then raise exception 'Invalid hours' using errcode = '22023'; end if;
  if p_fields ? 'delivery_modes' and jsonb_typeof(p_fields -> 'delivery_modes') <> 'array' then raise exception 'Invalid delivery modes' using errcode = '22023'; end if;
  if p_fields ? 'scheduled_order_start_minutes' then
    v_start := (p_fields ->> 'scheduled_order_start_minutes')::integer;
    if v_start is null or v_start < 0 or v_start > 1440 then raise exception 'Invalid scheduled order lead time' using errcode = '22023'; end if;
  end if;

  update public.businesses b set
    name = case when p_fields ? 'name' then trim(p_fields ->> 'name') else b.name end,
    description = case when p_fields ? 'description' then left(nullif(p_fields ->> 'description', ''), 1000) else b.description end,
    phone = case when p_fields ? 'phone' then left(nullif(p_fields ->> 'phone', ''), 32) else b.phone end,
    phone_country = case when p_fields ? 'phone_country' then left(nullif(p_fields ->> 'phone_country', ''), 4) else b.phone_country end,
    email = case when p_fields ? 'email' then left(nullif(p_fields ->> 'email', ''), 254) else b.email end,
    website = case when p_fields ? 'website' then left(nullif(p_fields ->> 'website', ''), 300) else b.website end,
    address = case when p_fields ? 'address' then left(nullif(p_fields ->> 'address', ''), 300) else b.address end,
    city = case when p_fields ? 'city' then left(nullif(p_fields ->> 'city', ''), 120) else b.city end,
    country = case when p_fields ? 'country' then left(nullif(p_fields ->> 'country', ''), 120) else b.country end,
    delivery_modes = case when p_fields ? 'delivery_modes' then array(select left(x, 20) from jsonb_array_elements_text(p_fields -> 'delivery_modes') x) else b.delivery_modes end,
    hours = case when p_fields ? 'hours' then p_fields -> 'hours' else b.hours end,
    logo_url = case when p_fields ? 'logo_url' then left(nullif(p_fields ->> 'logo_url', ''), 1000) else b.logo_url end,
    accept_scheduled_orders = case when p_fields ? 'accept_scheduled_orders' then coalesce((p_fields ->> 'accept_scheduled_orders')::boolean, false) else b.accept_scheduled_orders end,
    scheduled_order_start_minutes = case when p_fields ? 'scheduled_order_start_minutes' then v_start else b.scheduled_order_start_minutes end
  where b.id = p_business;

  perform public.goodies_sync_store_from_business(p_business);
end;
$$;
revoke all on function public.update_my_business_info(uuid, jsonb) from public, anon;
grant execute on function public.update_my_business_info(uuid, jsonb) to authenticated;

-- 5. Store setup (category, minimum, fee, ETA, promo, names, fulfilment). Never touches is_live.
create or replace function public.goodies_save_store_setup(
  p_business uuid, p_category text, p_kind text, p_min_order numeric, p_delivery_fee numeric,
  p_eta_min integer, p_eta_max integer, p_promo text, p_names jsonb, p_delivery boolean, p_pickup boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Sign in required' using errcode = '28000'; end if;
  if not exists (select 1 from public.business_members bm where bm.business_id = p_business and bm.user_id = v_uid and bm.role in ('owner', 'manager')) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if p_category is null or p_category not in ('restaurants', 'produce', 'beverages', 'bakery', 'meat', 'groceries', 'haitian', 'care', 'drugstore') then
    raise exception 'Choose a store category' using errcode = '22023';
  end if;
  if p_min_order is null or p_min_order < 0 or p_min_order > 100000 or p_delivery_fee is null or p_delivery_fee < 0 or p_delivery_fee > 10000 then
    raise exception 'Invalid minimum order or delivery fee' using errcode = '22023';
  end if;
  if p_eta_min is null or p_eta_max is null or p_eta_min < 1 or p_eta_max < p_eta_min or p_eta_max > 1440 then
    raise exception 'Invalid delivery time range' using errcode = '22023';
  end if;
  if not (coalesce(p_delivery, false) or coalesce(p_pickup, false)) then
    raise exception 'Keep delivery or pickup on' using errcode = '22023';
  end if;
  if p_promo is not null and p_promo ~* '(alcohol|alcool|liquor|rhum|clairin|barbancourt|whisk|vodka|tequila|cognac|brandy|\mbeer|bi[èe]re|\mwine|champagne|cocktail)' then
    raise exception 'Alcohol ads and promotions are prohibited on Wantiss' using errcode = 'P0001';
  end if;
  if p_names is null or jsonb_typeof(p_names) <> 'object' then p_names := '{}'::jsonb; end if;

  update public.businesses b set delivery_modes = array_remove(array[case when coalesce(p_delivery, false) then 'Delivery' end, case when coalesce(p_pickup, false) then 'Pickup' end], null)
   where b.id = p_business;

  insert into public.goodies_store_schedules (business_id, store_id, category, kind, min_order, delivery_fee, eta_min, eta_max, promo, names, is_live)
  values (p_business, p_business::text, p_category, left(nullif(trim(p_kind), ''), 80), p_min_order, p_delivery_fee, p_eta_min, p_eta_max, left(nullif(trim(p_promo), ''), 120), p_names, false)
  on conflict (business_id) do update set
    category = excluded.category, kind = excluded.kind, min_order = excluded.min_order, delivery_fee = excluded.delivery_fee,
    eta_min = excluded.eta_min, eta_max = excluded.eta_max, promo = excluded.promo, names = excluded.names, updated_at = now();

  perform public.goodies_sync_store_from_business(p_business);
end;
$$;
revoke all on function public.goodies_save_store_setup(uuid, text, text, numeric, numeric, integer, integer, text, jsonb, boolean, boolean) from public, anon;
grant execute on function public.goodies_save_store_setup(uuid, text, text, numeric, numeric, integer, integer, text, jsonb, boolean, boolean) to authenticated;

-- 6. Publish / unpublish. Publishing requires an admin-verified business and a complete store.
create or replace function public.goodies_set_store_live(p_business uuid, p_live boolean)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  b public.businesses%rowtype;
  s public.goodies_store_schedules%rowtype;
begin
  if v_uid is null then raise exception 'Sign in required' using errcode = '28000'; end if;
  if not exists (select 1 from public.business_members bm where bm.business_id = p_business and bm.user_id = v_uid and bm.role in ('owner', 'manager')) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  select * into s from public.goodies_store_schedules where business_id = p_business for update;
  if not found then raise exception 'Save your store setup first' using errcode = 'P0001'; end if;

  if not coalesce(p_live, false) then
    update public.goodies_store_schedules set is_live = false, updated_at = now() where business_id = p_business;
    return false;
  end if;

  select * into b from public.businesses where id = p_business;
  if b.verification is distinct from 'verified' then
    raise exception 'Your business must be verified by Wantiss before your store can go live' using errcode = 'P0001';
  end if;
  if s.category is null then raise exception 'Choose a store category first' using errcode = 'P0001'; end if;
  if b.hours is null or jsonb_typeof(b.hours) <> 'object' or b.hours = '{}'::jsonb then
    raise exception 'Set your opening hours in Business information first' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.goodies_products p where p.business_id = p_business and p.is_available and p.stock > 0) then
    raise exception 'Add at least one available product with stock first' using errcode = 'P0001';
  end if;

  perform public.goodies_sync_store_from_business(p_business);
  update public.goodies_store_schedules set is_live = true, updated_at = now() where business_id = p_business;
  return true;
end;
$$;
revoke all on function public.goodies_set_store_live(uuid, boolean) from public, anon;
grant execute on function public.goodies_set_store_live(uuid, boolean) to authenticated;

-- 7. Admin lever: verify / reject a business (audited). Unverifying unpublishes the store.
create or replace function public.wantiss_admin_set_business_verification(p_business uuid, p_status text, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.wantiss_has_permission('operations', 'edit') then raise exception 'Not authorized' using errcode = '42501'; end if;
  if p_status not in ('verified', 'pending', 'rejected') then raise exception 'Invalid status' using errcode = '22023'; end if;
  update public.businesses set verification = p_status where id = p_business;
  if not found then raise exception 'Business not found' using errcode = 'P0002'; end if;
  if p_status <> 'verified' then
    update public.goodies_store_schedules set is_live = false, updated_at = now() where business_id = p_business;
  end if;
  insert into public.wantiss_admin_audit_log (actor_user_id, action, resource_type, resource_id, reason, after_state)
  values ((select auth.uid()), 'business_verification_set', 'business', p_business::text, left(coalesce(p_reason, ''), 500), jsonb_build_object('verification', p_status));
end;
$$;
revoke all on function public.wantiss_admin_set_business_verification(uuid, text, text) from public, anon;
grant execute on function public.wantiss_admin_set_business_verification(uuid, text, text) to authenticated;

-- 8. Close direct client writes on store rows (publishing now goes through functions only).
revoke insert, update, delete on public.goodies_store_schedules from authenticated;
grant select on public.goodies_store_schedules to anon, authenticated;

-- 9. Product-aware order placement: validates items, prices and stock; decrements stock atomically.
create or replace function public.place_goodies_order(
  p_store_id text, p_order_type text, p_scheduled_for timestamptz, p_address jsonb, p_contact_phone text,
  p_items jsonb, p_subtotal numeric, p_delivery_fee numeric, p_service_fee numeric, p_discount numeric,
  p_tip numeric, p_total numeric, p_notes text
)
returns table (id uuid, order_code text, status text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_store public.goodies_store_schedules%rowtype;
  v_prod public.goodies_products%rowtype;
  v_status text; v_code text; v_id uuid;
  v_sum numeric := 0; v_item jsonb; v_q numeric; v_p numeric; v_pid uuid; v_tries int := 0;
  v_agg record;
begin
  if v_uid is null then raise exception 'Sign in to place an order' using errcode = '28000'; end if;

  select * into v_store from public.goodies_store_schedules s where s.store_id = p_store_id and s.is_live = true;
  if not found then raise exception 'This store is not accepting online orders yet' using errcode = 'P0001'; end if;

  if p_order_type not in ('delivery', 'pickup') then raise exception 'Invalid order type' using errcode = '22023'; end if;
  if coalesce(array_length(v_store.delivery_modes, 1), 0) > 0
     and not exists (select 1 from unnest(v_store.delivery_modes) m where lower(m) = p_order_type) then
    raise exception 'This store does not offer %', p_order_type using errcode = 'P0001';
  end if;
  if p_order_type = 'delivery' and (p_address is null or jsonb_typeof(p_address) <> 'object') then
    raise exception 'A delivery address is required' using errcode = '22023';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 100 then
    raise exception 'Cart must contain between 1 and 100 lines' using errcode = '22023';
  end if;
  for v_item in select * from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item) <> 'object' then raise exception 'Invalid cart line' using errcode = '22023'; end if;
    if v_item ? 'byo' and jsonb_typeof(v_item -> 'byo') not in ('null') then
      raise exception 'Custom builder items are not available yet' using errcode = 'P0001';
    end if;
    begin
      v_pid := (v_item ->> 'id')::uuid;
      v_q := (v_item ->> 'q')::numeric;
      v_p := (v_item ->> 'p')::numeric;
    exception when others then
      raise exception 'Invalid cart line' using errcode = '22023';
    end;
    if v_pid is null or v_q is null or v_p is null or v_q < 1 or v_q > 99 or v_q <> trunc(v_q) then
      raise exception 'Invalid cart line' using errcode = '22023';
    end if;
    select * into v_prod from public.goodies_products gp where gp.id = v_pid and gp.business_id = v_store.business_id and gp.is_available;
    if not found then raise exception 'An item in your cart is no longer available' using errcode = 'P0001'; end if;
    if v_prod.restriction = 'alcohol' then raise exception 'Alcohol orders are not available yet' using errcode = 'P0001'; end if;
    -- Client option upcharges: Large +1.50, drink +1.00 (no server-side option table yet).
    if not (abs(v_p - v_prod.price) < 0.005 or abs(v_p - (v_prod.price + 1)) < 0.005
         or abs(v_p - (v_prod.price + 1.5)) < 0.005 or abs(v_p - (v_prod.price + 2.5)) < 0.005) then
      raise exception 'The price of % has changed. Please review your cart', v_prod.name using errcode = 'P0001';
    end if;
    v_sum := v_sum + v_p * v_q;
  end loop;

  if p_delivery_fee is null or p_service_fee is null or p_discount is null or p_tip is null or p_subtotal is null or p_total is null
     or p_delivery_fee < 0 or p_service_fee < 0 or p_discount < 0 or p_tip < 0 then
    raise exception 'Invalid order totals' using errcode = '22023';
  end if;
  if p_discount > 0 then raise exception 'Promo codes are not available yet' using errcode = 'P0001'; end if;
  if p_order_type = 'pickup' and (p_delivery_fee <> 0 or p_tip <> 0) then raise exception 'Invalid order totals' using errcode = '22023'; end if;
  if p_order_type = 'delivery' and p_delivery_fee <> 0 and abs(p_delivery_fee - v_store.delivery_fee) > 0.005 then
    raise exception 'The delivery fee has changed. Please review your order' using errcode = 'P0001';
  end if;
  if abs(v_sum - p_subtotal) > 0.01 or abs((p_subtotal + p_delivery_fee + p_service_fee - p_discount + p_tip) - p_total) > 0.01 then
    raise exception 'Order totals do not match the cart' using errcode = '22023';
  end if;
  if p_subtotal < v_store.min_order then
    raise exception 'The minimum order for this store is %', v_store.min_order using errcode = 'P0001';
  end if;

  if p_scheduled_for is not null then
    if not v_store.accept_scheduled_orders then raise exception 'This store does not accept scheduled orders' using errcode = 'P0001'; end if;
    if p_scheduled_for < now() + make_interval(mins => v_store.scheduled_order_start_minutes) then
      raise exception 'Choose a later time for a scheduled order' using errcode = 'P0001';
    end if;
    if p_scheduled_for > now() + interval '30 days' then raise exception 'Scheduled time is too far ahead' using errcode = 'P0001'; end if;
    v_status := 'scheduled';
  else
    v_status := 'placed';
  end if;

  -- Atomic stock reservation (rolls back with the order if any item is short).
  for v_agg in
    select (e ->> 'id')::uuid as pid, sum((e ->> 'q')::int) as qty from jsonb_array_elements(p_items) e group by 1
  loop
    update public.goodies_products gp set stock = gp.stock - v_agg.qty, updated_at = now()
     where gp.id = v_agg.pid and gp.business_id = v_store.business_id and gp.is_available and gp.stock >= v_agg.qty;
    if not found then raise exception 'An item in your cart is out of stock' using errcode = 'P0001'; end if;
  end loop;

  loop
    v_code := 'GD' || lpad((floor(random() * 1000000))::int::text, 6, '0');
    exit when not exists (select 1 from public.goodies_orders o where o.order_code = v_code);
    v_tries := v_tries + 1;
    if v_tries > 20 then raise exception 'Could not allocate an order code' using errcode = 'P0001'; end if;
  end loop;

  insert into public.goodies_orders (
    order_code, business_id, customer_id, store_id, status, scheduled_for, order_type, address, contact_phone, items,
    subtotal, delivery_fee, service_fee, discount, tip, total, payment_method, payment_status, notes
  ) values (
    v_code, v_store.business_id, v_uid, p_store_id, v_status, p_scheduled_for, p_order_type,
    case when p_order_type = 'delivery' then p_address else null end,
    left(nullif(trim(p_contact_phone), ''), 32), p_items,
    p_subtotal, p_delivery_fee, p_service_fee, p_discount, p_tip, p_total,
    'cash', 'pay_on_receipt', left(nullif(trim(p_notes), ''), 500)
  ) returning goodies_orders.id into v_id;

  return query select v_id, v_code, v_status;
end;
$$;

-- 10. Status changes restore stock on cancellation.
create or replace function public.set_goodies_order_status(p_order_id uuid, p_status text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_o public.goodies_orders%rowtype;
  v_member boolean;
  v_agg record;
begin
  if v_uid is null then raise exception 'Sign in required' using errcode = '28000'; end if;
  select * into v_o from public.goodies_orders where goodies_orders.id = p_order_id for update;
  if not found then raise exception 'Order not found' using errcode = 'P0002'; end if;
  select exists (select 1 from public.business_members bm where bm.business_id = v_o.business_id and bm.user_id = v_uid) into v_member;

  if p_status = 'cancelled' then
    if v_o.customer_id = v_uid and v_o.status in ('scheduled', 'placed') then null;
    elsif v_member and v_o.status in ('scheduled', 'placed', 'accepted', 'preparing') then null;
    else raise exception 'This order can no longer be cancelled' using errcode = 'P0001';
    end if;
    for v_agg in
      select (e ->> 'id')::uuid as pid, sum((e ->> 'q')::int) as qty
        from jsonb_array_elements(v_o.items) e
       where (e ->> 'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' and (e ->> 'q') ~ '^[0-9]+$'
       group by 1
    loop
      update public.goodies_products gp set stock = least(gp.stock + v_agg.qty, 100000), updated_at = now()
       where gp.id = v_agg.pid and gp.business_id = v_o.business_id;
    end loop;
  else
    if not v_member then raise exception 'Not allowed' using errcode = '42501'; end if;
    if not ((v_o.status in ('scheduled', 'placed') and p_status = 'accepted')
         or (v_o.status = 'accepted' and p_status = 'preparing')
         or (v_o.status = 'preparing' and p_status = 'ready')
         or (v_o.status = 'ready' and p_status = 'completed')) then
      raise exception 'Invalid status change from % to %', v_o.status, p_status using errcode = 'P0001';
    end if;
    if v_o.status = 'scheduled' and v_o.scheduled_for is not null and v_o.scheduled_for > now() then
      raise exception 'This order is scheduled for a later time' using errcode = 'P0001';
    end if;
  end if;

  update public.goodies_orders set status = p_status, updated_at = now() where goodies_orders.id = p_order_id;
  return p_status;
end;
$$;

revoke all on function public.place_goodies_order(text, text, timestamptz, jsonb, text, jsonb, numeric, numeric, numeric, numeric, numeric, numeric, text) from public, anon;
revoke all on function public.set_goodies_order_status(uuid, text) from public, anon;
grant execute on function public.place_goodies_order(text, text, timestamptz, jsonb, text, jsonb, numeric, numeric, numeric, numeric, numeric, numeric, text) to authenticated;
grant execute on function public.set_goodies_order_status(uuid, text) to authenticated;
