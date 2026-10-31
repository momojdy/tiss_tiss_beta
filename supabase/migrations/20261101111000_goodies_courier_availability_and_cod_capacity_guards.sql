create or replace function public.goodies_set_courier_availability(p_is_available boolean,p_accepts_cash_on_delivery boolean default false)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'Sign in required' using errcode='28000'; end if;
 if not exists(select 1 from public.goodies_courier_roster r where r.courier_id=v_uid and r.is_approved) then
  raise exception 'Your account is not approved for Goodies courier deliveries yet.' using errcode='42501';
 end if;
 if exists(select 1 from public.goodies_delivery_assignments a where a.courier_id=v_uid and a.status in ('accepted','picked_up')) then
  if not coalesce(p_is_available,false) then raise exception 'Complete your active delivery before going offline' using errcode='P0001'; end if;
  if exists(select 1 from public.goodies_courier_presence cp where cp.courier_id=v_uid and cp.accepts_cash_on_delivery is distinct from coalesce(p_accepts_cash_on_delivery,false)) then
   raise exception 'You cannot change COD consent during an active delivery' using errcode='P0001';
  end if;
 end if;
 if not coalesce(p_is_available,false) and exists(select 1 from public.goodies_delivery_assignments a where a.courier_id=v_uid and a.status='offered') then
  raise exception 'Respond to your pending delivery offer before going offline' using errcode='P0001';
 end if;
 insert into public.goodies_courier_presence(courier_id,is_available,accepts_cash_on_delivery,updated_at)
 values(v_uid,coalesce(p_is_available,false),coalesce(p_accepts_cash_on_delivery,false),now())
 on conflict(courier_id) do update set is_available=excluded.is_available,accepts_cash_on_delivery=excluded.accepts_cash_on_delivery,updated_at=now();
end $$;

create or replace function public.goodies_cash_on_delivery_available(p_store_id text)
returns boolean language sql security definer set search_path=public,pg_temp as $$
 select coalesce(s.accept_cash_on_delivery,false) and exists(
  select 1 from public.goodies_courier_presence cp
  join public.goodies_courier_roster cr on cr.courier_id=cp.courier_id and cr.is_approved
  where cp.is_available and cp.accepts_cash_on_delivery and cp.updated_at>now()-interval '3 minutes'
   and not exists(select 1 from public.goodies_delivery_assignments a where a.courier_id=cp.courier_id and a.status in ('offered','accepted','picked_up'))
 ) from public.goodies_store_schedules s where s.store_id=p_store_id and s.is_live
$$;

revoke all on function public.goodies_set_courier_availability(boolean,boolean) from public,anon;
grant execute on function public.goodies_set_courier_availability(boolean,boolean) to authenticated;
revoke all on function public.goodies_cash_on_delivery_available(text) from public,anon;
grant execute on function public.goodies_cash_on_delivery_available(text) to authenticated;
revoke all on function public.goodies_courier_update_location(uuid,double precision,double precision,double precision,double precision,double precision) from public,anon;
grant execute on function public.goodies_courier_update_location(uuid,double precision,double precision,double precision,double precision,double precision) to authenticated;
