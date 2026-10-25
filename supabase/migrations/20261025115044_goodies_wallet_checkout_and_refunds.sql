create or replace function public.place_goodies_order_with_wallet(
  p_store_id text,p_order_type text,p_scheduled_for timestamptz,p_address jsonb,p_contact_phone text,
  p_items jsonb,p_subtotal numeric,p_delivery_fee numeric,p_service_fee numeric,p_discount numeric,p_tip numeric,p_total numeric,p_notes text
)
returns table(id uuid,order_code text,status text)
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=auth.uid(); v_wallet_id uuid; v_balance numeric; v_id uuid; v_code text; v_status text;
begin
  if v_uid is null then raise exception 'Sign in to place an order' using errcode='28000'; end if;
  if p_total is null or p_total<=0 then raise exception 'Invalid order total' using errcode='22023'; end if;
  select w.id,w.balance into v_wallet_id,v_balance from public.wallets w where w.user_id=v_uid for update;
  if not found then raise exception 'No Wantiss wallet found. Create your wallet to pay with it.' using errcode='P0002'; end if;
  if v_balance<p_total then raise exception 'Insufficient Wantiss wallet balance. Add funds or choose another payment method.' using errcode='P0001'; end if;
  select o.id,o.order_code,o.status into v_id,v_code,v_status
  from public.place_goodies_order(p_store_id,p_order_type,p_scheduled_for,p_address,p_contact_phone,p_items,p_subtotal,p_delivery_fee,p_service_fee,p_discount,p_tip,p_total,p_notes) o;
  update public.wallets set balance=balance-p_total,updated_at=now() where id=v_wallet_id;
  insert into public.wallet_transactions(user_id,amount,description,status,wallet_amount,wallet_currency,feature_name,activity_type,direction,reference_id,metadata)
  values(v_uid,p_total,'Goodies order '||v_code,'completed',p_total,'USD','Goodies','goodies_order_payment','debit',v_id::text,jsonb_build_object('order_id',v_id,'order_code',v_code));
  update public.goodies_orders set payment_method='wallet',payment_status='paid',updated_at=now() where id=v_id;
  return query select v_id,v_code,v_status;
end $$;

create or replace function public.refund_goodies_wallet_order(p_order_id uuid,p_reason text)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_o public.goodies_orders%rowtype; v_wallet_id uuid;
begin
  select * into v_o from public.goodies_orders where id=p_order_id for update;
  if not found or v_o.payment_method<>'wallet' or v_o.payment_status<>'paid' then return false; end if;
  if exists(select 1 from public.wallet_transactions where reference_id=v_o.id::text and activity_type='goodies_order_refund' and direction='credit') then return false; end if;
  select id into v_wallet_id from public.wallets where user_id=v_o.customer_id for update;
  if not found then raise exception 'Customer wallet is missing; manual refund required' using errcode='P0001'; end if;
  update public.wallets set balance=balance+v_o.total,updated_at=now() where id=v_wallet_id;
  insert into public.wallet_transactions(user_id,amount,description,status,wallet_amount,wallet_currency,feature_name,activity_type,direction,reference_id,metadata)
  values(v_o.customer_id,v_o.total,'Refund for Goodies order '||v_o.order_code,'completed',v_o.total,'USD','Goodies','goodies_order_refund','credit',v_o.id::text,jsonb_build_object('order_id',v_o.id,'order_code',v_o.order_code,'reason',left(coalesce(p_reason,''),120)));
  update public.goodies_orders set payment_status='refunded',updated_at=now() where id=v_o.id;
  return true;
end $$;
revoke all on function public.place_goodies_order_with_wallet(text,text,timestamptz,jsonb,text,jsonb,numeric,numeric,numeric,numeric,numeric,numeric,text) from public,anon;
grant execute on function public.place_goodies_order_with_wallet(text,text,timestamptz,jsonb,text,jsonb,numeric,numeric,numeric,numeric,numeric,numeric,text) to authenticated;
revoke all on function public.refund_goodies_wallet_order(uuid,text) from public,anon,authenticated;

create or replace function public.decline_goodies_order(p_order_id uuid,p_reason_code text,p_reason_detail text default null)
returns text language plpgsql security definer set search_path=public,pg_temp as $$
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
  v_public_reason:=case p_reason_code when 'out_of_stock' then 'One or more items are unavailable.' when 'too_busy' then 'The store is unable to prepare orders right now.' when 'fulfilment_unavailable' then 'The store cannot fulfil this order.' when 'delivery_unavailable' then 'Delivery is unavailable for this order.' when 'timing_unavailable' then 'The store cannot fulfil the order at the requested time.' else 'The store is unable to accept this order right now.' end;
  update public.goodies_orders set status='declined',declined_at=now(),decline_reason_code=p_reason_code,decline_reason_internal=nullif(trim(p_reason_detail),''),decline_reason_public=v_public_reason,updated_at=now() where id=p_order_id;
  for v_item in select (e->>'id')::uuid product_id,sum((e->>'q')::integer) qty from jsonb_array_elements(v_o.items) e where (e->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' and (e->>'q') ~ '^[0-9]+$' group by 1 loop
    update public.goodies_products set stock=least(stock+v_item.qty,100000),updated_at=now() where id=v_item.product_id and business_id=v_o.business_id;
  end loop;
  v_refunded:=public.refund_goodies_wallet_order(v_o.id,'vendor_declined');
  perform public.goodies_order_notify(v_o.customer_id,'Store declined your Goodies order','The store could not accept order '||v_o.order_code||'. '||v_public_reason||case when v_refunded then ' Your payment was refunded to your Wantiss wallet.' else ' You were not charged for this order.' end,v_o.id,v_o.order_code,'declined',p_reason_code);
  return 'declined';
end $$;
revoke all on function public.decline_goodies_order(uuid,text,text) from public,anon;
grant execute on function public.decline_goodies_order(uuid,text,text) to authenticated;

create or replace function public.expire_unaccepted_goodies_orders()
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
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
    for v_item in select (e->>'id')::uuid product_id,sum((e->>'q')::integer) qty from jsonb_array_elements(v_o.items) e where (e->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' and (e->>'q') ~ '^[0-9]+$' group by 1 loop
      update public.goodies_products set stock=least(stock+v_item.qty,100000),updated_at=now() where id=v_item.product_id and business_id=v_o.business_id;
    end loop;
    v_refunded:=public.refund_goodies_wallet_order(v_o.id,'vendor_timeout');
    perform public.goodies_order_notify(v_o.customer_id,'Goodies order expired','The store did not respond within 15 minutes, so order '||v_o.order_code||' was cancelled.'||case when v_refunded then ' Your payment was refunded to your Wantiss wallet.' else ' You were not charged for this order.' end,v_o.id,v_o.order_code,'expired',null);
    v_count:=v_count+1;
  end loop;
  return v_count;
end $$;
revoke all on function public.expire_unaccepted_goodies_orders() from public,anon,authenticated;
grant execute on function public.expire_unaccepted_goodies_orders() to service_role;
