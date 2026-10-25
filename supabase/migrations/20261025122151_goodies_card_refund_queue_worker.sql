create table if not exists public.goodies_card_refund_queue (
 id uuid primary key default gen_random_uuid(), order_id uuid not null unique references public.goodies_orders(id) on delete cascade,
 status text not null default 'pending' check (status in ('pending','processing','completed','failed')),
 attempts integer not null default 0 check (attempts>=0), next_attempt_at timestamptz not null default now(),
 stripe_refund_id text, last_error text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists goodies_card_refund_queue_due_idx on public.goodies_card_refund_queue(status,next_attempt_at,created_at);
alter table public.goodies_card_refund_queue enable row level security;
revoke all on public.goodies_card_refund_queue from public,anon,authenticated;
grant all on public.goodies_card_refund_queue to service_role;
CREATE OR REPLACE FUNCTION public.enqueue_goodies_card_refund()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if new.status in ('declined','expired','cancelled')
     and new.payment_method='card'
     and new.payment_provider_ref is not null
     and new.payment_status in ('paid','refund_pending') then
    insert into public.goodies_card_refund_queue(order_id,status,next_attempt_at)
    values(new.id,'pending',now())
    on conflict(order_id) do update set
      status=case when public.goodies_card_refund_queue.status='completed' then 'completed' else 'pending' end,
      next_attempt_at=now(),updated_at=now();
  end if;
  return new;
end; $function$
;
drop trigger if exists goodies_card_refund_enqueue on public.goodies_orders;
create trigger goodies_card_refund_enqueue after insert or update of status,payment_method,payment_status,payment_provider_ref on public.goodies_orders for each row execute function public.enqueue_goodies_card_refund();
CREATE OR REPLACE FUNCTION public.validate_goodies_refund_worker_token(p_token text)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce(exists(
    select 1 from vault.decrypted_secrets
    where name='goodies_refund_worker_token' and decrypted_secret=p_token
  ),false);
$function$
;
revoke all on function public.validate_goodies_refund_worker_token(text) from public,anon,authenticated;
grant execute on function public.validate_goodies_refund_worker_token(text) to service_role;
CREATE OR REPLACE FUNCTION public.claim_goodies_card_refunds(p_limit integer DEFAULT 25)
 RETURNS TABLE(queue_id uuid, order_id uuid, order_code text, customer_id uuid, payment_provider_ref text, total numeric, attempts integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  return query
  with pick as (
    select q.id from public.goodies_card_refund_queue q
    where q.status in ('pending','failed') and q.next_attempt_at<=now()
    order by q.created_at
    for update skip locked
    limit least(greatest(coalesce(p_limit,25),1),100)
  ), claimed as (
    update public.goodies_card_refund_queue q
    set status='processing',attempts=q.attempts+1,updated_at=now()
    from pick where q.id=pick.id
    returning q.id,q.order_id,q.attempts
  )
  select c.id,o.id,o.order_code,o.customer_id,o.payment_provider_ref,o.total,c.attempts
  from claimed c join public.goodies_orders o on o.id=c.order_id;
end; $function$
;
revoke all on function public.claim_goodies_card_refunds(integer) from public,anon,authenticated;
grant execute on function public.claim_goodies_card_refunds(integer) to service_role;
CREATE OR REPLACE FUNCTION public.finish_goodies_card_refund(p_queue_id uuid, p_status text, p_refund_id text DEFAULT NULL::text, p_error text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_order_id uuid;
begin
  if p_status not in ('refunded','refund_pending','failed') then raise exception 'Invalid refund status' using errcode='22023'; end if;
  update public.goodies_card_refund_queue
  set status=case when p_status='refunded' then 'completed' else 'failed' end,
      stripe_refund_id=coalesce(p_refund_id,stripe_refund_id),
      last_error=left(nullif(trim(p_error),''),1000),
      next_attempt_at=case when p_status='refunded' then next_attempt_at else now()+interval '5 minutes' end,
      updated_at=now()
  where id=p_queue_id returning order_id into v_order_id;
  if v_order_id is null then raise exception 'Refund queue item not found' using errcode='P0002'; end if;
  update public.goodies_orders set
    payment_status=case when p_status='refunded' then 'refunded' else 'refund_pending' end,
    payment_refunded_at=case when p_status='refunded' then now() else payment_refunded_at end,
    updated_at=now()
  where id=v_order_id;
end; $function$
;
revoke all on function public.finish_goodies_card_refund(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.finish_goodies_card_refund(uuid,text,text,text) to service_role;
