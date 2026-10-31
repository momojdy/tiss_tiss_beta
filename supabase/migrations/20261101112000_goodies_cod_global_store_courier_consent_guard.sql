
create or replace function public.goodies_cash_global_enabled()
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(
  select 1 from public.wantiss_cms_content c
  where c.content_key='goodies.content' and c.locale='en' and c.status='published'
    and coalesce(c.payload#>>'{fees,pay,Cash}','0') in ('1','true','TRUE')
 )
$$;
revoke all on function public.goodies_cash_global_enabled() from public,anon;
grant execute on function public.goodies_cash_global_enabled() to authenticated;

create or replace function public.goodies_cash_on_delivery_available(p_store_id text)
returns boolean language sql security definer set search_path=public,pg_temp as $$
 select public.goodies_cash_global_enabled() and coalesce(s.accept_cash_on_delivery,false) and exists(
  select 1 from public.goodies_courier_presence cp
  join public.goodies_courier_roster cr on cr.courier_id=cp.courier_id and cr.is_approved
  where cp.is_available and cp.accepts_cash_on_delivery and cp.updated_at>now()-interval '3 minutes'
   and not exists(select 1 from public.goodies_delivery_assignments a where a.courier_id=cp.courier_id and a.status in ('offered','accepted','picked_up'))
 ) from public.goodies_store_schedules s where s.store_id=p_store_id and s.is_live
$$;

create or replace function public.goodies_require_cash_policy()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare v_store_accepts boolean;v_courier_available boolean;v_payment_context text;
begin
 v_payment_context:=coalesce(current_setting('app.goodies_payment_context',true),'');
 if v_payment_context in ('wallet','card') then return new; end if;
 if lower(coalesce(new.payment_method,''))<>'cash' then return new; end if;
 select coalesce(s.accept_cash_on_delivery,false) into v_store_accepts
 from public.goodies_store_schedules s where s.store_id=new.store_id and s.business_id=new.business_id and s.is_live;
 select exists(
  select 1 from public.goodies_courier_presence cp
  join public.goodies_courier_roster cr on cr.courier_id=cp.courier_id and cr.is_approved
  where cp.is_available and cp.accepts_cash_on_delivery and cp.updated_at>now()-interval '3 minutes'
   and not exists(select 1 from public.goodies_delivery_assignments a where a.courier_id=cp.courier_id and a.status in ('offered','accepted','picked_up'))
 ) into v_courier_available;
 if not public.goodies_cash_global_enabled() or not coalesce(v_store_accepts,false) or not coalesce(v_courier_available,false) then
  raise exception 'Cash on delivery is unavailable. The global policy, store, and an available courier must all permit it.' using errcode='P0001';
 end if;
 return new;
end $$;

create or replace function public.goodies_list_dispatch_couriers(p_order_id uuid)
returns table(courier_id uuid,full_name text,phone_number text,accepts_cash_on_delivery boolean,last_seen timestamptz,distance_km numeric)
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=auth.uid(); v_order public.goodies_orders%rowtype;
begin
 if v_uid is null then raise exception 'Sign in required' using errcode='28000'; end if;
 select * into v_order from public.goodies_orders where id=p_order_id;
 if not found then raise exception 'Order not found' using errcode='P0002'; end if;
 if not (exists(select 1 from public.business_members bm where bm.business_id=v_order.business_id and bm.user_id=v_uid and bm.role in ('owner','admin'))
  or exists(select 1 from public.profiles p where p.id=v_uid and lower(coalesce(p.role,'')) in ('admin','super_admin'))) then raise exception 'Not allowed to view couriers' using errcode='42501'; end if;
 return query
 select p.id,p.full_name,p.phone_number,cp.accepts_cash_on_delivery,cp.updated_at,
  case when cp.last_location_at is null or cp.last_location_at<now()-interval '3 minutes'
      or cp.latitude is null or cp.longitude is null or v_order.store_latitude is null or v_order.store_longitude is null then null::numeric
   else round((6371.0*2.0*asin(sqrt(least(1.0,greatest(0.0,
    power(sin(radians(cp.latitude-v_order.store_latitude)/2.0),2)
    +cos(radians(v_order.store_latitude))*cos(radians(cp.latitude))*power(sin(radians(cp.longitude-v_order.store_longitude)/2.0),2)
   )))))::numeric,1) end
 from public.goodies_courier_presence cp
 join public.goodies_courier_roster cr on cr.courier_id=cp.courier_id and cr.is_approved
 join public.profiles p on p.id=cp.courier_id
 where cp.is_available and cp.updated_at>now()-interval '3 minutes'
  and not exists(select 1 from public.goodies_delivery_assignments busy where busy.courier_id=cp.courier_id and busy.order_id<>p_order_id and busy.status in ('offered','accepted','picked_up'))
  and (coalesce(v_order.payment_method,'wallet')<>'cash' or (
    public.goodies_cash_global_enabled() and cp.accepts_cash_on_delivery and exists(select 1 from public.goodies_store_schedules gs
      where gs.store_id=v_order.store_id and gs.business_id=v_order.business_id and gs.is_live and gs.accept_cash_on_delivery)
  ))
 order by
  case when cp.last_location_at is null or cp.last_location_at<now()-interval '3 minutes'
       or cp.latitude is null or cp.longitude is null or v_order.store_latitude is null or v_order.store_longitude is null then 1 else 0 end,
  case when cp.last_location_at is null or cp.last_location_at<now()-interval '3 minutes'
       or cp.latitude is null or cp.longitude is null or v_order.store_latitude is null or v_order.store_longitude is null then null
   else 6371.0*2.0*asin(sqrt(least(1.0,greatest(0.0,
    power(sin(radians(cp.latitude-v_order.store_latitude)/2.0),2)
    +cos(radians(v_order.store_latitude))*cos(radians(cp.latitude))*power(sin(radians(cp.longitude-v_order.store_longitude)/2.0),2)
   )))) end,
  cp.updated_at desc;
end $$;

create or replace function public.goodies_assign_courier(p_order_id uuid,p_courier_id uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_order public.goodies_orders%rowtype; v_presence public.goodies_courier_presence%rowtype; v_uid uuid:=auth.uid(); v_assignment uuid; v_previous_courier uuid;
begin
 if v_uid is null then raise exception 'Sign in required' using errcode='28000'; end if;
 select * into v_order from public.goodies_orders where id=p_order_id for update;
 if not found or v_order.order_type<>'delivery' then raise exception 'Delivery order not found' using errcode='P0002'; end if;
 if not (exists(select 1 from public.business_members bm where bm.business_id=v_order.business_id and bm.user_id=v_uid and bm.role in ('owner','admin'))
  or exists(select 1 from public.profiles p where p.id=v_uid and lower(coalesce(p.role,'')) in ('admin','super_admin'))) then raise exception 'Not allowed to dispatch this order' using errcode='42501'; end if;
 if v_order.status not in ('ready','courier_assigned') then raise exception 'Order must be ready before courier assignment' using errcode='P0001'; end if;
 if coalesce(v_order.payment_method,'wallet')='cash' and (not public.goodies_cash_global_enabled() or not exists(
   select 1 from public.goodies_store_schedules gs where gs.store_id=v_order.store_id and gs.business_id=v_order.business_id and gs.is_live and gs.accept_cash_on_delivery
 )) then raise exception 'Cash on delivery is disabled globally or by this store' using errcode='42501'; end if;
 select cp.* into v_presence from public.goodies_courier_presence cp
 join public.goodies_courier_roster cr on cr.courier_id=cp.courier_id and cr.is_approved
 where cp.courier_id=p_courier_id and cp.is_available and cp.updated_at>now()-interval '3 minutes'
  and (coalesce(v_order.payment_method,'wallet')<>'cash' or cp.accepts_cash_on_delivery) for update of cp;
 if not found then raise exception 'Courier is unavailable or does not accept cash on delivery' using errcode='P0001'; end if;
 if exists(select 1 from public.goodies_delivery_assignments a where a.courier_id=p_courier_id and a.order_id<>p_order_id and a.status in ('offered','accepted','picked_up')) then
  raise exception 'Courier already has an active delivery or offer' using errcode='P0001'; end if;
 select courier_id into v_previous_courier from public.goodies_delivery_assignments where order_id=p_order_id and status='offered';
 if v_previous_courier is not null and v_previous_courier<>p_courier_id then
  insert into public.notifications(user_id,title,body,feature_name,notification_type,destination,metadata)
  values(v_previous_courier,'Delivery offer reassigned','The store has reassigned order '||v_order.order_code||' to another courier.','Goodies','order','goodies_courier',jsonb_build_object('order_id',v_order.id));
 end if;
 insert into public.goodies_delivery_assignments(order_id,business_id,courier_id,status) values(v_order.id,v_order.business_id,p_courier_id,'offered')
 on conflict(order_id) do update set courier_id=excluded.courier_id,status='offered',offered_at=now(),accepted_at=null,picked_up_at=null,delivered_at=null,latitude=null,longitude=null,location_updated_at=null,updated_at=now()
 returning id into v_assignment;
 update public.goodies_orders set courier_id=p_courier_id,courier_assigned_at=now(),status='courier_assigned',updated_at=now() where id=v_order.id;
 insert into public.notifications(user_id,title,body,feature_name,notification_type,destination,metadata)
 values(p_courier_id,'New Goodies delivery offer','You have a delivery offer for order '||v_order.order_code||'. Open Goodies Courier to accept or decline.','Goodies','order','goodies_courier',jsonb_build_object('order_id',v_order.id,'order_code',v_order.order_code,'assignment_id',v_assignment));
 perform public.goodies_order_notify(v_order.customer_id,'Courier offer sent','A delivery offer has been sent for order '||v_order.order_code||'. We will update you when the courier accepts.',v_order.id,v_order.order_code,'courier_assigned',null);
 return v_assignment;
end $$;

create or replace function public.goodies_courier_respond_assignment(p_order_id uuid,p_accept boolean)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=auth.uid(); v_order public.goodies_orders%rowtype; v_assignment public.goodies_delivery_assignments%rowtype; v_presence public.goodies_courier_presence%rowtype;
begin
 if v_uid is null then raise exception 'Sign in required' using errcode='28000'; end if;
 select * into v_assignment from public.goodies_delivery_assignments where order_id=p_order_id and courier_id=v_uid for update;
 if not found or v_assignment.status<>'offered' then raise exception 'This delivery offer is no longer available' using errcode='P0001'; end if;
 select * into v_order from public.goodies_orders where id=p_order_id for update;
 if not found or v_order.courier_id<>v_uid or v_order.status<>'courier_assigned' then raise exception 'This delivery offer has been reassigned' using errcode='P0001'; end if;
 if not exists(select 1 from public.goodies_courier_roster where courier_id=v_uid and is_approved) then raise exception 'Courier access is no longer active' using errcode='42501'; end if;
 select * into v_presence from public.goodies_courier_presence where courier_id=v_uid for update;
 if p_accept and (not coalesce(v_presence.is_available,false) or v_presence.updated_at<now()-interval '3 minutes'
  or (v_order.payment_method='cash' and (not public.goodies_cash_global_enabled() or not v_presence.accepts_cash_on_delivery or not exists(
   select 1 from public.goodies_store_schedules gs where gs.store_id=v_order.store_id and gs.business_id=v_order.business_id and gs.is_live and gs.accept_cash_on_delivery
  )))) then raise exception 'Your availability or cash-on-delivery eligibility changed. The store must reassign this delivery.' using errcode='P0001'; end if;
 if p_accept and exists(select 1 from public.goodies_delivery_assignments a where a.courier_id=v_uid and a.order_id<>p_order_id and a.status in ('accepted','picked_up')) then
  raise exception 'You already have an active delivery' using errcode='P0001'; end if;
 update public.goodies_delivery_assignments set status=case when p_accept then 'accepted' else 'declined' end,accepted_at=case when p_accept then now() else null end,updated_at=now() where id=v_assignment.id;
 if p_accept then
  update public.goodies_orders set updated_at=now() where id=p_order_id;
  perform public.goodies_order_notify(v_order.customer_id,'Courier accepted your order','Your courier accepted order '||v_order.order_code||' and will head to the store.',v_order.id,v_order.order_code,'courier_assigned',null);
 else
  update public.goodies_orders set courier_id=null,courier_assigned_at=null,status='ready',updated_at=now() where id=p_order_id and courier_id=v_uid;
  perform public.goodies_order_notify(v_order.customer_id,'Courier declined the offer','The courier could not take order '||v_order.order_code||'. The store is finding another courier.',v_order.id,v_order.order_code,'ready',null);
  insert into public.notifications(user_id,title,body,feature_name,notification_type,destination,metadata)
  select bm.user_id,'Courier declined delivery offer','Courier declined order '||v_order.order_code||'. Please assign another available courier.','Goodies','order','business_goodies_orders',jsonb_build_object('order_id',v_order.id,'order_code',v_order.order_code)
  from public.business_members bm where bm.business_id=v_order.business_id;
 end if;
end $$;

revoke all on function public.goodies_cash_global_enabled() from public,anon;
grant execute on function public.goodies_cash_global_enabled() to authenticated;
revoke all on function public.goodies_cash_on_delivery_available(text) from public,anon;
grant execute on function public.goodies_cash_on_delivery_available(text) to authenticated;
