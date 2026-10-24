-- Server-side Goodies order placement and status transitions.
-- Replaces direct client INSERT/UPDATE on public.goodies_orders so the server
-- validates the store, fulfilment mode, scheduling window, totals and transitions.
-- Only cash on delivery/pickup is accepted: no payment provider is connected, and
-- the wallet/card/MonCash flows in the app are simulated.
-- NOTE: unit prices still come from the client because Goodies has no server-side
-- catalog table yet. Arithmetic consistency and bounds are enforced; per-item price
-- authenticity requires a catalog table (not in this migration).

create or replace function public.place_goodies_order(
  p_store_id text,
  p_order_type text,
  p_scheduled_for timestamptz,
  p_address jsonb,
  p_contact_phone text,
  p_items jsonb,
  p_subtotal numeric,
  p_delivery_fee numeric,
  p_service_fee numeric,
  p_discount numeric,
  p_tip numeric,
  p_total numeric,
  p_notes text
)
returns table (id uuid, order_code text, status text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_store public.goodies_store_schedules%rowtype;
  v_status text;
  v_code text;
  v_id uuid;
  v_sum numeric := 0;
  v_item jsonb;
  v_q numeric;
  v_p numeric;
  v_tries int := 0;
begin
  if v_uid is null then
    raise exception 'Sign in to place an order' using errcode = '28000';
  end if;

  select * into v_store from public.goodies_store_schedules s
   where s.store_id = p_store_id and s.is_live = true;
  if not found then
    raise exception 'This store is not accepting online orders yet' using errcode = 'P0001';
  end if;

  if p_order_type not in ('delivery', 'pickup') then
    raise exception 'Invalid order type' using errcode = '22023';
  end if;
  if coalesce(array_length(v_store.delivery_modes, 1), 0) > 0
     and not exists (select 1 from unnest(v_store.delivery_modes) m where lower(m) = p_order_type) then
    raise exception 'This store does not offer %', p_order_type using errcode = 'P0001';
  end if;
  if p_order_type = 'delivery' and (p_address is null or jsonb_typeof(p_address) <> 'object') then
    raise exception 'A delivery address is required' using errcode = '22023';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 100 then
    raise exception 'Cart must contain between 1 and 100 lines' using errcode = '22023';
  end if;
  for v_item in select * from jsonb_array_elements(p_items) loop
    begin
      v_q := (v_item ->> 'q')::numeric;
      v_p := (v_item ->> 'p')::numeric;
    exception when others then
      raise exception 'Invalid cart line' using errcode = '22023';
    end;
    if v_q is null or v_p is null or v_q < 1 or v_q > 99 or v_q <> trunc(v_q) or v_p < 0 or v_p > 100000 then
      raise exception 'Invalid cart line' using errcode = '22023';
    end if;
    v_sum := v_sum + v_p * v_q;
  end loop;

  if p_delivery_fee is null or p_service_fee is null or p_discount is null or p_tip is null
     or p_subtotal is null or p_total is null
     or p_delivery_fee < 0 or p_service_fee < 0 or p_discount < 0 or p_tip < 0 then
    raise exception 'Invalid order totals' using errcode = '22023';
  end if;
  if p_order_type = 'pickup' and (p_delivery_fee <> 0 or p_tip <> 0) then
    raise exception 'Invalid order totals' using errcode = '22023';
  end if;
  if abs(v_sum - p_subtotal) > 0.01
     or p_discount > p_subtotal
     or abs((p_subtotal + p_delivery_fee + p_service_fee - p_discount + p_tip) - p_total) > 0.01 then
    raise exception 'Order totals do not match the cart' using errcode = '22023';
  end if;

  if p_scheduled_for is not null then
    if not v_store.accept_scheduled_orders then
      raise exception 'This store does not accept scheduled orders' using errcode = 'P0001';
    end if;
    if p_scheduled_for < now() + make_interval(mins => v_store.scheduled_order_start_minutes) then
      raise exception 'Choose a later time for a scheduled order' using errcode = 'P0001';
    end if;
    if p_scheduled_for > now() + interval '30 days' then
      raise exception 'Scheduled time is too far ahead' using errcode = 'P0001';
    end if;
    v_status := 'scheduled';
  else
    v_status := 'placed';
  end if;

  loop
    v_code := 'GD' || lpad((floor(random() * 1000000))::int::text, 6, '0');
    exit when not exists (select 1 from public.goodies_orders o where o.order_code = v_code);
    v_tries := v_tries + 1;
    if v_tries > 20 then raise exception 'Could not allocate an order code' using errcode = 'P0001'; end if;
  end loop;

  insert into public.goodies_orders (
    order_code, business_id, customer_id, store_id, status, scheduled_for, order_type,
    address, contact_phone, items, subtotal, delivery_fee, service_fee, discount, tip, total,
    payment_method, payment_status, notes
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
begin
  if v_uid is null then
    raise exception 'Sign in required' using errcode = '28000';
  end if;
  select * into v_o from public.goodies_orders where goodies_orders.id = p_order_id for update;
  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;
  select exists (select 1 from public.business_members bm where bm.business_id = v_o.business_id and bm.user_id = v_uid) into v_member;

  if p_status = 'cancelled' then
    -- Customers may cancel before the store accepts; store members until it is ready.
    if v_o.customer_id = v_uid and v_o.status in ('scheduled', 'placed') then null;
    elsif v_member and v_o.status in ('scheduled', 'placed', 'accepted', 'preparing') then null;
    else raise exception 'This order can no longer be cancelled' using errcode = 'P0001';
    end if;
  else
    if not v_member then
      raise exception 'Not allowed' using errcode = '42501';
    end if;
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

-- Close the direct-write bypass: all writes now go through the functions above.
revoke insert, update on public.goodies_orders from authenticated;
revoke update (status, updated_at) on public.goodies_orders from authenticated;
grant select on public.goodies_orders to authenticated;
