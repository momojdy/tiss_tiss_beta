-- Repeated order/webhook updates must not reset a worker lease, retry backoff or dead letter.
-- Dispute recovery and authorized admin requeue retain their explicit queue transitions.
do $repair$
declare
 v_definition text := pg_get_functiondef('public.enqueue_goodies_card_refund()'::regprocedure);
 v_before text := $before$on conflict(order_id) do update set
      status=case
        when public.goodies_card_refund_queue.status='completed' then 'completed'
        else 'pending'
      end,
      next_attempt_at=now(),
      updated_at=now();$before$;
 v_after text := 'on conflict(order_id) do nothing;';
begin
 if position(v_after in v_definition)>0 then return;end if;
 if position(v_before in v_definition)=0 then
  raise exception 'Card refund enqueue has drifted; reconcile before applying this repair';
 end if;
 execute replace(v_definition,v_before,v_after);
end;
$repair$;
