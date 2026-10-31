-- Keep restaurant-selected cancellation reasons private from customer order reads.
create table if not exists public.goodies_order_cancellation_private (
  order_id uuid primary key references public.goodies_orders(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  reason_code text not null check (reason_code in (
    'out_of_stock','too_busy','fulfilment_unavailable',
    'delivery_unavailable','timing_unavailable','other'
  )),
  reason_detail text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  constraint goodies_order_cancellation_private_other_detail_check
    check (reason_code <> 'other' or length(trim(coalesce(reason_detail,''))) >= 10),
  constraint goodies_order_cancellation_private_detail_length_check
    check (length(coalesce(reason_detail,'')) <= 1000)
);
alter table public.goodies_order_cancellation_private enable row level security;
revoke all on public.goodies_order_cancellation_private from public, anon;
grant select on public.goodies_order_cancellation_private to authenticated;
grant all on public.goodies_order_cancellation_private to service_role;
drop policy if exists "Store members can view private cancellation reasons"
  on public.goodies_order_cancellation_private;
create policy "Store members can view private cancellation reasons"
  on public.goodies_order_cancellation_private
  for select to authenticated
  using (
    exists (
      select 1 from public.business_members bm
       where bm.business_id = goodies_order_cancellation_private.business_id
         and bm.user_id = (select auth.uid())
    )
  );

drop function if exists public.cancel_goodies_order_by_store(uuid,text,text);
alter table public.goodies_orders
  drop column if exists cancellation_reason_code,
  drop column if exists cancellation_reason_internal;

create function public.cancel_goodies_order_by_store(
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

  insert into public.goodies_order_cancellation_private(
    order_id,business_id,reason_code,reason_detail,created_by
  ) values (
    v_o.id,v_o.business_id,p_reason_code,nullif(trim(p_reason_detail),''),v_uid
  );

  update public.goodies_orders
     set status = 'cancelled',
         cancelled_at = now(),
         cancelled_by = v_uid,
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
    v_o.id, v_o.order_code, 'cancelled', null
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
