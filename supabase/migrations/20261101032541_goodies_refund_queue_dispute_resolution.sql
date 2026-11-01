-- Keep every captured card refund on the single queue worker path.
-- A dispute-won terminal order can be refunded after the dispute resolves;
-- open/lost disputes must never be transitioned back into the refund queue.

create or replace function public.queue_goodies_card_refund_on_terminal_status()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $function$
begin
  if new.status in ('declined','expired','cancelled')
     and old.status is distinct from new.status
     and new.payment_method='card'
     and new.payment_status='paid'
     and new.payment_dispute_status is distinct from 'open'
     and new.payment_dispute_status is distinct from 'lost' then
    if nullif(new.payment_provider_ref,'') is null then
      update public.goodies_orders
         set payment_status='refund_manual_review',updated_at=now()
       where id=new.id;
    else
      update public.goodies_orders
         set payment_status='refund_pending',updated_at=now()
       where id=new.id;
    end if;
  end if;
  return new;
end;
$function$;

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
       and o.payment_status in ('paid','refund_pending','partially_refunded')
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

revoke all on function public.claim_goodies_card_refunds(integer) from public,anon,authenticated;
grant execute on function public.claim_goodies_card_refunds(integer) to service_role;
revoke all on function public.queue_goodies_card_refund_on_terminal_status() from public,anon,authenticated;
