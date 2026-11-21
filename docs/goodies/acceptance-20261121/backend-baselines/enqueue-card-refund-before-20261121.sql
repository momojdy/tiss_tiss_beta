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
$function$
