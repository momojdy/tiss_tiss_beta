-- Courier roster is the authoritative approval source; profile.role is not repurposed.
alter table public.goodies_orders drop constraint if exists goodies_orders_status_check;
alter table public.goodies_orders add constraint goodies_orders_status_check check(status in ('scheduled','placed','accepted','preparing','ready','courier_assigned','picked_up','completed','cancelled','declined','expired'));
create table if not exists public.goodies_courier_roster(courier_id uuid primary key references auth.users(id) on delete cascade,is_approved boolean not null default true,added_by uuid references auth.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
alter table public.goodies_courier_roster enable row level security;
drop policy if exists goodies_courier_roster_self_read on public.goodies_courier_roster;
create policy goodies_courier_roster_self_read on public.goodies_courier_roster for select to authenticated using(courier_id=auth.uid());
revoke all on public.goodies_courier_roster from anon,authenticated;
grant select on public.goodies_courier_roster to authenticated;

create or replace function public.goodies_set_courier_availability(p_is_available boolean,p_accepts_cash_on_delivery boolean default false)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'Sign in required' using errcode='28000';end if;
 if not exists(select 1 from public.goodies_courier_roster r where r.courier_id=v_uid and r.is_approved) then raise exception 'Your account is not approved for Goodies courier deliveries yet.' using errcode='42501';end if;
 insert into public.goodies_courier_presence(courier_id,is_available,accepts_cash_on_delivery,updated_at) values(v_uid,coalesce(p_is_available,false),coalesce(p_accepts_cash_on_delivery,false),now())
 on conflict(courier_id) do update set is_available=excluded.is_available,accepts_cash_on_delivery=excluded.accepts_cash_on_delivery,updated_at=now();
end $$;

create or replace function public.goodies_assign_courier(p_order_id uuid,p_courier_id uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_order public.goodies_orders%rowtype;v_presence public.goodies_courier_presence%rowtype;v_uid uuid:=auth.uid();v_assignment uuid;
begin
 if v_uid is null then raise exception 'Sign in required' using errcode='28000';end if;
 select * into v_order from public.goodies_orders where id=p_order_id for update;
 if not found or v_order.order_type<>'delivery' then raise exception 'Delivery order not found' using errcode='P0002';end if;
 if not (exists(select 1 from public.business_members bm where bm.business_id=v_order.business_id and bm.user_id=v_uid and bm.role in ('owner','admin')) or exists(select 1 from public.profiles p where p.id=v_uid and lower(coalesce(p.role,'')) in ('admin','super_admin'))) then raise exception 'Not allowed to dispatch this order' using errcode='42501';end if;
 if v_order.status not in ('ready','courier_assigned') then raise exception 'Order must be ready before courier assignment' using errcode='P0001';end if;
 select cp.* into v_presence from public.goodies_courier_presence cp join public.goodies_courier_roster cr on cr.courier_id=cp.courier_id
  where cp.courier_id=p_courier_id and cr.is_approved and cp.is_available and cp.updated_at>now()-interval '3 minutes'
   and (v_order.payment_method<>'cash' or cp.accepts_cash_on_delivery) for update of cp;
 if not found then raise exception 'Courier is unavailable or does not accept cash on delivery' using errcode='P0001';end if;
 insert into public.goodies_delivery_assignments(order_id,business_id,courier_id,status) values(v_order.id,v_order.business_id,p_courier_id,'offered')
 on conflict(order_id) do update set courier_id=excluded.courier_id,status='offered',offered_at=now(),accepted_at=null,picked_up_at=null,delivered_at=null,updated_at=now() returning id into v_assignment;
 update public.goodies_orders set courier_id=p_courier_id,courier_assigned_at=now(),status='courier_assigned',updated_at=now() where id=v_order.id;
 return v_assignment;
end $$;

create or replace function public.goodies_courier_respond_assignment(p_order_id uuid,p_accept boolean)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=auth.uid();v_order public.goodies_orders%rowtype;v_assignment public.goodies_delivery_assignments%rowtype;v_presence public.goodies_courier_presence%rowtype;
begin
 if v_uid is null then raise exception 'Sign in required' using errcode='28000';end if;
 select * into v_assignment from public.goodies_delivery_assignments where order_id=p_order_id and courier_id=v_uid for update;
 if not found or v_assignment.status<>'offered' then raise exception 'This delivery offer is no longer available' using errcode='P0001';end if;
 select * into v_order from public.goodies_orders where id=p_order_id for update;
 select * into v_presence from public.goodies_courier_presence where courier_id=v_uid for update;
 if not exists(select 1 from public.goodies_courier_roster where courier_id=v_uid and is_approved) then raise exception 'Courier access is no longer active' using errcode='42501';end if;
 if p_accept and (not coalesce(v_presence.is_available,false) or v_presence.updated_at<now()-interval '3 minutes' or (v_order.payment_method='cash' and not v_presence.accepts_cash_on_delivery)) then raise exception 'Your availability or cash-on-delivery preference changed. Update it before accepting.' using errcode='P0001';end if;
 update public.goodies_delivery_assignments set status=case when p_accept then 'accepted' else 'declined' end,accepted_at=case when p_accept then now() else null end,updated_at=now() where id=v_assignment.id;
 if p_accept then update public.goodies_courier_presence set is_available=false,updated_at=now() where courier_id=v_uid;
 else update public.goodies_orders set courier_id=null,courier_assigned_at=null,status='ready',updated_at=now() where id=p_order_id and courier_id=v_uid;end if;
end $$;

create or replace function public.goodies_list_dispatch_couriers(p_order_id uuid)
returns table(courier_id uuid,full_name text,phone_number text,accepts_cash_on_delivery boolean,last_seen timestamptz)
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=auth.uid();v_order public.goodies_orders%rowtype;
begin
 if v_uid is null then raise exception 'Sign in required' using errcode='28000';end if;
 select * into v_order from public.goodies_orders where id=p_order_id;
 if not found then raise exception 'Order not found' using errcode='P0002';end if;
 if not (exists(select 1 from public.business_members bm where bm.business_id=v_order.business_id and bm.user_id=v_uid and bm.role in ('owner','admin')) or exists(select 1 from public.profiles p where p.id=v_uid and lower(coalesce(p.role,'')) in ('admin','super_admin'))) then raise exception 'Not allowed to view couriers' using errcode='42501';end if;
 return query select p.id,p.full_name,p.phone_number,cp.accepts_cash_on_delivery,cp.updated_at from public.goodies_courier_presence cp join public.goodies_courier_roster cr on cr.courier_id=cp.courier_id join public.profiles p on p.id=cp.courier_id where cr.is_approved and cp.is_available and cp.updated_at>now()-interval '3 minutes' and (v_order.payment_method<>'cash' or cp.accepts_cash_on_delivery) order by cp.updated_at desc;
end $$;

create or replace function public.goodies_cash_on_delivery_available(p_store_id text)
returns boolean language sql security definer set search_path=public,pg_temp as $$
 select coalesce(s.accept_cash_on_delivery,false) and exists(select 1 from public.goodies_courier_presence cp join public.goodies_courier_roster cr on cr.courier_id=cp.courier_id where cr.is_approved and cp.is_available and cp.accepts_cash_on_delivery and cp.updated_at>now()-interval '3 minutes') from public.goodies_store_schedules s where s.store_id=p_store_id and s.is_live
$$;
create or replace function public.goodies_require_cash_policy()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare v_store_accepts boolean;v_courier_available boolean;v_payment_context text;
begin
 v_payment_context:=coalesce(current_setting('app.goodies_payment_context',true),'');
 if v_payment_context in ('wallet','card') then return new;end if;
 if lower(coalesce(new.payment_method,''))<>'cash' then return new;end if;
 select coalesce(s.accept_cash_on_delivery,false) into v_store_accepts from public.goodies_store_schedules s where s.store_id=new.store_id and s.is_live;
 select exists(select 1 from public.goodies_courier_presence cp join public.goodies_courier_roster cr on cr.courier_id=cp.courier_id where cr.is_approved and cp.is_available and cp.accepts_cash_on_delivery and cp.updated_at>now()-interval '3 minutes') into v_courier_available;
 if not coalesce(v_store_accepts,false) or not coalesce(v_courier_available,false) then raise exception 'Cash on delivery is unavailable for this store or its couriers. Choose Wantiss Wallet or another available method.' using errcode='P0001';end if;
 return new;
end $$;

create or replace function public.goodies_admin_list_courier_candidates()
returns table(courier_id uuid,full_name text,phone_number text,already_added boolean)
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform public.goodies_admin_assert();
 return query select p.id,p.full_name,p.phone_number,(r.courier_id is not null) from public.profiles p left join public.goodies_courier_roster r on r.courier_id=p.id order by p.full_name nulls last limit 200;
end $$;
create or replace function public.goodies_admin_add_courier(p_courier_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform public.goodies_admin_assert();
 if not exists(select 1 from public.profiles where id=p_courier_id) then raise exception 'User not found' using errcode='P0002';end if;
 insert into public.goodies_courier_roster(courier_id,is_approved,added_by) values(p_courier_id,true,auth.uid()) on conflict(courier_id) do update set is_approved=true,added_by=auth.uid(),updated_at=now();
end $$;
create or replace function public.goodies_admin_remove_courier(p_courier_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform public.goodies_admin_assert();
 update public.goodies_courier_roster set is_approved=false,updated_at=now() where courier_id=p_courier_id;
 update public.goodies_courier_presence set is_available=false,updated_at=now() where courier_id=p_courier_id;
 update public.goodies_delivery_assignments set status='cancelled',updated_at=now() where courier_id=p_courier_id and status in ('offered','accepted');
 update public.goodies_orders set courier_id=null,courier_assigned_at=null,status='ready',updated_at=now() where courier_id=p_courier_id and status='courier_assigned';
end $$;
revoke all on function public.goodies_admin_list_courier_candidates() from public,anon;
revoke all on function public.goodies_admin_add_courier(uuid) from public,anon;
revoke all on function public.goodies_admin_remove_courier(uuid) from public,anon;
grant execute on function public.goodies_admin_list_courier_candidates() to authenticated;
grant execute on function public.goodies_admin_add_courier(uuid) to authenticated;
grant execute on function public.goodies_admin_remove_courier(uuid) to authenticated;
