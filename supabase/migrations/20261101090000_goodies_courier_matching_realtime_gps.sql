-- Online courier GPS, nearest eligible courier ranking, offer notifications and Realtime.
create or replace function public.goodies_courier_update_presence_location(
 p_latitude double precision,p_longitude double precision,p_accuracy_m double precision default null,
 p_heading double precision default null,p_speed_mps double precision default null
) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'Sign in required' using errcode='28000'; end if;
 if p_latitude is null or p_longitude is null or p_latitude not between -90 and 90 or p_longitude not between -180 and 180
  or (p_accuracy_m is not null and (p_accuracy_m<0 or p_accuracy_m>10000))
  or (p_heading is not null and (p_heading<0 or p_heading>=360))
  or (p_speed_mps is not null and p_speed_mps<0) then raise exception 'Invalid GPS coordinates or motion data' using errcode='22023'; end if;
 if not exists(select 1 from public.profiles p where p.id=v_uid and lower(coalesce(p.role,'')) in ('courier','driver','delivery')) then raise exception 'Courier access is required' using errcode='42501'; end if;
 update public.goodies_courier_presence set latitude=p_latitude,longitude=p_longitude,accuracy_m=p_accuracy_m,heading=p_heading,speed_mps=p_speed_mps,last_location_at=now(),updated_at=now()
 where courier_id=v_uid and is_available=true;
 if not found then raise exception 'Go online before sharing your location' using errcode='P0001'; end if;
end $$;
revoke all on function public.goodies_courier_update_presence_location(double precision,double precision,double precision,double precision,double precision) from public,anon;
grant execute on function public.goodies_courier_update_presence_location(double precision,double precision,double precision,double precision,double precision) to authenticated;

drop function if exists public.goodies_list_dispatch_couriers(uuid);
create function public.goodies_list_dispatch_couriers(p_order_id uuid)
returns table(courier_id uuid,full_name text,phone_number text,accepts_cash_on_delivery boolean,last_seen timestamptz,distance_km numeric)
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=auth.uid(); v_order public.goodies_orders%rowtype;
begin
 if v_uid is null then raise exception 'Sign in required' using errcode='28000'; end if;
 select * into v_order from public.goodies_orders where id=p_order_id;
 if not found then raise exception 'Order not found' using errcode='P0002'; end if;
 if not (exists(select 1 from public.business_members bm where bm.business_id=v_order.business_id and bm.user_id=v_uid and bm.role in ('owner','admin'))
  or exists(select 1 from public.profiles p where p.id=v_uid and lower(coalesce(p.role,'')) in ('admin','super_admin'))) then raise exception 'Not allowed to view couriers' using errcode='42501'; end if;
 return query select p.id,p.full_name,p.phone_number,cp.accepts_cash_on_delivery,cp.updated_at,
  case when cp.latitude is null or cp.longitude is null or v_order.store_latitude is null or v_order.store_longitude is null then null::numeric
  else round((6371.0*2.0*asin(sqrt(least(1.0,greatest(0.0,power(sin(radians(cp.latitude-v_order.store_latitude)/2.0),2)
   +cos(radians(v_order.store_latitude))*cos(radians(cp.latitude))*power(sin(radians(cp.longitude-v_order.store_longitude)/2.0),2))))))::numeric,1) end
 from public.goodies_courier_presence cp join public.profiles p on p.id=cp.courier_id
 where cp.is_available and cp.updated_at>now()-interval '3 minutes' and lower(coalesce(p.role,'')) in ('courier','driver','delivery')
  and (coalesce(v_order.payment_method,'wallet')<>'cash' or cp.accepts_cash_on_delivery)
 order by case when cp.latitude is null or cp.longitude is null or v_order.store_latitude is null or v_order.store_longitude is null then 1 else 0 end,
  case when cp.latitude is null or cp.longitude is null or v_order.store_latitude is null or v_order.store_longitude is null then null
   else 6371.0*2.0*asin(sqrt(least(1.0,greatest(0.0,power(sin(radians(cp.latitude-v_order.store_latitude)/2.0),2)
   +cos(radians(v_order.store_latitude))*cos(radians(cp.latitude))*power(sin(radians(cp.longitude-v_order.store_longitude)/2.0),2))))) end,
  cp.updated_at desc;
end $$;

create or replace function public.goodies_assign_courier(p_order_id uuid,p_courier_id uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_order public.goodies_orders%rowtype; v_presence public.goodies_courier_presence%rowtype; v_uid uuid:=auth.uid(); v_assignment uuid;
begin
 if v_uid is null then raise exception 'Sign in required' using errcode='28000'; end if;
 select * into v_order from public.goodies_orders where id=p_order_id for update;
 if not found or v_order.order_type<>'delivery' then raise exception 'Delivery order not found' using errcode='P0002'; end if;
 if not (exists(select 1 from public.business_members bm where bm.business_id=v_order.business_id and bm.user_id=v_uid and bm.role in ('owner','admin'))
  or exists(select 1 from public.profiles p where p.id=v_uid and lower(coalesce(p.role,'')) in ('admin','super_admin'))) then raise exception 'Not allowed to dispatch this order' using errcode='42501'; end if;
 if v_order.status not in ('ready','courier_assigned') then raise exception 'Order must be ready before courier assignment' using errcode='P0001'; end if;
 select * into v_presence from public.goodies_courier_presence cp where cp.courier_id=p_courier_id and cp.is_available
  and cp.updated_at>now()-interval '3 minutes' and (coalesce(v_order.payment_method,'wallet')<>'cash' or cp.accepts_cash_on_delivery)
  and exists(select 1 from public.profiles p where p.id=cp.courier_id and lower(coalesce(p.role,'')) in ('courier','driver','delivery')) for update;
 if not found then raise exception 'Courier is unavailable or does not accept cash on delivery' using errcode='P0001'; end if;
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
 select * into v_presence from public.goodies_courier_presence where courier_id=v_uid for update;
 if p_accept and (not coalesce(v_presence.is_available,false) or v_presence.updated_at<now()-interval '3 minutes'
  or (v_order.payment_method='cash' and not v_presence.accepts_cash_on_delivery)) then raise exception 'Your availability or cash-on-delivery preference changed. Update it before accepting.' using errcode='P0001'; end if;
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

do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='goodies_delivery_assignments') then alter publication supabase_realtime add table public.goodies_delivery_assignments; end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='goodies_courier_presence') then alter publication supabase_realtime add table public.goodies_courier_presence; end if;
end $$;

revoke all on function public.goodies_list_dispatch_couriers(uuid) from public,anon;
grant execute on function public.goodies_list_dispatch_couriers(uuid) to authenticated;
