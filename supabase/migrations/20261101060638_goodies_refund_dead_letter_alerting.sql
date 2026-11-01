alter table public.goodies_card_refund_queue
  drop constraint if exists goodies_card_refund_queue_status_check;
alter table public.goodies_card_refund_queue
  add constraint goodies_card_refund_queue_status_check
  check (status = any (array['pending','processing','completed','failed','cancelled','dead_letter']::text[]));

CREATE OR REPLACE FUNCTION public.claim_goodies_card_refunds(p_limit integer DEFAULT 25)
 RETURNS TABLE(queue_id uuid, order_id uuid, order_code text, customer_id uuid, payment_provider_ref text, total numeric, attempts integer, lease_token uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_row record;
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'Service role required' using errcode='42501';
  end if;

  for v_row in
    select q.id,q.order_id,q.attempts,q.last_error
      from public.goodies_card_refund_queue q
      join public.goodies_orders o on o.id=q.order_id
     where q.attempts >= 8
       and (
         (q.status in ('pending','failed') and q.next_attempt_at <= now())
         or (q.status='processing' and q.updated_at <= now()-interval '30 minutes')
       )
       and o.status in ('declined','expired','cancelled')
       and o.payment_method='card'
       and o.payment_provider_ref is not null
       and o.payment_status in ('paid','refund_pending','partially_refunded')
       and o.payment_dispute_status is distinct from 'open'
       and o.payment_dispute_status is distinct from 'lost'
     for update of q skip locked
  loop
    update public.goodies_card_refund_queue
       set status='dead_letter',
           lease_token=null,
           last_error=left(coalesce(nullif(trim(v_row.last_error),''),'Refund worker exhausted 8 attempts; manual review required'),1000),
           updated_at=now()
     where id=v_row.id;

    insert into public.notifications(user_id,vendor_id,title,body,notification_type,feature_name,destination,metadata)
    select s.user_id,null,'Goodies card refund requires manual review',
      'A card refund reached the retry limit for order '||o.order_code||'. Review the payment in Stripe before retrying.',
      'goodies_refund_attention','Goodies','goodies/refunds',
      jsonb_build_object('queue_id',v_row.id,'order_id',o.id,'order_code',o.order_code,'attempts',v_row.attempts,'alert_key','refund_dead_letter:'||v_row.id)
    from public.wantiss_admin_staff s
    join auth.users u on u.id=s.user_id
    where s.status='active' and s.role='super_admin'
      and u.email_confirmed_at is not null
      and not exists (
        select 1 from public.notifications n
        where n.user_id=s.user_id
          and n.metadata->>'alert_key'='refund_dead_letter:'||v_row.id
      )
    returning id into v_row.id;
  end loop;

  return query
  with pick as (
    select q.id
      from public.goodies_card_refund_queue q
      join public.goodies_orders o on o.id=q.order_id
     where (
       (q.status in ('pending','failed') and q.next_attempt_at <= now())
       or (q.status='processing' and q.updated_at <= now()-interval '30 minutes')
     )
       and q.attempts < 8
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
$function$


CREATE OR REPLACE FUNCTION public.finish_goodies_card_refund(p_queue_id uuid, p_lease_token uuid, p_status text, p_refund_id text DEFAULT NULL::text, p_error text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_order_id uuid;
  v_customer uuid;
  v_order_code text;
  v_order_status text;
  v_payment_status text;
  v_dispute_status text;
  v_attempts integer;
  v_queue_status text;
  v_retry_minutes integer;
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

  select order_id,attempts into v_order_id,v_attempts
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

  if p_status='failed' then
    v_queue_status := case when v_attempts >= 8 then 'dead_letter' else 'failed' end;
    v_retry_minutes := least(5 * power(2, greatest(v_attempts - 1, 0)), 360)::integer;
  elsif p_status='refund_pending' then
    v_queue_status := 'pending';
    v_retry_minutes := 15;
  else
    v_queue_status := 'completed';
    v_retry_minutes := null;
  end if;

  update public.goodies_card_refund_queue
     set status=v_queue_status,
         stripe_refund_id=coalesce(p_refund_id,stripe_refund_id),
         last_error=left(nullif(trim(p_error),''),1000),
         next_attempt_at=case
           when v_queue_status='completed' then next_attempt_at
           when v_queue_status='dead_letter' then next_attempt_at
           else now()+make_interval(mins=>v_retry_minutes)
         end,
         lease_token=null,
         updated_at=now()
   where id=p_queue_id
     and lease_token=p_lease_token;
  if not found then
    raise exception 'Refund worker lease changed while finalizing' using errcode='P0001';
  end if;

  if v_queue_status='dead_letter' then
    insert into public.notifications(user_id,vendor_id,title,body,notification_type,feature_name,destination,metadata)
    select s.user_id,null,'Goodies card refund requires manual review',
      'A card refund reached the retry limit for order '||v_order_code||'. Review the payment in Stripe before retrying.',
      'goodies_refund_attention','Goodies','goodies/refunds',
      jsonb_build_object('queue_id',p_queue_id,'order_id',v_order_id,'order_code',v_order_code,
        'attempts',v_attempts,'alert_key','refund_dead_letter:'||p_queue_id)
    from public.wantiss_admin_staff s
    join auth.users u on u.id=s.user_id
    where s.status='active' and s.role='super_admin'
      and u.email_confirmed_at is not null
      and not exists (
        select 1 from public.notifications n
        where n.user_id=s.user_id
          and n.metadata->>'alert_key'='refund_dead_letter:'||p_queue_id
      );
  end if;

  return true;
end;
$function$


CREATE OR REPLACE FUNCTION public.monitor_goodies_card_refund_worker()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_response record;
  v_failed integer := 0;
  v_issue text;
  v_alert_key text;
begin
  select r.status_code,r.timed_out,r.error_msg,r.content,r.created
    into v_response
    from net._http_response r
   where r.content like '%"scanned"%'
   order by r.created desc
   limit 1;

  if not found or v_response.created < now()-interval '10 minutes' then
    v_issue := 'No successful refund worker heartbeat was recorded in the last 10 minutes.';
    v_alert_key := 'refund_worker_missing_heartbeat';
  else
    begin
      v_failed := coalesce((v_response.content::jsonb->>'failed')::integer,0);
    exception when others then
      v_failed := 1;
    end;
    if v_response.timed_out or v_response.error_msg is not null or v_response.status_code < 200
       or v_response.status_code >= 300 or v_failed > 0 then
      v_issue := 'Refund worker returned an error. HTTP status: '||coalesce(v_response.status_code::text,'unknown')
        ||'; failed queue items: '||v_failed||'; details: '||left(coalesce(v_response.error_msg,v_response.content,'No response body'),500);
      v_alert_key := 'refund_worker_execution_failure';
    end if;
  end if;

  if v_issue is null and exists (
    select 1 from public.goodies_card_refund_queue q
    where q.status='pending' and q.created_at < now()-interval '24 hours'
  ) then
    v_issue := 'One or more Goodies card refunds have remained pending for more than 24 hours.';
    v_alert_key := 'refund_worker_old_pending';
  end if;

  if v_issue is not null then
    insert into public.notifications(user_id,vendor_id,title,body,notification_type,feature_name,destination,metadata)
    select s.user_id,null,'Goodies refund operations alert',v_issue,
      'goodies_refund_attention','Goodies','goodies/refunds',
      jsonb_build_object('alert_key',v_alert_key,'observed_at',now())
    from public.wantiss_admin_staff s
    join auth.users u on u.id=s.user_id
    where s.status='active' and s.role='super_admin'
      and u.email_confirmed_at is not null
      and not exists (
        select 1 from public.notifications n
        where n.user_id=s.user_id
          and n.metadata->>'alert_key'=v_alert_key
          and n.created_at > now()-interval '1 hour'
      );
  end if;

  return v_issue is null;
end;
$function$


CREATE OR REPLACE FUNCTION public.wantiss_admin_requeue_goodies_card_refund(p_queue_id uuid, p_reason text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_actor uuid := auth.uid();
  v_order_id uuid;
  v_before jsonb;
begin
  if v_actor is null or not public.wantiss_has_permission('finance.refund','manage') then
    raise exception 'Not authorized' using errcode='42501';
  end if;
  if length(trim(coalesce(p_reason,''))) < 5 then
    raise exception 'A reason of at least 5 characters is required' using errcode='22023';
  end if;

  select q.order_id,
         jsonb_build_object('status',q.status,'attempts',q.attempts,'last_error',q.last_error)
    into v_order_id,v_before
    from public.goodies_card_refund_queue q
    join public.goodies_orders o on o.id=q.order_id
   where q.id=p_queue_id
     and q.status='dead_letter'
     and o.status in ('declined','expired','cancelled')
     and o.payment_method='card'
     and o.payment_provider_ref is not null
     and o.payment_status in ('paid','refund_pending','partially_refunded')
     and o.payment_dispute_status is distinct from 'open'
     and o.payment_dispute_status is distinct from 'lost'
   for update of q,o;

  if v_order_id is null then
    raise exception 'Refund is not eligible for manual retry' using errcode='P0001';
  end if;

  update public.goodies_card_refund_queue
     set status='pending',attempts=0,next_attempt_at=now(),lease_token=null,
         last_error='Manually requeued: '||left(trim(p_reason),900),updated_at=now()
   where id=p_queue_id;

  insert into public.wantiss_admin_audit_log(actor_user_id,action,resource_type,resource_id,reason,before_state,after_state)
  values(v_actor,'goodies_card_refund_requeued','goodies_card_refund',p_queue_id::text,left(trim(p_reason),1000),
    v_before,jsonb_build_object('status','pending','attempts',0,'order_id',v_order_id));

  return true;
end;
$function$


revoke all on function public.claim_goodies_card_refunds(integer) from public,anon,authenticated;
grant execute on function public.claim_goodies_card_refunds(integer) to service_role;
revoke all on function public.finish_goodies_card_refund(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.finish_goodies_card_refund(uuid,uuid,text,text,text) to service_role;
revoke all on function public.wantiss_admin_requeue_goodies_card_refund(uuid,text) from public,anon;
grant execute on function public.wantiss_admin_requeue_goodies_card_refund(uuid,text) to authenticated;
revoke all on function public.monitor_goodies_card_refund_worker() from public,anon,authenticated;
grant execute on function public.monitor_goodies_card_refund_worker() to postgres,service_role;

select cron.schedule('monitor-goodies-card-refund-worker','*/5 * * * *',$$select public.monitor_goodies_card_refund_worker()$$);
