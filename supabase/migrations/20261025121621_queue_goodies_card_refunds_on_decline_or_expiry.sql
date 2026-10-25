-- Queue captured-card refunds for declined, expired, or cancelled orders.
alter table public.goodies_orders add column if not exists payment_refunded_at timestamptz;
CREATE OR REPLACE FUNCTION public.decline_goodies_order(p_order_id uuid, p_reason_code text, p_reason_detail text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_uid uuid:=auth.uid(); v_o public.goodies_orders%rowtype; v_public_reason text; v_item record; v_refunded boolean:=false;
begin
  if v_uid is null then raise exception 'Sign in required' using errcode='28000'; end if;
  if p_reason_code not in ('out_of_stock','too_busy','fulfilment_unavailable','delivery_unavailable','timing_unavailable','other') then raise exception 'Choose a valid decline reason' using errcode='22023'; end if;
  if p_reason_code='other' and length(trim(coalesce(p_reason_detail,'')))<10 then raise exception 'For Other, enter at least 10 characters' using errcode='22023'; end if;
  if length(trim(coalesce(p_reason_detail,'')))>1000 then raise exception 'Decline note is too long' using errcode='22023'; end if;
  select * into v_o from public.goodies_orders where id=p_order_id for update;
  if not found then raise exception 'Order not found' using errcode='P0002'; end if;
  if not exists(select 1 from public.business_members bm where bm.business_id=v_o.business_id and bm.user_id=v_uid) then raise exception 'Not allowed' using errcode='42501'; end if;
  if v_o.status<>'placed' or v_o.acceptance_deadline_at is null or v_o.acceptance_deadline_at<=now() then raise exception 'This order is no longer awaiting a response' using errcode='P0001'; end if;
  v_public_reason:=case p_reason_code
    when 'out_of_stock' then 'One or more items are unavailable.'
    when 'too_busy' then 'The store is unable to prepare orders right now.'
    when 'fulfilment_unavailable' then 'The store cannot fulfil this order.'
    when 'delivery_unavailable' then 'Delivery is unavailable for this order.'
    when 'timing_unavailable' then 'The store cannot fulfil the order at the requested time.'
    else 'The store is unable to accept this order right now.' end;
  update public.goodies_orders set status='declined',declined_at=now(),decline_reason_code=p_reason_code,
    decline_reason_internal=nullif(trim(p_reason_detail),''),decline_reason_public=v_public_reason,updated_at=now() where id=p_order_id;
  for v_item in select (e->>'id')::uuid product_id,sum((e->>'q')::integer) qty from jsonb_array_elements(v_o.items) e
    where (e->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' and (e->>'q') ~ '^[0-9]+$' group by 1 loop
    update public.goodies_products set stock=least(stock+v_item.qty,100000),updated_at=now() where id=v_item.product_id and business_id=v_o.business_id;
  end loop;
  if v_o.payment_method='card' and v_o.payment_status='paid' then update public.goodies_orders set payment_status='refund_pending' where id=v_o.id; end if;
  v_refunded:=public.refund_goodies_wallet_order(v_o.id,'vendor_declined');
  perform public.goodies_order_notify(v_o.customer_id,'Store declined your Goodies order',
    'The store could not accept order '||v_o.order_code||'. '||v_public_reason||
    case when v_refunded then ' Your payment was refunded to your Wantiss wallet.' when v_o.payment_method='card' and v_o.payment_status='paid' then ' Your card refund is being processed.' else ' You were not charged for this order.' end,
    v_o.id,v_o.order_code,'declined',p_reason_code);
  return 'declined';
end; $function$
;
CREATE OR REPLACE FUNCTION public.expire_unaccepted_goodies_orders()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_o public.goodies_orders%rowtype; v_item record; v_count integer:=0; v_member record; v_refunded boolean;
begin
  for v_o in select * from public.goodies_orders where status='scheduled' and scheduled_for is not null and scheduled_for<=now() for update skip locked loop
    update public.goodies_orders set status='placed',acceptance_deadline_at=now()+interval '15 minutes',updated_at=now() where id=v_o.id;
    perform public.goodies_order_notify(v_o.customer_id,'Scheduled Goodies order is due','Your scheduled order '||v_o.order_code||' is now due and awaiting the store.',v_o.id,v_o.order_code,'placed',null);
    for v_member in select bm.user_id from public.business_members bm where bm.business_id=v_o.business_id loop
      perform public.goodies_order_notify(v_member.user_id,'Scheduled Goodies order is due','Order '||v_o.order_code||' is ready for a response within 15 minutes.',v_o.id,v_o.order_code,'placed',null);
    end loop;
  end loop;
  for v_o in select * from public.goodies_orders where status='placed' and acceptance_deadline_at is not null and acceptance_deadline_at<=now() for update skip locked loop
    update public.goodies_orders set status='expired',updated_at=now() where id=v_o.id;
    for v_item in select (e->>'id')::uuid product_id,sum((e->>'q')::integer) qty from jsonb_array_elements(v_o.items) e
      where (e->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' and (e->>'q') ~ '^[0-9]+$' group by 1 loop
      update public.goodies_products set stock=least(stock+v_item.qty,100000),updated_at=now() where id=v_item.product_id and business_id=v_o.business_id;
    end loop;
    if v_o.payment_method='card' and v_o.payment_status='paid' then update public.goodies_orders set payment_status='refund_pending' where id=v_o.id; end if;
    v_refunded:=public.refund_goodies_wallet_order(v_o.id,'vendor_timeout');
    perform public.goodies_order_notify(v_o.customer_id,'Goodies order expired',
      'The store did not respond within 15 minutes, so order '||v_o.order_code||' was cancelled.'||
      case when v_refunded then ' Your payment was refunded to your Wantiss wallet.' when v_o.payment_method='card' and v_o.payment_status='paid' then ' Your card refund is being processed.' else ' You were not charged for this order.' end,
      v_o.id,v_o.order_code,'expired',null);
    v_count:=v_count+1;
  end loop;
  return v_count;
end; $function$
;
