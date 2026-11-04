-- Own-driver delivery: when no platform courier takes an order within 20 minutes of "ready",
-- the store may assign its own driver (no GPS). The store uploads a delivery photo, the customer
-- confirms or disputes within 24 hours, and an undisputed order completes automatically after that.
alter table public.goodies_orders
  add column if not exists ready_at timestamptz,
  add column if not exists self_delivery boolean not null default false,
  add column if not exists self_driver_name text,
  add column if not exists self_driver_phone text,
  add column if not exists delivery_proof_url text,
  add column if not exists vendor_delivered_at timestamptz,
  add column if not exists receipt_deadline_at timestamptz,
  add column if not exists customer_confirmed_at timestamptz,
  add column if not exists delivery_dispute_status text,
  add column if not exists delivery_dispute_reason text,
  add column if not exists delivery_dispute_opened_at timestamptz;

alter table public.goodies_orders drop constraint if exists goodies_orders_delivery_dispute_status_check;
alter table public.goodies_orders add constraint goodies_orders_delivery_dispute_status_check
  check (delivery_dispute_status is null or delivery_dispute_status in ('open','resolved_release','resolved_refund'));

-- Remember when an order became ready so the 20-minute wait can be measured.
create or replace function private.goodies_orders_set_ready_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status = 'ready' and (tg_op = 'INSERT' or old.status is distinct from 'ready') then new.ready_at := now(); end if;
  return new;
end $$;
drop trigger if exists goodies_orders_set_ready_at on public.goodies_orders;
create trigger goodies_orders_set_ready_at before insert or update of status on public.goodies_orders
  for each row execute function private.goodies_orders_set_ready_at();

-- 1) Store assigns its own driver (only after 20 minutes with no platform courier accepted).
create or replace function public.goodies_assign_own_driver(p_order_id uuid, p_driver_name text, p_driver_phone text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_o public.goodies_orders%rowtype;
begin
  if v_uid is null then raise exception 'Sign in required' using errcode='28000'; end if;
  select * into v_o from public.goodies_orders where id = p_order_id for update;
  if not found or v_o.order_type <> 'delivery' then raise exception 'Delivery order not found' using errcode='P0002'; end if;
  if not exists(select 1 from public.business_members bm where bm.business_id = v_o.business_id and bm.user_id = v_uid and bm.role in ('owner','admin')) then
    raise exception 'Not allowed to dispatch this order' using errcode='42501'; end if;
  if v_o.status not in ('ready','courier_assigned') then raise exception 'Order must be ready first' using errcode='P0001'; end if;
  if exists(select 1 from public.goodies_delivery_assignments a where a.order_id = p_order_id and a.status in ('accepted','picked_up','delivered')) then
    raise exception 'A courier already accepted this delivery' using errcode='P0001'; end if;
  if coalesce(v_o.ready_at, v_o.updated_at) > now() - interval '20 minutes' then
    raise exception 'You can use your own driver if no courier accepts within 20 minutes' using errcode='P0001'; end if;
  if length(trim(coalesce(p_driver_name,''))) < 2 or length(regexp_replace(coalesce(p_driver_phone,''), '\D', '', 'g')) < 7 then
    raise exception 'Enter the driver name and phone number' using errcode='P0001'; end if;
  update public.goodies_delivery_assignments set status = 'cancelled', updated_at = now() where order_id = p_order_id and status = 'offered';
  update public.goodies_orders set self_delivery = true, self_driver_name = trim(p_driver_name), self_driver_phone = trim(p_driver_phone),
    courier_id = null, status = 'picked_up', picked_up_at = now(), updated_at = now() where id = p_order_id;
  perform public.goodies_order_notify(v_o.customer_id, 'Your order is on its way',
    'The store is delivering order ' || v_o.order_code || ' with its own driver, ' || trim(p_driver_name) || '.', v_o.id, v_o.order_code, 'picked_up', null);
end $$;

-- 2) Store marks it delivered with a photo.
create or replace function public.goodies_self_delivery_mark_delivered(p_order_id uuid, p_proof_url text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_o public.goodies_orders%rowtype;
begin
  if v_uid is null then raise exception 'Sign in required' using errcode='28000'; end if;
  select * into v_o from public.goodies_orders where id = p_order_id for update;
  if not found or not v_o.self_delivery then raise exception 'Order not found' using errcode='P0002'; end if;
  if not exists(select 1 from public.business_members bm where bm.business_id = v_o.business_id and bm.user_id = v_uid and bm.role in ('owner','admin')) then
    raise exception 'Not allowed' using errcode='42501'; end if;
  if v_o.status <> 'picked_up' or v_o.vendor_delivered_at is not null then raise exception 'This order cannot be marked delivered now' using errcode='P0001'; end if;
  if nullif(trim(coalesce(p_proof_url,'')), '') is null
    or position('/storage/v1/object/public/listing-photos/' || v_o.business_id::text || '/delivery-proofs/' in p_proof_url) = 0
    or not (right(lower(split_part(p_proof_url, '?', 1)), 4) in ('.jpg','.png')
      or right(lower(split_part(p_proof_url, '?', 1)), 5) in ('.jpeg','.webp')) then
    raise exception 'Upload a valid delivery photo for this store first' using errcode='P0001';
  end if;
  update public.goodies_orders set delivery_proof_url = trim(p_proof_url), vendor_delivered_at = now(),
    receipt_deadline_at = now() + interval '24 hours', updated_at = now() where id = p_order_id;
  perform public.goodies_order_notify(v_o.customer_id, 'Did you receive your order?',
    'The store says order ' || v_o.order_code || ' was delivered. Please confirm, or report a problem within 24 hours.', v_o.id, v_o.order_code, 'picked_up', null);
end $$;

-- 3) Customer confirms receipt.
create or replace function public.goodies_customer_confirm_received(p_order_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_o public.goodies_orders%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='28000'; end if;
  select * into v_o from public.goodies_orders where id = p_order_id for update;
  if not found or v_o.customer_id <> auth.uid() or not v_o.self_delivery then raise exception 'Order not found' using errcode='P0002'; end if;
  if v_o.status <> 'picked_up' or v_o.vendor_delivered_at is null then raise exception 'This order cannot be confirmed yet' using errcode='P0001'; end if;
  if v_o.delivery_dispute_status = 'open' then raise exception 'This order has an open report' using errcode='P0001'; end if;
  update public.goodies_orders set status = 'completed', delivered_at = now(), customer_confirmed_at = now(), updated_at = now() where id = p_order_id;
end $$;

-- 4) Customer reports a problem, only inside the 24-hour window.
create or replace function public.goodies_customer_dispute_delivery(p_order_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_o public.goodies_orders%rowtype; r record;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='28000'; end if;
  select * into v_o from public.goodies_orders where id = p_order_id for update;
  if not found or v_o.customer_id <> auth.uid() or not v_o.self_delivery then raise exception 'Order not found' using errcode='P0002'; end if;
  if v_o.status <> 'picked_up' or v_o.vendor_delivered_at is null then raise exception 'This order cannot be reported now' using errcode='P0001'; end if;
  if v_o.receipt_deadline_at is null or now() >= v_o.receipt_deadline_at then raise exception 'The 24-hour window to report a problem has closed' using errcode='P0001'; end if;
  if v_o.delivery_dispute_status is not null then raise exception 'A report was already sent for this order' using errcode='P0001'; end if;
  if length(trim(coalesce(p_reason,''))) < 3 then raise exception 'Tell us what went wrong' using errcode='P0001'; end if;
  update public.goodies_orders set delivery_dispute_status = 'open', delivery_dispute_reason = left(trim(p_reason), 500),
    delivery_dispute_opened_at = now(), updated_at = now() where id = p_order_id;
  for r in select bm.user_id from public.business_members bm where bm.business_id = v_o.business_id loop
    perform public.goodies_order_notify(r.user_id, 'Delivery reported', 'The customer reported a problem with order ' || v_o.order_code || '. Our team will review it.', v_o.id, v_o.order_code, 'picked_up', null);
  end loop;
end $$;

-- 5) Undisputed orders complete on their own after the 24-hour window (runs every minute).
create or replace function public.goodies_auto_complete_self_deliveries()
returns integer language plpgsql security definer set search_path = public, pg_temp as $
declare v_n integer := 0; v_o public.goodies_orders%rowtype;
begin
  for v_o in
    select * from public.goodies_orders
    where self_delivery and status = 'picked_up' and vendor_delivered_at is not null
      and nullif(delivery_proof_url,'') is not null and receipt_deadline_at <= now()
      and delivery_dispute_status is null
    order by receipt_deadline_at
    for update skip locked
  loop
    update public.goodies_orders set status = 'completed', delivered_at = coalesce(v_o.vendor_delivered_at, now()), updated_at = now()
      where id = v_o.id and status = 'picked_up' and delivery_dispute_status is null;
    if found then
      v_n := v_n + 1;
      perform public.goodies_order_notify(v_o.customer_id, 'Goodies order completed',
        'Order ' || v_o.order_code || ' was automatically completed because no delivery report was received within 24 hours.',
        v_o.id, v_o.order_code, 'completed', null);
    end if;
  end loop;
  return v_n;
end $;
do $$ begin
  if not exists (select 1 from cron.job where jobname = 'goodies-auto-complete-self-deliveries') then
    perform cron.schedule('goodies-auto-complete-self-deliveries', '* * * * *', 'select public.goodies_auto_complete_self_deliveries();');
  end if;
end $$;

-- 6) Admin decides an open report: release the order as delivered, or refund the customer.
create or replace function public.goodies_admin_resolve_delivery_dispute(p_order_id uuid, p_resolution text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_o public.goodies_orders%rowtype;
begin
  if auth.uid() is null or not public.wantiss_has_permission('operations', 'manage') then
    raise exception 'Not allowed' using errcode='42501'; end if;
  if p_resolution not in ('release','refund') then raise exception 'Invalid resolution' using errcode='P0001'; end if;
  select * into v_o from public.goodies_orders where id = p_order_id for update;
  if not found or v_o.delivery_dispute_status is distinct from 'open' then raise exception 'No open report for this order' using errcode='P0002'; end if;
  if p_resolution = 'release' then
    update public.goodies_orders set status = 'completed', delivered_at = coalesce(vendor_delivered_at, now()), delivery_dispute_status = 'resolved_release', updated_at = now() where id = p_order_id;
  else
    perform public.refund_goodies_wallet_order(p_order_id, 'delivery_dispute');
    update public.goodies_orders set status = 'cancelled', cancelled_at = now(), delivery_dispute_status = 'resolved_refund', updated_at = now() where id = p_order_id;
  end if;
  perform public.goodies_order_notify(v_o.customer_id, 'Your report was reviewed',
    case when p_resolution = 'refund' then 'Order ' || v_o.order_code || ' was refunded.' else 'Order ' || v_o.order_code || ' was confirmed as delivered.' end,
    v_o.id, v_o.order_code, case when p_resolution = 'refund' then 'cancelled' else 'completed' end, null);
end $$;

revoke all on function public.goodies_assign_own_driver(uuid,text,text), public.goodies_self_delivery_mark_delivered(uuid,text),
  public.goodies_customer_confirm_received(uuid), public.goodies_customer_dispute_delivery(uuid,text),
  public.goodies_auto_complete_self_deliveries(), public.goodies_admin_resolve_delivery_dispute(uuid,text) from public, anon;
grant execute on function public.goodies_assign_own_driver(uuid,text,text), public.goodies_self_delivery_mark_delivered(uuid,text),
  public.goodies_customer_confirm_received(uuid), public.goodies_customer_dispute_delivery(uuid,text),
  public.goodies_admin_resolve_delivery_dispute(uuid,text) to authenticated;
