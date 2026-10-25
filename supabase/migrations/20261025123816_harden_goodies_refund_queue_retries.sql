create or replace function public.enqueue_goodies_card_refund()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if new.status in ('declined','expired','cancelled')
     and new.payment_method='card'
     and new.payment_provider_ref is not null
     and new.payment_status in ('paid','refund_pending') then
    insert into public.goodies_card_refund_queue(order_id,status,next_attempt_at)
    values(new.id,'pending',now())
    on conflict(order_id) do nothing;
  end if;
  return new;
end $$;

create or replace function public.claim_goodies_card_refunds(p_limit integer default 25)
returns table(queue_id uuid,order_id uuid,order_code text,customer_id uuid,payment_provider_ref text,total numeric,attempts integer)
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  return query
  with pick as (
    select q.id from public.goodies_card_refund_queue q
    where ((q.status in ('pending','failed') and q.next_attempt_at<=now())
       or (q.status='processing' and q.updated_at<=now()-interval '10 minutes'))
    order by q.created_at for update skip locked limit least(greatest(coalesce(p_limit,25),1),100)
  ), claimed as (
    update public.goodies_card_refund_queue q
    set status='processing',attempts=q.attempts+1,updated_at=now()
    from pick where q.id=pick.id returning q.id,q.order_id,q.attempts
  )
  select c.id,o.id,o.order_code,o.customer_id,o.payment_provider_ref,o.total,c.attempts
  from claimed c join public.goodies_orders o on o.id=c.order_id;
end $$;
revoke all on function public.claim_goodies_card_refunds(integer) from public,anon,authenticated;
grant execute on function public.claim_goodies_card_refunds(integer) to service_role;
