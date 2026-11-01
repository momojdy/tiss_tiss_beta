create or replace function public.accept_goodies_order(p_order_id uuid)
returns text
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_uid uuid := auth.uid();
  v_o public.goodies_orders%rowtype;
begin
  if v_uid is null then raise exception 'Sign in required' using errcode = '28000'; end if;
  select * into v_o from public.goodies_orders where id = p_order_id for update;
  if not found then raise exception 'Order not found' using errcode = 'P0002'; end if;
  if not exists (select 1 from public.business_members bm where bm.business_id = v_o.business_id and bm.user_id = v_uid) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if v_o.status <> 'placed' then raise exception 'This order is no longer awaiting a response' using errcode = 'P0001'; end if;
  if v_o.acceptance_deadline_at is null or v_o.acceptance_deadline_at <= now() then
    raise exception 'The 15-minute acceptance window has expired' using errcode = 'P0001';
  end if;
  if v_o.payment_method = 'card' and v_o.payment_status <> 'paid' then
    raise exception 'Card payment has not been confirmed yet' using errcode = 'P0001';
  end if;
  update public.goodies_orders set status='accepted', accepted_at=now(), updated_at=now() where id=p_order_id;
  perform public.goodies_order_notify(
    v_o.customer_id, 'Goodies order accepted',
    'The store accepted order ' || v_o.order_code || ' and is preparing it.',
    v_o.id, v_o.order_code, 'accepted', null
  );
  return 'accepted';
end;
$function$;

create or replace function public.goodies_order_after_insert()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_member record;
begin
  if new.status = 'placed' then
    update public.goodies_orders
      set acceptance_deadline_at = coalesce(new.acceptance_deadline_at, now() + interval '15 minutes')
      where id = new.id;
    perform public.goodies_order_notify(
      new.customer_id, 'Goodies order placed',
      'Your order ' || new.order_code || ' was sent to the store. The store has 15 minutes to respond.',
      new.id, new.order_code, 'placed', null
    );
    if new.payment_method <> 'card' or new.payment_status = 'paid' then
      for v_member in select bm.user_id from public.business_members bm where bm.business_id = new.business_id loop
        perform public.goodies_order_notify(v_member.user_id, 'New Goodies order',
          'Order ' || new.order_code || ' needs a response within 15 minutes.',
          new.id, new.order_code, 'placed', null);
      end loop;
    end if;
  elsif new.status = 'scheduled' then
    perform public.goodies_order_notify(
      new.customer_id, 'Goodies order scheduled',
      'Your order ' || new.order_code || ' is scheduled. The store will be asked to respond when the scheduled time arrives.',
      new.id, new.order_code, 'scheduled', null
    );
  end if;
  return new;
end;
$function$;

create or replace function public.goodies_notify_store_on_payment_confirmed()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_member record;
begin
  if new.status = 'placed'
     and new.payment_method = 'card'
     and new.payment_status = 'paid'
     and (old.status is distinct from 'placed' or old.payment_status is distinct from 'paid') then
    for v_member in
      select bm.user_id
      from public.business_members bm
      where bm.business_id = new.business_id
    loop
      perform public.goodies_order_notify(
        v_member.user_id, 'New Goodies order',
        'Order ' || new.order_code || ' needs a response within 15 minutes.',
        new.id, new.order_code, 'placed', null
      );
    end loop;
  end if;
  return new;
end;
$function$;

drop trigger if exists goodies_order_notify_store_on_payment_confirmed on public.goodies_orders;
create trigger goodies_order_notify_store_on_payment_confirmed
after update of status, payment_status on public.goodies_orders
for each row execute function public.goodies_notify_store_on_payment_confirmed();
