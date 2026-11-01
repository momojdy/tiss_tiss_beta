-- Prevent queued Goodies card refunds from racing an open/lost Stripe dispute.
-- A won dispute may resume a refund for an already-terminal order.

alter table public.goodies_card_refund_queue
  drop constraint if exists goodies_card_refund_queue_status_check;

alter table public.goodies_card_refund_queue
  add constraint goodies_card_refund_queue_status_check
  check (status in ('pending','processing','completed','failed','cancelled'));

create or replace function public.enqueue_goodies_card_refund()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $function$
begin
  if new.status in ('declined','expired','cancelled')
     and new.payment_method='card'
     and new.payment_provider_ref is not null
     and new.payment_status in ('paid','refund_pending','partially_refunded')
     and new.payment_dispute_status is distinct from 'open'
     and new.payment_dispute_status is distinct from 'lost' then
    insert into public.goodies_card_refund_queue(order_id,status,next_attempt_at)
    values(new.id,'pending',now())
    on conflict(order_id) do update set
      status=case
        when public.goodies_card_refund_queue.status='completed' then 'completed'
        else 'pending'
      end,
      next_attempt_at=now(),
      updated_at=now();
  end if;
  return new;
end;
$function$;

create or replace function public.sync_goodies_card_refund_queue_dispute()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $function$
begin
  if new.payment_dispute_status is not distinct from old.payment_dispute_status then
    return new;
  end if;

  if new.payment_dispute_status in ('open','lost') then
    update public.goodies_card_refund_queue
       set status='cancelled',
           lease_token=null,
           last_error=case
             when new.payment_dispute_status='open'
               then 'Paused because the Stripe dispute is open'
             else 'Cancelled because the Stripe dispute was lost'
           end,
           updated_at=now()
     where order_id=new.id
       and status in ('pending','processing','failed');
  elsif new.payment_dispute_status='won'
        and new.status in ('declined','expired','cancelled')
        and new.payment_method='card'
        and new.payment_provider_ref is not null
        and new.payment_status in ('paid','refund_pending','partially_refunded') then
    insert into public.goodies_card_refund_queue(order_id,status,next_attempt_at)
    values(new.id,'pending',now())
    on conflict(order_id) do update set
      status=case
        when public.goodies_card_refund_queue.status='completed' then 'completed'
        else 'pending'
      end,
      next_attempt_at=now(),
      lease_token=null,
      last_error=null,
      updated_at=now();
  end if;

  return new;
end;
$function$;

drop trigger if exists goodies_card_refund_dispute_sync on public.goodies_orders;
create trigger goodies_card_refund_dispute_sync
after update of payment_dispute_status on public.goodies_orders
for each row execute function public.sync_goodies_card_refund_queue_dispute();

create or replace function public.claim_goodies_card_refunds(p_limit integer default 25)
returns table(
  queue_id uuid,
  order_id uuid,
  order_code text,
  customer_id uuid,
  payment_provider_ref text,
  total numeric,
  attempts integer,
  lease_token uuid
)
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $function$
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'Service role required' using errcode='42501';
  end if;

  return query
  with pick as (
    select q.id
      from public.goodies_card_refund_queue q
      join public.goodies_orders o on o.id=q.order_id
     where (
       (q.status in ('pending','failed') and q.next_attempt_at <= now())
       or (q.status='processing' and q.updated_at <= now()-interval '30 minutes')
     )
       and o.status in ('declined','expired','cancelled')
       and o.payment_method='card'
       and o.payment_provider_ref is not null
       and o.payment_status in ('refund_pending','partially_refunded')
       and o.payment_dispute_status is distinct from 'open'
       and o.payment_dispute_status is distinct from 'lost'
     order by q.created_at
     for update of q skip locked
     limit least(greatest(coalesce(p_limit,25),1),100)
  ), claimed as (
    update public.goodies_card_refund_queue q
       set status='processing',
           attempts=q.attempts+1,
           lease_token=gen_random_uuid(),
           updated_at=now()
      from pick
     where q.id=pick.id
     returning q.id,q.order_id,q.attempts,q.lease_token
  )
  select c.id,o.id,o.order_code,o.customer_id,o.payment_provider_ref,o.total,c.attempts,c.lease_token
    from claimed c
    join public.goodies_orders o on o.id=c.order_id;
end;
$function$;

create or replace function public.finish_goodies_card_refund(
  p_queue_id uuid,
  p_lease_token uuid,
  p_status text,
  p_refund_id text default null,
  p_error text default null
) returns boolean
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $function$
declare
  v_order_id uuid;
  v_customer uuid;
  v_order_code text;
  v_order_status text;
  v_payment_status text;
  v_dispute_status text;
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'Service role required' using errcode='42501';
  end if;
  if p_status not in ('refunded','refund_pending','failed') then
    raise exception 'Invalid refund status' using errcode='22023';
  end if;
  if p_lease_token is null then
    raise exception 'Refund worker lease token is required' using errcode='22023';
  end if;

  select order_id into v_order_id
    from public.goodies_card_refund_queue
   where id=p_queue_id
     and lease_token=p_lease_token
     and status='processing'
   for update;
  if v_order_id is null then
    return false;
  end if;

  update public.goodies_orders
     set payment_status=case
           when payment_dispute_status='open' then 'disputed'
           when payment_dispute_status='lost' then 'disputed_lost'
           when p_status='refunded' then 'refunded'
           when payment_refunded_amount > 0 then 'partially_refunded'
           else 'refund_pending'
         end,
         payment_refunded_amount=case when p_status='refunded' then total else payment_refunded_amount end,
         payment_refunded_at=case when p_status='refunded' then coalesce(payment_refunded_at,now()) else payment_refunded_at end,
         updated_at=now()
   where id=v_order_id
   returning customer_id,order_code,status,payment_status,payment_dispute_status
   into v_customer,v_order_code,v_order_status,v_payment_status,v_dispute_status;

  if not found then
    raise exception 'Refund queue order no longer exists' using errcode='P0002';
  end if;

  if p_status='refunded' then
    insert into public.notifications(user_id,vendor_id,title,body,notification_type,feature_name,destination,metadata)
    values(v_customer,null,'Goodies card refund completed',
      'Your card refund for order '||v_order_code||' has been processed by your payment provider. Posting time depends on your bank.',
      'goodies_order','Goodies','goodies/orders',
      jsonb_build_object('order_id',v_order_id,'order_code',v_order_code,'status',v_order_status,
        'payment_status',v_payment_status,'payment_dispute_status',v_dispute_status,'refund_id',p_refund_id));
  end if;

  -- Finalize after the order update, because its terminal-status trigger may
  -- touch this same queue row and reset the retry schedule.
  update public.goodies_card_refund_queue
     set status=case when p_status='refunded' then 'completed' else 'failed' end,
         stripe_refund_id=coalesce(p_refund_id,stripe_refund_id),
         last_error=left(nullif(trim(p_error),''),1000),
         next_attempt_at=case when p_status='refunded' then next_attempt_at else now()+interval '5 minutes' end,
         lease_token=null,
         updated_at=now()
   where id=p_queue_id
     and lease_token=p_lease_token;
  if not found then
    raise exception 'Refund worker lease changed while finalizing' using errcode='P0001';
  end if;

  return true;
end;
$function$;

revoke all on function public.claim_goodies_card_refunds(integer) from public,anon,authenticated;
revoke all on function public.finish_goodies_card_refund(uuid,uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.enqueue_goodies_card_refund() from public,anon,authenticated;
revoke all on function public.sync_goodies_card_refund_queue_dispute() from public,anon,authenticated;
grant execute on function public.claim_goodies_card_refunds(integer) to service_role;
grant execute on function public.finish_goodies_card_refund(uuid,uuid,text,text,text) to service_role;
