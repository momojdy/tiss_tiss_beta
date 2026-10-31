create or replace function public.process_goodies_card_payment_event(
  p_order_id uuid, p_payment_intent_id text, p_event_state text,
  p_amount_cents bigint, p_currency text
) returns text
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_order public.goodies_orders%rowtype; v_line record;
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'Service role required' using errcode='42501';
  end if;
  if p_event_state not in ('succeeded','failed','cancelled','refunded','disputed','dispute_won','dispute_lost') then
    raise exception 'Unsupported payment event state' using errcode='22023';
  end if;
  select * into v_order from public.goodies_orders
   where id=p_order_id and payment_provider_ref=p_payment_intent_id for update;
  if not found then return 'ignored'; end if;
  if lower(coalesce(p_currency,'')) <> 'usd' or p_amount_cents <> round(v_order.total*100)::bigint then
    raise exception 'Stripe amount or currency does not match the Goodies order' using errcode='22023';
  end if;
  if p_event_state in ('failed','cancelled') then
    if v_order.status in ('scheduled','placed') and v_order.payment_status <> 'paid' then
      for v_line in
        select (e->>'id')::uuid as product_id, sum((e->>'q')::integer) as qty
          from jsonb_array_elements(v_order.items) e
         where jsonb_typeof(e->'byo') is distinct from 'object'
           and (e->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
           and (e->>'q') ~ '^[0-9]+$'
         group by 1
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
     where id=v_order.id and payment_status <> 'paid';
    return 'failed';
  elsif p_event_state='succeeded' then
    if v_order.status='cancelled' then
      update public.goodies_orders set payment_status='refund_pending',updated_at=now() where id=v_order.id;
      return 'refund_required';
    end if;
    update public.goodies_orders set payment_status='paid',updated_at=now()
     where id=v_order.id and payment_status not in ('refunded','disputed','disputed_lost');
    return 'paid';
  elsif p_event_state='refunded' then
    update public.goodies_orders set payment_status='refunded',payment_refunded_at=coalesce(payment_refunded_at,now()),updated_at=now()
     where id=v_order.id;
    return 'refunded';
  elsif p_event_state='disputed' then
    update public.goodies_orders set payment_status='disputed',updated_at=now() where id=v_order.id;
    return 'disputed';
  elsif p_event_state='dispute_won' then
    update public.goodies_orders set payment_status='paid',updated_at=now() where id=v_order.id;
    return 'paid';
  else
    update public.goodies_orders set payment_status='disputed_lost',updated_at=now() where id=v_order.id;
    return 'disputed_lost';
  end if;
end;
$$;
revoke all on function public.process_goodies_card_payment_event(uuid,text,text,bigint,text) from public,anon,authenticated;
grant execute on function public.process_goodies_card_payment_event(uuid,text,text,bigint,text) to service_role;
