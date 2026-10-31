-- Goodies courier dispatch, live GPS tracking, and conditional cash-on-delivery policy.
-- Applied to project ycbirmgppwavorwudlrv.

alter table public.goodies_store_schedules add column if not exists accept_cash_on_delivery boolean not null default false;
alter table public.goodies_orders
  add column if not exists courier_id uuid references auth.users(id),
  add column if not exists courier_assigned_at timestamptz,
  add column if not exists picked_up_at timestamptz,
  add column if not exists delivered_at timestamptz;

create table if not exists public.goodies_courier_presence (
  courier_id uuid primary key references auth.users(id) on delete cascade,
  is_available boolean not null default false,
  accepts_cash_on_delivery boolean not null default false,
  latitude double precision,
  longitude double precision,
  accuracy_m double precision,
  heading double precision,
  speed_mps double precision,
  last_location_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint goodies_courier_presence_lat_check check (latitude is null or latitude between -90 and 90),
  constraint goodies_courier_presence_lng_check check (longitude is null or longitude between -180 and 180),
  constraint goodies_courier_presence_accuracy_check check (accuracy_m is null or accuracy_m between 0 and 10000)
);
create table if not exists public.goodies_delivery_assignments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.goodies_orders(id) on delete cascade,
  business_id uuid not null references public.businesses(id),
  courier_id uuid not null references auth.users(id),
  status text not null default 'offered' check (status in ('offered','accepted','declined','picked_up','delivered','cancelled')),
  offered_at timestamptz not null default now(), accepted_at timestamptz, picked_up_at timestamptz, delivered_at timestamptz,
  latitude double precision, longitude double precision, accuracy_m double precision, heading double precision, speed_mps double precision,
  location_updated_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(order_id),
  constraint goodies_assignment_lat_check check (latitude is null or latitude between -90 and 90),
  constraint goodies_assignment_lng_check check (longitude is null or longitude between -180 and 180)
);
create index if not exists goodies_courier_presence_available_idx on public.goodies_courier_presence(is_available,accepts_cash_on_delivery,updated_at desc);
create index if not exists goodies_delivery_assignments_courier_idx on public.goodies_delivery_assignments(courier_id,status,updated_at desc);
create index if not exists goodies_orders_courier_idx on public.goodies_orders(courier_id,status,updated_at desc);

alter table public.goodies_courier_presence enable row level security;
alter table public.goodies_delivery_assignments enable row level security;
drop policy if exists goodies_courier_presence_select_self on public.goodies_courier_presence;
create policy goodies_courier_presence_select_self on public.goodies_courier_presence for select to authenticated using (courier_id=auth.uid());
drop policy if exists goodies_courier_presence_write_self on public.goodies_courier_presence;
create policy goodies_courier_presence_write_self on public.goodies_courier_presence for all to authenticated using (courier_id=auth.uid()) with check (courier_id=auth.uid());
drop policy if exists goodies_delivery_assignments_read_parties on public.goodies_delivery_assignments;
create policy goodies_delivery_assignments_read_parties on public.goodies_delivery_assignments for select to authenticated using (
 courier_id=auth.uid()
 or exists(select 1 from public.goodies_orders o where o.id=order_id and o.customer_id=auth.uid())
 or exists(select 1 from public.business_members bm where bm.business_id=business_id and bm.user_id=auth.uid())
 or exists(select 1 from public.profiles p where p.id=auth.uid() and lower(coalesce(p.role,'')) in ('admin','super_admin'))
);
revoke all on public.goodies_courier_presence from anon,authenticated;
grant select on public.goodies_courier_presence to authenticated;
revoke all on public.goodies_delivery_assignments from anon,authenticated;
grant select on public.goodies_delivery_assignments to authenticated;

create or replace function public.goodies_set_courier_availability(p_is_available boolean,p_accepts_cash_on_delivery boolean default false)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'Sign in required' using errcode='28000'; end if;
 if not exists(select 1 from public.profiles p where p.id=v_uid and lower(coalesce(p.role,'')) in ('courier','driver','delivery')) then raise exception 'Courier access is required' using errcode='42501'; end if;
 insert into public.goodies_courier_presence(courier_id,is_available,accepts_cash_on_delivery,updated_at)
 values(v_uid,coalesce(p_is_available,false),coalesce(p_accepts_cash_on_delivery,false),now())
 on conflict(courier_id) do update set is_available=excluded.is_available,accepts_cash_on_delivery=excluded.accepts_cash_on_delivery,updated_at=now();
end $$;

create or replace function public.goodies_assign_courier(p_order_id uuid,p_courier_id uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_order public.goodies_orders%rowtype; v_presence public.goodies_courier_presence%rowtype; v_uid uuid:=auth.uid(); v_assignment uuid;
begin
 if v_uid is null then raise exception 'Sign in required' using errcode='28000'; end if;
 select * into v_order from public.goodies_orders where id=p_order_id for update;
 if not found or v_order.order_type<>'delivery' then raise exception 'Delivery order not found' using errcode='P0002'; end if;
 if not (exists(select 1 from public.business_members bm where bm.business_id=v_order.business_id and bm.user_id=v_uid and bm.role in ('owner','admin')) or exists(select 1 from public.profiles p where p.id=v_uid and lower(coalesce(p.role,'')) in ('admin','super_admin'))) then raise exception 'Not allowed to dispatch this order' using errcode='42501'; end if;
 if v_order.status not in ('ready','courier_assigned') then raise exception 'Order must be ready before courier assignment' using errcode='P0001'; end if;
 select * into v_presence from public.goodies_courier_presence cp where cp.courier_id=p_courier_id and cp.is_available and cp.updated_at>now()-interval '3 minutes' and (v_order.payment_method<>'cash' or cp.accepts_cash_on_delivery) and exists(select 1 from public.profiles p where p.id=cp.courier_id and lower(coalesce(p.role,'')) in ('courier','driver','delivery')) for update;
 if not found then raise exception 'Courier is unavailable or does not accept cash on delivery' using errcode='P0001'; end if;
 insert into public.goodies_delivery_assignments(order_id,business_id,courier_id,status) values(v_order.id,v_order.business_id,p_courier_id,'offered')
 on conflict(order_id) do update set courier_id=excluded.courier_id,status='offered',offered_at=now(),accepted_at=null,picked_up_at=null,delivered_at=null,updated_at=now() returning id into v_assignment;
 update public.goodies_orders set courier_id=p_courier_id,courier_assigned_at=now(),status='courier_assigned',updated_at=now() where id=v_order.id;
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
 select * into v_presence from public.goodies_courier_presence where courier_id=v_uid for update;
 if p_accept and (not coalesce(v_presence.is_available,false) or v_presence.updated_at<now()-interval '3 minutes' or (v_order.payment_method='cash' and not v_presence.accepts_cash_on_delivery)) then raise exception 'Your availability or cash-on-delivery preference changed. Update it before accepting.' using errcode='P0001'; end if;
 update public.goodies_delivery_assignments set status=case when p_accept then 'accepted' else 'declined' end,accepted_at=case when p_accept then now() else null end,updated_at=now() where id=v_assignment.id;
 if not p_accept then update public.goodies_orders set courier_id=null,courier_assigned_at=null,status='ready',updated_at=now() where id=p_order_id and courier_id=v_uid; end if;
end $$;

create or replace function public.goodies_courier_update_location(p_order_id uuid,p_latitude double precision,p_longitude double precision,p_accuracy_m double precision default null,p_heading double precision default null,p_speed_mps double precision default null)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=auth.uid(); v_assignment public.goodies_delivery_assignments%rowtype;
begin
 if v_uid is null then raise exception 'Sign in required' using errcode='28000'; end if;
 if p_latitude is null or p_longitude is null or p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then raise exception 'Invalid GPS coordinates' using errcode='22023'; end if;
 select * into v_assignment from public.goodies_delivery_assignments where order_id=p_order_id and courier_id=v_uid and status in ('accepted','picked_up') for update;
 if not found then raise exception 'No active delivery assigned to you' using errcode='42501'; end if;
 update public.goodies_delivery_assignments set latitude=p_latitude,longitude=p_longitude,accuracy_m=greatest(0,least(coalesce(p_accuracy_m,0),10000)),heading=p_heading,speed_mps=p_speed_mps,location_updated_at=now(),updated_at=now() where id=v_assignment.id;
 insert into public.goodies_courier_presence(courier_id,is_available,latitude,longitude,accuracy_m,heading,speed_mps,last_location_at,updated_at)
 values(v_uid,true,p_latitude,p_longitude,p_accuracy_m,p_heading,p_speed_mps,now(),now())
 on conflict(courier_id) do update set latitude=excluded.latitude,longitude=excluded.longitude,accuracy_m=excluded.accuracy_m,heading=excluded.heading,speed_mps=excluded.speed_mps,last_location_at=now(),updated_at=now();
end $$;

create or replace function public.goodies_courier_update_delivery_status(p_order_id uuid,p_status text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=auth.uid(); v_assignment public.goodies_delivery_assignments%rowtype;
begin
 if v_uid is null then raise exception 'Sign in required' using errcode='28000'; end if;
 select * into v_assignment from public.goodies_delivery_assignments where order_id=p_order_id and courier_id=v_uid for update;
 if not found then raise exception 'No delivery assigned to you' using errcode='42501'; end if;
 if p_status='picked_up' and v_assignment.status='accepted' then
  update public.goodies_delivery_assignments set status='picked_up',picked_up_at=now(),updated_at=now() where id=v_assignment.id;
  update public.goodies_orders set status='picked_up',picked_up_at=now(),updated_at=now() where id=p_order_id;
 elsif p_status='delivered' and v_assignment.status='picked_up' then
  update public.goodies_delivery_assignments set status='delivered',delivered_at=now(),updated_at=now() where id=v_assignment.id;
  update public.goodies_orders set status='completed',delivered_at=now(),updated_at=now() where id=p_order_id;
  update public.goodies_courier_presence set is_available=false,updated_at=now() where courier_id=v_uid;
 else raise exception 'Invalid delivery status transition' using errcode='P0001'; end if;
end $$;

create or replace function public.goodies_list_dispatch_couriers(p_order_id uuid)
returns table(courier_id uuid,full_name text,phone_number text,accepts_cash_on_delivery boolean,last_seen timestamptz)
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=auth.uid(); v_order public.goodies_orders%rowtype;
begin
 if v_uid is null then raise exception 'Sign in required' using errcode='28000'; end if;
 select * into v_order from public.goodies_orders where id=p_order_id;
 if not found then raise exception 'Order not found' using errcode='P0002'; end if;
 if not (exists(select 1 from public.business_members bm where bm.business_id=v_order.business_id and bm.user_id=v_uid and bm.role in ('owner','admin')) or exists(select 1 from public.profiles p where p.id=v_uid and lower(coalesce(p.role,'')) in ('admin','super_admin'))) then raise exception 'Not allowed to view couriers' using errcode='42501'; end if;
 return query select p.id,p.full_name,p.phone_number,cp.accepts_cash_on_delivery,cp.updated_at from public.goodies_courier_presence cp join public.profiles p on p.id=cp.courier_id where cp.is_available and cp.updated_at>now()-interval '3 minutes' and lower(coalesce(p.role,'')) in ('courier','driver','delivery') and (v_order.payment_method<>'cash' or cp.accepts_cash_on_delivery) order by cp.updated_at desc;
end $$;

create or replace function public.goodies_cash_on_delivery_available(p_store_id text)
returns boolean language sql security definer set search_path=public,pg_temp as $$
 select coalesce(s.accept_cash_on_delivery,false) and exists(select 1 from public.goodies_courier_presence cp join public.profiles p on p.id=cp.courier_id where cp.is_available and cp.accepts_cash_on_delivery and cp.updated_at>now()-interval '3 minutes' and lower(coalesce(p.role,'')) in ('courier','driver','delivery')) from public.goodies_store_schedules s where s.store_id=p_store_id and s.is_live
$$;

create or replace function public.goodies_require_cash_policy()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare v_store_accepts boolean; v_courier_available boolean; v_payment_context text;
begin
 v_payment_context:=coalesce(current_setting('app.goodies_payment_context',true),'');
 if v_payment_context in ('wallet','card') then return new; end if;
 if lower(coalesce(new.payment_method,''))<>'cash' then return new; end if;
 select coalesce(s.accept_cash_on_delivery,false) into v_store_accepts from public.goodies_store_schedules s where s.store_id=new.store_id and s.is_live;
 select exists(select 1 from public.goodies_courier_presence cp join public.profiles p on p.id=cp.courier_id where cp.is_available and cp.accepts_cash_on_delivery and cp.updated_at>now()-interval '3 minutes' and lower(coalesce(p.role,'')) in ('courier','driver','delivery')) into v_courier_available;
 if not coalesce(v_store_accepts,false) or not coalesce(v_courier_available,false) then raise exception 'Cash on delivery is unavailable for this store or its couriers. Choose Wantiss Wallet or another available method.' using errcode='P0001'; end if;
 return new;
end $$;
drop trigger if exists goodies_orders_cash_policy_guard on public.goodies_orders;
create trigger goodies_orders_cash_policy_guard before insert on public.goodies_orders for each row execute function public.goodies_require_cash_policy();

create or replace function public.goodies_set_store_cash_policy(p_store_id text,p_enabled boolean)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=auth.uid(); v_business uuid;
begin
 if v_uid is null then raise exception 'Sign in required' using errcode='28000'; end if;
 select business_id into v_business from public.goodies_store_schedules where store_id=p_store_id for update;
 if not found then raise exception 'Store not found' using errcode='P0002'; end if;
 if not exists(select 1 from public.business_members where business_id=v_business and user_id=v_uid and role in ('owner','admin')) then raise exception 'Only the store owner or administrator can change cash-on-delivery availability' using errcode='42501'; end if;
 update public.goodies_store_schedules set accept_cash_on_delivery=coalesce(p_enabled,false),updated_at=now() where store_id=p_store_id;
end $$;

create or replace function public.place_goodies_order_with_wallet(
 p_store_id text,p_order_type text,p_scheduled_for timestamptz,p_address jsonb,p_contact_phone text,p_items jsonb,
 p_subtotal numeric,p_delivery_fee numeric,p_service_fee numeric,p_discount numeric,p_tip numeric,p_total numeric,p_notes text,p_promo_code text default null
)
returns table(id uuid,order_code text,status text) language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=auth.uid(); v_wallet_id uuid; v_balance numeric; v_id uuid; v_code text; v_status text;
begin
 if v_uid is null then raise exception 'Sign in to place an order' using errcode='28000'; end if;
 if p_total is null or p_total<=0 then raise exception 'Invalid order total' using errcode='22023'; end if;
 select w.id,w.balance into v_wallet_id,v_balance from public.wallets w where w.user_id=v_uid for update;
 if not found then raise exception 'No Wantiss wallet found. Create your wallet to pay with it.' using errcode='P0002'; end if;
 if v_balance<p_total then raise exception 'Insufficient Wantiss wallet balance. Add funds or choose another payment method.' using errcode='P0001'; end if;
 perform set_config('app.goodies_payment_context','wallet',true);
 select o.id,o.order_code,o.status into v_id,v_code,v_status from public.place_goodies_order(p_store_id,p_order_type,p_scheduled_for,p_address,p_contact_phone,p_items,p_subtotal,p_delivery_fee,p_service_fee,p_discount,p_tip,p_total,p_notes,p_promo_code) o;
 update public.wallets set balance=balance-p_total,updated_at=now() where id=v_wallet_id;
 insert into public.wallet_transactions(user_id,amount,description,status,wallet_amount,wallet_currency,feature_name,activity_type,direction,reference_id,metadata)
 values(v_uid,p_total,'Goodies order '||v_code,'completed',p_total,'USD','Goodies','goodies_order_payment','debit',v_id::text,jsonb_build_object('order_id',v_id,'order_code',v_code));
 update public.goodies_orders set payment_method='wallet',payment_status='paid',updated_at=now() where id=v_id;
 return query select v_id,v_code,v_status;
end $$;

create or replace function public.place_goodies_card_order_once(
 p_idempotency_key text,p_store_id text,p_order_type text,p_scheduled_for timestamptz,p_address jsonb,p_contact_phone text,p_items jsonb,
 p_subtotal numeric,p_delivery_fee numeric,p_service_fee numeric,p_discount numeric,p_tip numeric,p_total numeric,p_notes text,p_promo_code text default null
)
returns table(id uuid,order_code text,status text) language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=auth.uid(); v_attempt_id uuid; v_existing_order uuid; v_created record;
begin
 if v_uid is null then raise exception 'Sign in to place an order' using errcode='28000'; end if;
 if p_idempotency_key is null or length(p_idempotency_key)<8 or length(p_idempotency_key)>200 then raise exception 'A valid checkout idempotency key is required' using errcode='22023'; end if;
 insert into public.goodies_card_checkout_attempts(user_id,idempotency_key) values(v_uid,p_idempotency_key) on conflict(user_id,idempotency_key) do nothing returning id into v_attempt_id;
 if v_attempt_id is null then
  select a.order_id into v_existing_order from public.goodies_card_checkout_attempts a where a.user_id=v_uid and a.idempotency_key=p_idempotency_key for update;
  if v_existing_order is null then raise exception 'This card checkout is already being processed. Please retry shortly' using errcode='55P03'; end if;
  return query select o.id,o.order_code,o.status from public.goodies_orders o where o.id=v_existing_order; return;
 end if;
 perform set_config('app.goodies_payment_context','card',true);
 select * into v_created from public.place_goodies_order(p_store_id,p_order_type,p_scheduled_for,p_address,p_contact_phone,p_items,p_subtotal,p_delivery_fee,p_service_fee,p_discount,p_tip,p_total,p_notes,p_promo_code) limit 1;
 update public.goodies_card_checkout_attempts set order_id=v_created.id where id=v_attempt_id;
 return query select v_created.id,v_created.order_code,v_created.status;
end $$;

revoke all on function public.goodies_set_courier_availability(boolean,boolean) from public,anon;
revoke all on function public.goodies_assign_courier(uuid,uuid) from public,anon;
revoke all on function public.goodies_courier_respond_assignment(uuid,boolean) from public,anon;
revoke all on function public.goodies_courier_update_location(uuid,double precision,double precision,double precision,double precision,double precision) from public,anon;
revoke all on function public.goodies_courier_update_delivery_status(uuid,text) from public,anon;
revoke all on function public.goodies_list_dispatch_couriers(uuid) from public,anon;
revoke all on function public.goodies_cash_on_delivery_available(text) from public,anon;
revoke all on function public.goodies_set_store_cash_policy(text,boolean) from public,anon;
grant execute on function public.goodies_set_courier_availability(boolean,boolean) to authenticated;
grant execute on function public.goodies_assign_courier(uuid,uuid) to authenticated;
grant execute on function public.goodies_courier_respond_assignment(uuid,boolean) to authenticated;
grant execute on function public.goodies_courier_update_location(uuid,double precision,double precision,double precision,double precision,double precision) to authenticated;
grant execute on function public.goodies_courier_update_delivery_status(uuid,text) to authenticated;
grant execute on function public.goodies_list_dispatch_couriers(uuid) to authenticated;
grant execute on function public.goodies_cash_on_delivery_available(text) to authenticated;
grant execute on function public.goodies_set_store_cash_policy(text,boolean) to authenticated;

update public.wantiss_cms_content set payload=jsonb_set(coalesce(payload,'{}'::jsonb),'{fees}',
 coalesce(payload->'fees','{}'::jsonb)||jsonb_build_object(
  'svc',coalesce(nullif(payload->'fees'->>'svc','')::numeric,0),
  'first',coalesce((payload->'fees'->>'first')::boolean,false),
  'tips',coalesce(payload->'fees'->>'tips','0,1,2,3'),
  'pay',jsonb_build_object('Wallet',1,'MonCash',0,'Card',1,'Cash',1),
  'rfSvc',coalesce((payload->'fees'->>'rfSvc')::boolean,false),
  'rfTip',coalesce((payload->'fees'->>'rfTip')::boolean,false)
 ),true),updated_at=now()
where id=(select id from public.wantiss_cms_content where content_key='goodies.content' and locale='en' and status='published' order by version desc limit 1);
