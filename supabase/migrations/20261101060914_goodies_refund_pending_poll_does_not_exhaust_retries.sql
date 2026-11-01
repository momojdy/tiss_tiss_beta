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
         attempts=case when p_status='refund_pending' then 0 else attempts end,
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
;
