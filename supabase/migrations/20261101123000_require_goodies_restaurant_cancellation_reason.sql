-- Require a reason for restaurant-initiated Goodies cancellations.
alter table public.goodies_orders
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid references auth.users(id),
  add column if not exists cancellation_reason_code text,
  add column if not exists cancellation_reason_internal text,
  add column if not exists cancellation_reason_public text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.goodies_orders'::regclass
      and conname='goodies_orders_cancellation_reason_code_check'
  ) then
    alter table public.goodies_orders
      add constraint goodies_orders_cancellation_reason_code_check
      check (cancellation_reason_code is null or cancellation_reason_code = any (
        array['out_of_stock','too_busy','fulfilment_unavailable',
              'delivery_unavailable','timing_unavailable','other']::text[]
      ));
  end if;
end $$;

-- The legacy status RPC remains available for customer pre-acceptance
-- cancellation and ordinary store status transitions, but cannot be used
-- by a store member to bypass the reason-required cancellation RPC.
do $migration$
declare
  v_definition text;
  v_old text := $old$    elsif v_member and v_o.status in ('scheduled', 'placed', 'accepted', 'preparing') then
      null;$old$;
  v_new text := $new$    elsif v_member and v_o.status in ('scheduled', 'placed', 'accepted', 'preparing') then
      raise exception 'Restaurant cancellations must include a reason' using errcode = 'P0001';$new$;
begin
  v_definition := pg_get_functiondef(
    'public.set_goodies_order_status(uuid,text)'::regprocedure
  );
  if position(v_old in v_definition) = 0 then
    raise exception 'Could not locate the existing merchant cancellation permission branch';
  end if;
  v_definition := replace(v_definition, v_old, v_new);
  execute v_definition;
end
$migration$;

create or replace function public.cancel_goodies_order_by_store(
  p_order_id uuid,
  p_reason_code text,
  p_reason_detail text default null
) returns text
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $function$
declare
  v_uid uuid := auth.uid();
  v_o public.goodies_orders%rowtype;
  v_item record;
  v_member boolean;
  v_refunded boolean := false;
  v_public_reason text := 'The restaurant had to cancel this order. We’re sorry for the inconvenience.';
  v_customer_body text;
  v_store_member record;
begin
  if v_uid is null then
    raise exception 'Sign in required' using errcode = '28000';
  end if;

  if p_reason_code is null or p_reason_code not in (
    'out_of_stock','too_busy','fulfilment_unavailable',
    'delivery_unavailable','timing_unavailable','other'
  ) then
    raise exception 'Choose a valid cancellation reason' using errcode = '22023';
  end if;
  if p_reason_code = 'other' and length(trim(coalesce(p_reason_detail,''))) < 10 then
    raise exception 'For Other, enter at least 10 characters' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_reason_detail,''))) > 1000 then
    raise exception 'Cancellation note is too long' using errcode = '22023';
  end if;

  select * into v_o
    from public.goodies_orders
   where id = p_order_id
   for update;
  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  select exists (
    select 1 from public.business_members bm
     where bm.business_id = v_o.business_id and bm.user_id = v_uid
  ) into v_member;
  if not v_member then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if v_o.status not in ('scheduled','placed','accepted','preparing') then
    raise exception 'This order can no longer be cancelled' using errcode = 'P0001';
  end if;

  update public.goodies_orders
     set status = 'cancelled',
         cancelled_at = now(),
         cancelled_by = v_uid,
         cancellation_reason_code = p_reason_code,
         cancellation_reason_internal = nullif(trim(p_reason_detail),''),
         cancellation_reason_public = v_public_reason,
         updated_at = now()
   where id = v_o.id;

  for v_item in
    select (e->>'id')::uuid as product_id, sum((e->>'q')::integer) as qty
      from jsonb_array_elements(v_o.items) e
     where (e->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       and (e->>'q') ~ '^[0-9]+$'
     group by 1
  loop
    update public.goodies_products
       set stock = least(stock + v_item.qty, 100000), updated_at = now()
     where id = v_item.product_id and business_id = v_o.business_id;
  end loop;

  v_refunded := public.refund_goodies_wallet_order(v_o.id, 'restaurant_cancelled');

  v_customer_body := v_public_reason ||
    case
      when v_refunded then ' Your payment was refunded to your Wantiss wallet.'
      when v_o.payment_method = 'card' and v_o.payment_status in ('paid','refund_pending','partially_refunded')
        then ' Your card refund is being processed.'
      when v_o.payment_method = 'wallet' and v_o.payment_status = 'paid'
        then ' Your wallet payment needs support review.'
      else ' No wallet refund was needed.'
    end;

  perform public.goodies_order_notify(
    v_o.customer_id,
    'Restaurant cancelled your Goodies order',
    'Order ' || v_o.order_code || ' was cancelled. ' || v_customer_body,
    v_o.id, v_o.order_code, 'cancelled', p_reason_code
  );

  for v_store_member in
    select bm.user_id
      from public.business_members bm
     where bm.business_id = v_o.business_id and bm.user_id <> v_uid
  loop
    perform public.goodies_order_notify(
      v_store_member.user_id,
      'Goodies order cancelled',
      'Order ' || v_o.order_code || ' was cancelled by your store.',
      v_o.id, v_o.order_code, 'cancelled', p_reason_code
    );
  end loop;

  return 'cancelled';
end;
$function$;

revoke all on function public.cancel_goodies_order_by_store(uuid,text,text) from public, anon;
grant execute on function public.cancel_goodies_order_by_store(uuid,text,text) to authenticated;
