alter table public.goodies_delivery_assignments
  add column if not exists expires_at timestamptz;

alter table public.goodies_delivery_assignments
  drop constraint if exists goodies_delivery_assignments_status_check;

alter table public.goodies_delivery_assignments
  add constraint goodies_delivery_assignments_status_check
  check (status = any (array['offered','accepted','declined','expired','picked_up','delivered','cancelled']::text[]));

update public.goodies_delivery_assignments
set expires_at = coalesce(offered_at, created_at, now()) + interval '2 minutes'
where status = 'offered' and expires_at is null;

create index if not exists goodies_delivery_assignments_offer_expiry_idx
  on public.goodies_delivery_assignments (expires_at)
  where status = 'offered';

create or replace function public.goodies_set_delivery_offer_expiry()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.status = 'offered' then
    if tg_op = 'INSERT' or old.status is distinct from 'offered'
       or new.offered_at is distinct from old.offered_at then
      new.expires_at := coalesce(new.offered_at, now()) + interval '2 minutes';
    elsif new.expires_at is null then
      new.expires_at := coalesce(new.offered_at, now()) + interval '2 minutes';
    end if;
  elsif new.status is distinct from 'offered' then
    new.expires_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists goodies_delivery_offer_expiry on public.goodies_delivery_assignments;
create trigger goodies_delivery_offer_expiry
before insert or update of status, offered_at, expires_at
on public.goodies_delivery_assignments
for each row execute function public.goodies_set_delivery_offer_expiry();

create or replace function public.expire_goodies_courier_offers()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_assignment public.goodies_delivery_assignments%rowtype;
  v_order public.goodies_orders%rowtype;
  v_count integer := 0;
begin
  for v_assignment in
    select *
    from public.goodies_delivery_assignments
    where status = 'offered'
      and expires_at is not null
      and expires_at <= now()
    order by expires_at
    for update skip locked
  loop
    update public.goodies_delivery_assignments
      set status = 'expired', updated_at = now()
      where id = v_assignment.id and status = 'offered';

    if not found then
      continue;
    end if;

    select * into v_order
    from public.goodies_orders
    where id = v_assignment.order_id
    for update;

    if found and v_order.courier_id = v_assignment.courier_id
       and v_order.status = 'courier_assigned' then
      update public.goodies_orders
        set courier_id = null,
            courier_assigned_at = null,
            status = 'ready',
            updated_at = now()
        where id = v_order.id;

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
      values (
        v_assignment.courier_id,
        'Delivery offer expired',
        'The offer for order ' || v_order.order_code || ' expired because it was not accepted in time.',
        'Goodies','order','goodies_courier',
        jsonb_build_object('order_id',v_order.id,'order_code',v_order.order_code)
      );

      insert into public.notifications(user_id,title,body,feature_name,notification_type,destination,metadata)
      select bm.user_id,
        'Courier offer expired',
        'The courier did not respond to order ' || v_order.order_code || '. Assign another available courier.',
        'Goodies','order','business_goodies_orders',
        jsonb_build_object('order_id',v_order.id,'order_code',v_order.order_code)
      from public.business_members bm
      where bm.business_id = v_order.business_id;
    end if;

    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.expire_goodies_courier_offers() from public, anon, authenticated;
grant execute on function public.expire_goodies_courier_offers() to service_role;

create or replace function public.goodies_courier_respond_assignment(p_order_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_order public.goodies_orders%rowtype;
  v_assignment public.goodies_delivery_assignments%rowtype;
  v_presence public.goodies_courier_presence%rowtype;
begin
  if v_uid is null then
    raise exception 'Sign in required' using errcode='28000';
  end if;

  select * into v_assignment
  from public.goodies_delivery_assignments
  where order_id = p_order_id and courier_id = v_uid
  for update;

  if not found or v_assignment.status <> 'offered' then
    raise exception 'This delivery offer is no longer available' using errcode='P0001';
  end if;

  select * into v_order from public.goodies_orders where id = p_order_id for update;
  if not found or v_order.courier_id <> v_uid or v_order.status <> 'courier_assigned' then
    raise exception 'This delivery offer has been reassigned' using errcode='P0001';
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
$$;

revoke all on function public.goodies_courier_respond_assignment(uuid,boolean) from public, anon;
grant execute on function public.goodies_courier_respond_assignment(uuid,boolean) to authenticated;

do $$
declare v_job record;
begin
  for v_job in select jobid from cron.job where jobname = 'goodies-expire-courier-offers' loop
    perform cron.unschedule(v_job.jobid);
  end loop;
  perform cron.schedule(
    'goodies-expire-courier-offers',
    '* * * * *',
    'select public.expire_goodies_courier_offers();'
  );
end;
$$;
