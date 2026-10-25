-- Goodies order acceptance SLA and safe customer-facing decline notifications.
alter table public.goodies_orders
  add column if not exists acceptance_deadline_at timestamptz,
  add column if not exists accepted_at timestamptz,
  add column if not exists declined_at timestamptz,
  add column if not exists decline_reason_code text,
  add column if not exists decline_reason_internal text,
  add column if not exists decline_reason_public text;

alter table public.goodies_orders drop constraint if exists goodies_orders_status_check;
alter table public.goodies_orders add constraint goodies_orders_status_check
  check (status = any (array['scheduled','placed','accepted','preparing','ready','completed','cancelled','declined','expired']::text[]));
alter table public.goodies_orders drop constraint if exists goodies_orders_decline_reason_code_check;
alter table public.goodies_orders add constraint goodies_orders_decline_reason_code_check
  check (decline_reason_code is null or decline_reason_code = any (array['out_of_stock','too_busy','fulfilment_unavailable','delivery_unavailable','timing_unavailable','other']::text[]));
create index if not exists goodies_orders_acceptance_deadline_idx on public.goodies_orders (acceptance_deadline_at) where status = 'placed';

create or replace function public.goodies_order_notify(p_user_id uuid,p_title text,p_body text,p_order_id uuid,p_order_code text,p_status text,p_reason_code text default null)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if p_user_id is null then return; end if;
  insert into public.notifications(user_id,vendor_id,title,body,notification_type,feature_name,destination,metadata)
  values(p_user_id,null,left(p_title,120),left(p_body,1000),'goodies_order','Goodies','goodies/orders',
    jsonb_strip_nulls(jsonb_build_object('order_id',p_order_id,'order_code',p_order_code,'status',p_status,'reason_code',p_reason_code)));
end; $$;
revoke all on function public.goodies_order_notify(uuid,text,text,uuid,text,text,text) from public,anon,authenticated;

create or replace function public.goodies_order_after_insert()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare v_member record;
begin
  if new.status='placed' then
    update public.goodies_orders set acceptance_deadline_at=coalesce(new.acceptance_deadline_at,now()+interval '15 minutes') where id=new.id;
  end if;
  perform public.goodies_order_notify(new.customer_id,'Goodies order placed',
    'Your order '||new.order_code||' was sent to the store. The store has 15 minutes to respond.',new.id,new.order_code,new.status,null);
  for v_member in select bm.user_id from public.business_members bm where bm.business_id=new.business_id loop
    perform public.goodies_order_notify(v_member.user_id,'New Goodies order',
      'Order '||new.order_code||' needs a response within 15 minutes.',new.id,new.order_code,new.status,null);
  end loop;
  return new;
end; $$;
drop trigger if exists goodies_order_after_insert on public.goodies_orders;
create trigger goodies_order_after_insert after insert on public.goodies_orders for each row execute function public.goodies_order_after_insert();

create or replace function public.accept_goodies_order(p_order_id uuid)
returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=auth.uid(); v_o public.goodies_orders%rowtype;
begin
  if v_uid is null then raise exception 'Sign in required' using errcode='28000'; end if;
  select * into v_o from public.goodies_orders where id=p_order_id for update;
  if not found then raise exception 'Order not found' using errcode='P0002'; end if;
  if not exists(select 1 from public.business_members bm where bm.business_id=v_o.business_id and bm.user_id=v_uid) then raise exception 'Not allowed' using errcode='42501'; end if;
  if v_o.status<>'placed' then raise exception 'This order is no longer awaiting a response' using errcode='P0001'; end if;
  if v_o.acceptance_deadline_at is null or v_o.acceptance_deadline_at<=now() then raise exception 'The 15-minute acceptance window has expired' using errcode='P0001'; end if;
  update public.goodies_orders set status='accepted',accepted_at=now(),updated_at=now() where id=p_order_id;
  perform public.goodies_order_notify(v_o.customer_id,'Goodies order accepted','The store accepted order '||v_o.order_code||' and is preparing it.',v_o.id,v_o.order_code,'accepted',null);
  return 'accepted';
end; $$;

create or replace function public.decline_goodies_order(p_order_id uuid,p_reason_code text,p_reason_detail text default null)
returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=auth.uid(); v_o public.goodies_orders%rowtype; v_public_reason text; v_item record;
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
  perform public.goodies_order_notify(v_o.customer_id,'Store declined your Goodies order',
    'The store could not accept order '||v_o.order_code||'. '||v_public_reason||' You were not charged for this order.',
    v_o.id,v_o.order_code,'declined',p_reason_code);
  return 'declined';
end; $$;

create or replace function public.expire_unaccepted_goodies_orders()
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare v_o public.goodies_orders%rowtype; v_item record; v_count integer:=0; v_member record;
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
    perform public.goodies_order_notify(v_o.customer_id,'Goodies order expired','The store did not respond within 15 minutes, so order '||v_o.order_code||' was cancelled. You were not charged.',v_o.id,v_o.order_code,'expired',null);
    v_count:=v_count+1;
  end loop;
  return v_count;
end; $$;

revoke all on function public.accept_goodies_order(uuid) from public,anon;
revoke all on function public.decline_goodies_order(uuid,text,text) from public,anon;
grant execute on function public.accept_goodies_order(uuid) to authenticated;
grant execute on function public.decline_goodies_order(uuid,text,text) to authenticated;
revoke all on function public.expire_unaccepted_goodies_orders() from public,anon,authenticated;
grant execute on function public.expire_unaccepted_goodies_orders() to service_role;
