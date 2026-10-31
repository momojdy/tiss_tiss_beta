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
 if exists(select 1 from public.goodies_delivery_assignments a where a.order_id=p_order_id and a.status in ('accepted','picked_up','delivered')) then
  raise exception 'This courier has already accepted or started the delivery. Contact the courier or support before changing it.' using errcode='P0001';
 end if;
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
revoke all on function public.goodies_assign_courier(uuid,uuid) from public,anon;
grant execute on function public.goodies_assign_courier(uuid,uuid) to authenticated;