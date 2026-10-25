
create table if not exists public.goodies_promotions (
 id uuid primary key default gen_random_uuid(),
 code text not null unique check (code=upper(trim(code)) and length(code) between 3 and 40),
 discount_type text not null check (discount_type in ('percent','free_delivery')),
 discount_value numeric not null default 0 check (discount_value>=0 and discount_value<=100),
 min_subtotal numeric not null default 0 check (min_subtotal>=0),
 store_id text, starts_at timestamptz, expires_at timestamptz,
 max_redemptions integer check (max_redemptions is null or max_redemptions>0),
 redemption_count integer not null default 0 check (redemption_count>=0),
 is_active boolean not null default true, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check (expires_at is null or starts_at is null or expires_at>starts_at)
);
alter table public.goodies_promotions enable row level security;
revoke all on public.goodies_promotions from public,anon,authenticated;
grant select,insert,update,delete on public.goodies_promotions to service_role;
insert into public.goodies_promotions(code,discount_type,discount_value,min_subtotal,is_active)
values ('GOODIES10','percent',10,8,true),('FREESHIP','free_delivery',0,5,true)
on conflict(code) do update set discount_type=excluded.discount_type,discount_value=excluded.discount_value,min_subtotal=excluded.min_subtotal,is_active=true,updated_at=now();

CREATE OR REPLACE FUNCTION public.place_goodies_order(p_store_id text, p_order_type text, p_scheduled_for timestamp with time zone, p_address jsonb, p_contact_phone text, p_items jsonb, p_subtotal numeric, p_delivery_fee numeric, p_service_fee numeric, p_discount numeric, p_tip numeric, p_total numeric, p_notes text, p_promo_code text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, order_code text, status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_store public.goodies_store_schedules%rowtype;
  v_prod public.goodies_products%rowtype;
  v_status text; v_code text; v_id uuid;
  v_sum numeric := 0; v_item jsonb; v_q numeric; v_p numeric; v_pid uuid; v_tries int := 0;
  v_agg record; v_builder_price numeric;
  v_content jsonb; v_coupon jsonb; v_promo_id uuid; v_coupon_code text := upper(trim(coalesce(p_promo_code,'')));
  v_expected_discount numeric := 0; v_coupon_val numeric := 0; v_coupon_min numeric := 0;
  v_coupon_store text; v_coupon_kind text; v_free_delivery boolean := false;
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
    if jsonb_typeof(v_item -> 'byo') = 'object' then
      v_builder_price := public.validate_goodies_builder_line(v_store.business_id, p_store_id, v_item);
      v_q := (v_item ->> 'q')::numeric;
      if v_q is null or v_q < 1 or v_q > 99 or v_q <> trunc(v_q) then raise exception 'Invalid cart line quantity' using errcode='22023'; end if;
      v_sum := v_sum + v_builder_price * v_q;
      continue;
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
  if v_coupon_code <> '' then
    v_coupon := null; v_promo_id := null;
    select p.id, jsonb_build_object(
      'code',p.code,'st',case when p.is_active then 'Live' else 'Draft' end,
      'from',case when p.starts_at is null then null else to_char(p.starts_at at time zone 'UTC','YYYY-MM-DD') end,
      'to',case when p.expires_at is null then null else to_char(p.expires_at at time zone 'UTC','YYYY-MM-DD') end,
      'min',p.min_subtotal,'store',coalesce(p.store_id,'All stores'),
      'kind',case when p.discount_type='percent' then 'Percent' else 'Free delivery' end,'val',p.discount_value
    ) into v_promo_id,v_coupon
    from public.goodies_promotions p
    where upper(p.code)=v_coupon_code and p.is_active
      and (p.starts_at is null or p.starts_at<=now()) and (p.expires_at is null or p.expires_at>=now())
      and (p.max_redemptions is null or p.redemption_count<p.max_redemptions)
      and (p.store_id is null or p.store_id=p_store_id)
    for update limit 1;
    if v_coupon is null then
      select payload into v_content from public.wantiss_cms_content where content_key in ('goodies.content','goodies') and status='published'
        order by case when content_key='goodies.content' then 0 else 1 end, case when locale='en' then 0 else 1 end, published_at desc nulls last, version desc limit 1;
      select c into v_coupon from jsonb_array_elements(coalesce(v_content->'coupons','[]'::jsonb)) c
        where upper(trim(coalesce(c->>'code',''))) = v_coupon_code and coalesce(c->>'st','')='Live'
          and (nullif(c->>'from','') is null or (c->>'from')::date <= current_date)
          and (nullif(c->>'to','') is null or (c->>'to')::date >= current_date) limit 1;
    end if;
    if v_coupon is null then raise exception 'That promo code is not valid or is no longer active' using errcode='P0001'; end if;
    v_coupon_min := coalesce(nullif(v_coupon->>'min','')::numeric,0);
    if v_sum < v_coupon_min then raise exception 'The order does not meet this promo code minimum' using errcode='P0001'; end if;
    v_coupon_store := nullif(v_coupon->>'store','');
    if v_coupon_store is not null and v_coupon_store <> 'All stores' and v_coupon_store <> p_store_id then raise exception 'This promo code is not valid for this store' using errcode='P0001'; end if;
    v_coupon_kind := lower(coalesce(v_coupon->>'kind',''));
    if v_coupon_kind='percent' then
      v_coupon_val := coalesce(nullif(v_coupon->>'val','')::numeric,0);
      if v_coupon_val<=0 or v_coupon_val>100 then raise exception 'Invalid promo configuration' using errcode='22023'; end if;
      v_expected_discount := round(v_sum*v_coupon_val)/100;
    else
      v_free_delivery := true; v_expected_discount := 0;
    end if;
    if abs(coalesce(p_discount,0)-v_expected_discount)>0.01 then raise exception 'Promo discount does not match the active offer' using errcode='22023'; end if;
    if v_free_delivery and p_order_type='delivery' and p_delivery_fee<>0 then raise exception 'This promo code provides free delivery' using errcode='22023'; end if;
  elsif p_discount > 0 then
    raise exception 'A valid promo code is required for this discount' using errcode='P0001';
  end if;
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
    select (e ->> 'id')::uuid as pid, sum((e ->> 'q')::int) as qty from jsonb_array_elements(p_items) e where jsonb_typeof(e -> 'byo') is distinct from 'object' group by 1
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
    subtotal, delivery_fee, service_fee, discount, tip, total, payment_method, payment_status, notes, promo_code
  ) values (
    v_code, v_store.business_id, v_uid, p_store_id, v_status, p_scheduled_for, p_order_type,
    case when p_order_type = 'delivery' then p_address else null end,
    left(nullif(trim(p_contact_phone), ''), 32), p_items,
    p_subtotal, p_delivery_fee, p_service_fee, p_discount, p_tip, p_total,
    'cash', 'pay_on_receipt', left(nullif(trim(p_notes), ''), 500), nullif(v_coupon_code, '')
  ) returning goodies_orders.id into v_id;

  if v_promo_id is not null then
    update public.goodies_promotions set redemption_count=redemption_count+1,updated_at=now() where id=v_promo_id;
  end if;
  return query select v_id, v_code, v_status;
end;
$function$
;
revoke all on function public.place_goodies_order(text,text,timestamp with time zone,jsonb,text,jsonb,numeric,numeric,numeric,numeric,numeric,numeric,text,text) from public,anon;
grant execute on function public.place_goodies_order(text,text,timestamp with time zone,jsonb,text,jsonb,numeric,numeric,numeric,numeric,numeric,numeric,text,text) to authenticated;
