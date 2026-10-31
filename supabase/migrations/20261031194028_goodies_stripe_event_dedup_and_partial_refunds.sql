-- Goodies Stripe event deduplication and cumulative partial-refund reconciliation.

alter table public.goodies_orders
  add column if not exists payment_refunded_amount numeric(12,2) not null default 0,
  add column if not exists payment_last_event_created bigint not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.goodies_orders'::regclass
      and conname='goodies_orders_payment_refunded_amount_check'
  ) then
    alter table public.goodies_orders
      add constraint goodies_orders_payment_refunded_amount_check
      check (payment_refunded_amount >= 0 and payment_refunded_amount <= total);
  end if;
end $$;

create table if not exists public.goodies_stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  livemode boolean not null default false,
  status text not null default 'processing'
    check (status in ('processing','processed','failed')),
  attempts integer not null default 1 check (attempts > 0),
  locked_at timestamptz not null default now(),
  processed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists goodies_stripe_webhook_events_status_idx
  on public.goodies_stripe_webhook_events(status, locked_at);
alter table public.goodies_stripe_webhook_events enable row level security;
revoke all on public.goodies_stripe_webhook_events from public, anon, authenticated;
grant all on public.goodies_stripe_webhook_events to service_role;

create or replace function public.claim_goodies_stripe_webhook_event(
  p_event_id text, p_event_type text, p_livemode boolean
) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare v_claimed text;
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'Service role required' using errcode='42501';
  end if;
  if nullif(trim(p_event_id),'') is null or nullif(trim(p_event_type),'') is null then
    raise exception 'Stripe event identity is required' using errcode='22023';
  end if;
  insert into public.goodies_stripe_webhook_events(
    event_id,event_type,livemode,status,attempts,locked_at,updated_at
  ) values (p_event_id,p_event_type,coalesce(p_livemode,false),'processing',1,now(),now())
  on conflict(event_id) do update set
    event_type=excluded.event_type,livemode=excluded.livemode,status='processing',
    attempts=public.goodies_stripe_webhook_events.attempts+1,locked_at=now(),
    last_error=null,updated_at=now()
  where public.goodies_stripe_webhook_events.status='failed'
     or (public.goodies_stripe_webhook_events.status='processing'
         and public.goodies_stripe_webhook_events.locked_at < now()-interval '10 minutes')
  returning event_id into v_claimed;
  return v_claimed is not null;
end;
$$;

create or replace function public.complete_goodies_stripe_webhook_event(p_event_id text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'Service role required' using errcode='42501';
  end if;
  update public.goodies_stripe_webhook_events
     set status='processed',processed_at=now(),last_error=null,updated_at=now()
   where event_id=p_event_id and status='processing';
  if not found then raise exception 'Stripe event is not currently claimed' using errcode='P0001'; end if;
end;
$$;

create or replace function public.fail_goodies_stripe_webhook_event(p_event_id text,p_error text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'Service role required' using errcode='42501';
  end if;
  update public.goodies_stripe_webhook_events
     set status='failed',last_error=left(nullif(trim(p_error),''),1000),updated_at=now()
   where event_id=p_event_id and status='processing';
end;
$$;

revoke all on function public.claim_goodies_stripe_webhook_event(text,text,boolean) from public,anon,authenticated;
revoke all on function public.complete_goodies_stripe_webhook_event(text) from public,anon,authenticated;
revoke all on function public.fail_goodies_stripe_webhook_event(text,text) from public,anon,authenticated;
grant execute on function public.claim_goodies_stripe_webhook_event(text,text,boolean) to service_role;
grant execute on function public.complete_goodies_stripe_webhook_event(text) to service_role;
grant execute on function public.fail_goodies_stripe_webhook_event(text,text) to service_role;

drop function if exists public.process_goodies_card_payment_event(uuid,text,text,bigint,text);
drop function if exists public.process_goodies_card_payment_event(uuid,text,text,bigint,text,bigint);
create function public.process_goodies_card_payment_event(
  p_order_id uuid,p_payment_intent_id text,p_event_state text,
  p_amount_cents bigint,p_currency text,p_refunded_amount_cents bigint,
  p_event_created bigint
) returns text
language plpgsql security definer set search_path='public','pg_temp'
as $$
declare v_order public.goodies_orders%rowtype; v_line record; v_refunded numeric(12,2);
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'Service role required' using errcode='42501';
  end if;
  if p_event_state not in ('succeeded','failed','cancelled','refund_updated','disputed','dispute_won','dispute_lost') then
    raise exception 'Unsupported payment event state' using errcode='22023';
  end if;
  select * into v_order from public.goodies_orders
   where id=p_order_id and payment_provider_ref=p_payment_intent_id for update;
  if not found then return 'ignored'; end if;
  if lower(coalesce(p_currency,'')) <> 'usd' or p_amount_cents <> round(v_order.total*100)::bigint then
    raise exception 'Stripe amount or currency does not match the Goodies order' using errcode='22023';
  end if;
  if p_event_created is null or p_event_created <= 0 then
    raise exception 'Stripe event creation time is required' using errcode='22023';
  end if;
  -- Ignore older, distinct Stripe events delivered after a newer event for this order.
  if p_event_created < coalesce(v_order.payment_last_event_created,0) then
    return 'stale';
  end if;
  update public.goodies_orders
     set payment_last_event_created=p_event_created,updated_at=now()
   where id=v_order.id;

  if p_event_state='refund_updated' then
    if p_refunded_amount_cents is null or p_refunded_amount_cents < 0 or p_refunded_amount_cents > p_amount_cents then
      raise exception 'Stripe refunded amount is invalid' using errcode='22023';
    end if;
    v_refunded := greatest(v_order.payment_refunded_amount,round(p_refunded_amount_cents::numeric/100,2));
    update public.goodies_orders set payment_refunded_amount=v_refunded,
      payment_status=case when v_refunded>=v_order.total then 'refunded' else 'partially_refunded' end,
      payment_refunded_at=case when v_refunded>=v_order.total then coalesce(payment_refunded_at,now()) else payment_refunded_at end,
      updated_at=now() where id=v_order.id;
    return case when v_refunded>=v_order.total then 'refunded' else 'partially_refunded' end;
  end if;

  if p_event_state in ('failed','cancelled') then
    if v_order.payment_status in ('paid','refund_pending','partially_refunded','refunded','disputed','disputed_lost') then
      return v_order.payment_status;
    end if;
    if v_order.status in ('scheduled','placed') then
      for v_line in
        select (e->>'id')::uuid as product_id,sum((e->>'q')::integer) as qty
          from jsonb_array_elements(v_order.items) e
         where jsonb_typeof(e->'byo') is distinct from 'object'
           and (e->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
           and (e->>'q') ~ '^[0-9]+$' group by 1
      loop
        update public.goodies_products set stock=least(stock+v_line.qty,100000),updated_at=now()
         where id=v_line.product_id and business_id=v_order.business_id;
      end loop;
      update public.goodies_orders set status='cancelled',payment_status='failed',updated_at=now() where id=v_order.id;
      perform public.goodies_order_notify(v_order.customer_id,'Goodies payment failed',
        'Payment for order '||v_order.order_code||' did not complete. The order was cancelled.',
        v_order.id,v_order.order_code,'cancelled',null);
      return 'cancelled';
    end if;
    update public.goodies_orders set payment_status='failed',updated_at=now()
     where id=v_order.id and payment_status not in ('paid','refund_pending','partially_refunded','refunded','disputed','disputed_lost');
    return 'failed';
  elsif p_event_state='succeeded' then
    if v_order.status='cancelled' then
      if v_order.payment_status not in ('refunded','disputed','disputed_lost') then
        update public.goodies_orders set payment_status='refund_pending',updated_at=now() where id=v_order.id;
      end if;
      return case when v_order.payment_status='refunded' then 'refunded' else 'refund_required' end;
    end if;
    update public.goodies_orders set payment_status=case when payment_refunded_amount>0 then 'partially_refunded' else 'paid' end,
      updated_at=now() where id=v_order.id and payment_status not in ('refunded','disputed','disputed_lost');
    return case when v_order.payment_refunded_amount>0 then 'partially_refunded' else 'paid' end;
  elsif p_event_state='disputed' then
    update public.goodies_orders set payment_status='disputed',updated_at=now() where id=v_order.id;
    return 'disputed';
  elsif p_event_state='dispute_won' then
    update public.goodies_orders set payment_status=case when payment_refunded_amount>0 then 'partially_refunded' else 'paid' end,
      updated_at=now() where id=v_order.id;
    return case when v_order.payment_refunded_amount>0 then 'partially_refunded' else 'paid' end;
  else
    update public.goodies_orders set payment_status='disputed_lost',updated_at=now() where id=v_order.id;
    return 'disputed_lost';
  end if;
end;
$$;
revoke all on function public.process_goodies_card_payment_event(uuid,text,text,bigint,text,bigint,bigint) from public,anon,authenticated;
grant execute on function public.process_goodies_card_payment_event(uuid,text,text,bigint,text,bigint,bigint) to service_role;

create or replace function public.enqueue_goodies_card_refund()
returns trigger language plpgsql security definer set search_path='public','pg_temp' as $$
begin
  if new.status in ('declined','expired','cancelled') and new.payment_method='card'
     and new.payment_provider_ref is not null
     and new.payment_status in ('paid','refund_pending','partially_refunded') then
    insert into public.goodies_card_refund_queue(order_id,status,next_attempt_at)
    values(new.id,'pending',now())
    on conflict(order_id) do update set
      status=case when public.goodies_card_refund_queue.status='completed' then 'completed' else 'pending' end,
      next_attempt_at=now(),updated_at=now();
  end if;
  return new;
end;
$$;

create or replace function public.finish_goodies_card_refund(
  p_queue_id uuid,p_status text,p_refund_id text default null,p_error text default null
) returns void language plpgsql security definer set search_path='public','pg_temp' as $$
declare v_order_id uuid; v_customer uuid; v_order_code text; v_order_status text;
begin
  if p_status not in ('refunded','refund_pending','failed') then raise exception 'Invalid refund status' using errcode='22023'; end if;
  update public.goodies_card_refund_queue set
    status=case when p_status='refunded' then 'completed' else 'failed' end,
    stripe_refund_id=coalesce(p_refund_id,stripe_refund_id),
    last_error=left(nullif(trim(p_error),''),1000),
    next_attempt_at=case when p_status='refunded' then next_attempt_at else now()+interval '5 minutes' end,
    updated_at=now()
   where id=p_queue_id and status<>'completed' returning order_id into v_order_id;
  if v_order_id is null then return; end if;
  update public.goodies_orders set
    payment_status=case
      when p_status='refunded' then 'refunded'
      when payment_refunded_amount > 0 then 'partially_refunded'
      else 'refund_pending'
    end,
    payment_refunded_amount=case when p_status='refunded' then total else payment_refunded_amount end,
    payment_refunded_at=case when p_status='refunded' then coalesce(payment_refunded_at,now()) else payment_refunded_at end,
    updated_at=now()
   where id=v_order_id returning customer_id,order_code,status into v_customer,v_order_code,v_order_status;
  if p_status='refunded' then
    insert into public.notifications(user_id,vendor_id,title,body,notification_type,feature_name,destination,metadata)
    values(v_customer,null,'Goodies card refund completed',
      'Your card refund for order '||v_order_code||' has been processed by your payment provider. Posting time depends on your bank.',
      'goodies_order','Goodies','goodies/orders',
      jsonb_build_object('order_id',v_order_id,'order_code',v_order_code,'status',v_order_status,
        'payment_status','refunded','refund_id',p_refund_id));
  end if;
end;
$$;
revoke all on function public.enqueue_goodies_card_refund() from public,anon,authenticated;
revoke all on function public.finish_goodies_card_refund(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.finish_goodies_card_refund(uuid,text,text,text) to service_role;
