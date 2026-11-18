begin;
-- Keep dispatch, cancellation and courier mutations in order -> assignment lock order.
-- Physical handoffs must be resolved before courier access can be removed.
CREATE OR REPLACE FUNCTION public.goodies_courier_respond_assignment(p_order_id uuid, p_accept boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_order public.goodies_orders%rowtype;
  v_assignment public.goodies_delivery_assignments%rowtype;
  v_presence public.goodies_courier_presence%rowtype;
begin
  if v_uid is null then
    raise exception 'Sign in required' using errcode='28000';
  end if;

  select * into v_order from public.goodies_orders where id = p_order_id for update;
  if not found or v_order.courier_id is distinct from v_uid or v_order.status <> 'courier_assigned'
     or v_order.order_type <> 'delivery' or coalesce(v_order.self_delivery,false) then
    raise exception 'This delivery offer has been reassigned' using errcode='P0001';
  end if;
  perform 1 from public.goodies_courier_roster where courier_id=v_uid and is_approved for share;
  if not found then raise exception 'Courier access is no longer active' using errcode='42501';end if;
  select * into v_assignment from public.goodies_delivery_assignments
  where order_id=p_order_id and courier_id=v_uid for update;
  if not found or v_assignment.status<>'offered' or v_assignment.business_id is distinct from v_order.business_id then
    raise exception 'This delivery offer is no longer available' using errcode='P0001';
  end if;

  if v_assignment.expires_at is not null and v_assignment.expires_at <= now() then
    update public.goodies_delivery_assignments
      set status = 'expired', updated_at = now()
      where id = v_assignment.id;
    update public.goodies_orders
      set courier_id = null, courier_assigned_at = null, status = 'ready', updated_at = now()
      where id = p_order_id and courier_id = v_uid and status = 'courier_assigned';

    perform public.goodies_order_notify(
      v_order.customer_id,
      'Courier offer expired',
      'The courier did not respond to order ' || v_order.order_code || '. The store can assign another courier.',
      v_order.id,
      v_order.order_code,
      'ready',
      null
    );

    insert into public.notifications(user_id,title,body,feature_name,notification_type,destination,metadata)
    values(v_uid,'Delivery offer expired',
      'The offer for order ' || v_order.order_code || ' expired because it was not accepted in time.',
      'Goodies','order','goodies_courier',jsonb_build_object('order_id',v_order.id,'order_code',v_order.order_code));

    insert into public.notifications(user_id,title,body,feature_name,notification_type,destination,metadata)
    select bm.user_id,'Courier offer expired',
      'The courier did not respond to order ' || v_order.order_code || '. Assign another available courier.',
      'Goodies','order','business_goodies_orders',jsonb_build_object('order_id',v_order.id,'order_code',v_order.order_code)
    from public.business_members bm where bm.business_id = v_order.business_id;

    return;
  end if;

  if not exists(select 1 from public.goodies_courier_roster where courier_id = v_uid and is_approved) then
    raise exception 'Courier access is no longer active' using errcode='42501';
  end if;

  select * into v_presence from public.goodies_courier_presence where courier_id = v_uid for update;

  if p_accept and (
    not coalesce(v_presence.is_available,false)
    or v_presence.updated_at < now() - interval '3 minutes'
    or (v_order.payment_method = 'cash' and (
      not public.goodies_cash_global_enabled()
      or not v_presence.accepts_cash_on_delivery
      or not exists(
        select 1 from public.goodies_store_schedules gs
        where gs.store_id = v_order.store_id
          and gs.business_id = v_order.business_id
          and gs.is_live
          and gs.accept_cash_on_delivery
      )
    ))
  ) then
    raise exception 'Your availability or cash-on-delivery eligibility changed. The store must reassign this delivery.' using errcode='P0001';
  end if;

  if p_accept and exists(
    select 1 from public.goodies_delivery_assignments a
    where a.courier_id = v_uid and a.order_id <> p_order_id
      and a.status in ('accepted','picked_up')
  ) then
    raise exception 'You already have an active delivery' using errcode='P0001';
  end if;

  update public.goodies_delivery_assignments
    set status = case when p_accept then 'accepted' else 'declined' end,
        accepted_at = case when p_accept then now() else null end,
        expires_at = null,
        updated_at = now()
    where id = v_assignment.id;

  if p_accept then
    update public.goodies_orders set updated_at = now() where id = p_order_id;
    perform public.goodies_order_notify(
      v_order.customer_id,
      'Courier accepted your order',
      'Your courier accepted order ' || v_order.order_code || ' and will head to the store.',
      v_order.id,v_order.order_code,'courier_assigned',null
    );
  else
    update public.goodies_orders
      set courier_id = null, courier_assigned_at = null, status = 'ready', updated_at = now()
      where id = p_order_id and courier_id = v_uid;

    perform public.goodies_order_notify(
      v_order.customer_id,
      'Courier declined the offer',
      'The courier could not take order ' || v_order.order_code || '. The store is finding another courier.',
      v_order.id,v_order.order_code,'ready',null
    );

    insert into public.notifications(user_id,title,body,feature_name,notification_type,destination,metadata)
    select bm.user_id,'Courier declined delivery offer',
      'Courier declined order ' || v_order.order_code || '. Please assign another available courier.',
      'Goodies','order','business_goodies_orders',jsonb_build_object('order_id',v_order.id,'order_code',v_order.order_code)
    from public.business_members bm where bm.business_id = v_order.business_id;
  end if;
end;
$function$;

create or replace function public.goodies_courier_update_delivery_status(p_order_id uuid,p_status text)
returns void language plpgsql security definer set search_path='' as $function$
declare actor uuid:=auth.uid();o public.goodies_orders%rowtype;a public.goodies_delivery_assignments%rowtype;
begin
 if actor is null then raise exception 'Sign in required' using errcode='28000';end if;
 select * into o from public.goodies_orders where id=p_order_id for update;
 if not found or o.courier_id is distinct from actor or o.order_type<>'delivery' or coalesce(o.self_delivery,false) or o.status not in ('courier_assigned','picked_up') then
  raise exception 'No active delivery assigned to you' using errcode='42501';end if;
 perform 1 from public.goodies_courier_roster where courier_id=actor and is_approved for share;
 if not found then raise exception 'Courier access is no longer active' using errcode='42501';end if;
 select * into a from public.goodies_delivery_assignments where order_id=p_order_id and courier_id=actor for update;
 if not found or a.business_id is distinct from o.business_id then raise exception 'No delivery assigned to you' using errcode='42501';end if;
 if p_status='picked_up' and a.status='accepted' and o.status='courier_assigned' then
  update public.goodies_delivery_assignments set status='picked_up',picked_up_at=now(),updated_at=now() where id=a.id;
  update public.goodies_orders set status='picked_up',picked_up_at=now(),updated_at=now() where id=o.id;
 elsif p_status='delivered' and a.status='picked_up' and o.status='picked_up' then
  update public.goodies_delivery_assignments set status='delivered',delivered_at=now(),updated_at=now() where id=a.id;
  update public.goodies_orders set status='completed',delivered_at=now(),updated_at=now() where id=o.id;
  update public.goodies_courier_presence set is_available=false,updated_at=now() where courier_id=actor;
 else raise exception 'Invalid delivery status transition' using errcode='P0001';end if;
end $function$;

create or replace function public.goodies_courier_update_location(p_order_id uuid,p_latitude double precision,p_longitude double precision,p_accuracy_m double precision default null,p_heading double precision default null,p_speed_mps double precision default null)
returns void language plpgsql security definer set search_path='' as $function$
declare actor uuid:=auth.uid();o public.goodies_orders%rowtype;a public.goodies_delivery_assignments%rowtype;v_accuracy double precision;v_heading double precision;v_speed double precision;
begin
 if actor is null then raise exception 'Sign in required' using errcode='28000';end if;
 if p_latitude is null or p_longitude is null or p_latitude::text in ('NaN','Infinity','-Infinity') or p_longitude::text in ('NaN','Infinity','-Infinity') or p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then raise exception 'Invalid GPS coordinates' using errcode='22023';end if;
 select * into o from public.goodies_orders where id=p_order_id for update;
 if not found or o.courier_id is distinct from actor or o.order_type<>'delivery' or coalesce(o.self_delivery,false) or o.status not in ('courier_assigned','picked_up') then raise exception 'No active delivery assigned to you' using errcode='42501';end if;
 perform 1 from public.goodies_courier_roster where courier_id=actor and is_approved for share;
 if not found then raise exception 'Courier access is no longer active' using errcode='42501';end if;
 select * into a from public.goodies_delivery_assignments where order_id=p_order_id and courier_id=actor for update;
 if not found or a.business_id is distinct from o.business_id or not (a.status='accepted' and o.status='courier_assigned' or a.status='picked_up' and o.status='picked_up') then raise exception 'No active delivery assigned to you' using errcode='42501';end if;
 v_accuracy:=case when p_accuracy_m is null or p_accuracy_m<0 or p_accuracy_m::text in ('NaN','Infinity','-Infinity') then null else least(p_accuracy_m,10000) end;
 v_heading:=case when p_heading>=0 and p_heading<360 and p_heading::text not in ('NaN','Infinity','-Infinity') then p_heading else null end;
 v_speed:=case when p_speed_mps>=0 and p_speed_mps::text not in ('NaN','Infinity','-Infinity') then p_speed_mps else null end;
 update public.goodies_delivery_assignments set latitude=p_latitude,longitude=p_longitude,accuracy_m=v_accuracy,heading=v_heading,speed_mps=v_speed,location_updated_at=now(),updated_at=now() where id=a.id;
 insert into public.goodies_courier_presence(courier_id,is_available,accepts_cash_on_delivery,latitude,longitude,accuracy_m,heading,speed_mps,last_location_at,updated_at)
 values(actor,false,false,p_latitude,p_longitude,v_accuracy,v_heading,v_speed,now(),now())
 on conflict(courier_id) do update set latitude=excluded.latitude,longitude=excluded.longitude,accuracy_m=excluded.accuracy_m,heading=excluded.heading,speed_mps=excluded.speed_mps,last_location_at=now(),updated_at=now();
end $function$;

create or replace function public.goodies_admin_remove_courier(p_courier_id uuid)
returns void language plpgsql security definer set search_path='' as $function$
begin
 perform public.goodies_admin_assert();
 perform 1 from public.goodies_orders where courier_id=p_courier_id and status in ('courier_assigned','picked_up') order by id for update;
 if exists(select 1 from public.goodies_orders o join public.goodies_delivery_assignments a on a.order_id=o.id where o.courier_id=p_courier_id and a.courier_id=p_courier_id and o.status='picked_up' and a.status='picked_up') then
  raise exception 'Resolve the courier delivery before removing access' using errcode='P4213';end if;
 update public.goodies_courier_roster set is_approved=false,updated_at=now() where courier_id=p_courier_id;
 update public.goodies_delivery_assignments set status='cancelled',updated_at=now() where courier_id=p_courier_id and status in ('offered','accepted','picked_up');
 update public.goodies_orders set courier_id=null,courier_assigned_at=null,status='ready',updated_at=now() where courier_id=p_courier_id and status='courier_assigned';
 update public.goodies_courier_presence set is_available=false,updated_at=now() where courier_id=p_courier_id;
end $function$;
revoke all on function public.goodies_courier_respond_assignment(uuid,boolean) from public,anon;
grant execute on function public.goodies_courier_respond_assignment(uuid,boolean) to authenticated;
revoke all on function public.goodies_courier_update_delivery_status(uuid,text) from public,anon;
grant execute on function public.goodies_courier_update_delivery_status(uuid,text) to authenticated;
revoke all on function public.goodies_courier_update_location(uuid,double precision,double precision,double precision,double precision,double precision) from public,anon;
grant execute on function public.goodies_courier_update_location(uuid,double precision,double precision,double precision,double precision,double precision) to authenticated;
revoke all on function public.goodies_admin_remove_courier(uuid) from public,anon;
grant execute on function public.goodies_admin_remove_courier(uuid) to authenticated;

-- Preserve the existing orders projection while supplying the real pickup details
-- required by current couriers. Provider references and payment internals stay private.
create function public.goodies_courier_delivery_details(p_order_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $function$
declare actor uuid:=auth.uid();details jsonb;
begin
 if actor is null then raise exception 'Sign in required' using errcode='28000';end if;
 if not exists(select 1 from public.goodies_courier_roster where courier_id=actor and is_approved) then raise exception 'Courier access is no longer active' using errcode='42501';end if;
 select jsonb_build_object(
  'store_name',coalesce(nullif(trim(s.store_name),''),nullif(trim(s.business_name),''),b.name),
  'store_address',nullif(concat_ws(', ',nullif(trim(s.address),''),nullif(trim(s.city),''),nullif(trim(s.country),'')),''),
  'store_latitude',case
    when o.store_latitude between -90 and 90 and o.store_longitude between -180 and 180 then o.store_latitude
    when s.store_latitude between -90 and 90 and s.store_longitude between -180 and 180 then s.store_latitude end,
  'store_longitude',case
    when o.store_latitude between -90 and 90 and o.store_longitude between -180 and 180 then o.store_longitude
    when s.store_latitude between -90 and 90 and s.store_longitude between -180 and 180 then s.store_longitude end,
  'delivery_latitude',o.delivery_latitude,'delivery_longitude',o.delivery_longitude
 ) into details from public.goodies_orders o
 join public.goodies_delivery_assignments a on a.order_id=o.id and a.business_id=o.business_id and a.courier_id=o.courier_id
 left join public.goodies_store_schedules s on s.business_id=o.business_id and s.store_id=o.store_id
 left join public.businesses b on b.id=o.business_id
 where o.id=p_order_id and o.courier_id=actor and o.order_type='delivery' and not o.self_delivery
  and o.status in ('courier_assigned','picked_up') and a.status in ('offered','accepted','picked_up')
  and (a.status<>'offered' or a.expires_at is null or a.expires_at>now());
 if details is null then raise exception 'No active delivery assigned to you' using errcode='42501';end if;
 return details;
end $function$;
revoke all on function public.goodies_courier_delivery_details(uuid) from public,anon;
grant execute on function public.goodies_courier_delivery_details(uuid) to authenticated;
commit;
