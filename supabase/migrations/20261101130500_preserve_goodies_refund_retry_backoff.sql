-- Preserve the refund worker's retry delay when the order update fires
-- the terminal-status enqueue trigger.
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

  -- Lock and validate the current lease before touching the order.
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
           when p_status='refunded' then 'refunded'
           when payment_refunded_amount > 0 then 'partially_refunded'
           else 'refund_pending'
         end,
         payment_refunded_amount=case when p_status='refunded' then total else payment_refunded_amount end,
         payment_refunded_at=case when p_status='refunded' then coalesce(payment_refunded_at,now()) else payment_refunded_at end,
         updated_at=now()
   where id=v_order_id
   returning customer_id,order_code,status into v_customer,v_order_code,v_order_status;

  if not found then
    raise exception 'Refund queue order no longer exists' using errcode='P0002';
  end if;

  if p_status='refunded' then
    insert into public.notifications(user_id,vendor_id,title,body,notification_type,feature_name,destination,metadata)
    values(v_customer,null,'Goodies card refund completed',
      'Your card refund for order '||v_order_code||' has been processed by your payment provider. Posting time depends on your bank.',
      'goodies_order','Goodies','goodies/orders',
      jsonb_build_object('order_id',v_order_id,'order_code',v_order_code,'status',v_order_status,
        'payment_status','refunded','refund_id',p_refund_id));
  end if;

  -- The order update above can enqueue the same refund again and reset its
  -- schedule. Finalize the queue row after that trigger has run.
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

revoke all on function public.finish_goodies_card_refund(uuid,uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.finish_goodies_card_refund(uuid,uuid,text,text,text) to service_role;
