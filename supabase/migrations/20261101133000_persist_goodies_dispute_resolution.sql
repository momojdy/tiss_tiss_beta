-- Persist Stripe dispute resolution independently from payment_status.
-- A won dispute restores payment_status to paid/partially_refunded; without a
-- durable marker, a delayed duplicate dispute event could then mark it lost.
alter table public.goodies_orders
  add column if not exists payment_dispute_status text;

do $constraint$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid='public.goodies_orders'::regclass
       and conname='goodies_orders_payment_dispute_status_check'
  ) then
    alter table public.goodies_orders
      add constraint goodies_orders_payment_dispute_status_check
      check (payment_dispute_status is null or payment_dispute_status in ('open','won','lost'));
  end if;
end
$constraint$;

update public.goodies_orders
   set payment_dispute_status=case
     when payment_status='disputed' then 'open'
     when payment_status='dispute_won' then 'won'
     when payment_status='disputed_lost' then 'lost'
   end
 where payment_dispute_status is null
   and payment_status in ('disputed','dispute_won','disputed_lost');

CREATE OR REPLACE FUNCTION public.process_goodies_card_payment_event(p_order_id uuid, p_payment_intent_id text, p_event_state text, p_amount_cents bigint, p_currency text, p_refunded_amount_cents bigint, p_event_created bigint)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_order public.goodies_orders%rowtype;
  v_line record;
  v_refunded numeric(12,2);
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'Service role required' using errcode='42501';
  end if;
  if p_event_state not in ('succeeded','failed','cancelled','refund_updated','disputed','dispute_won','dispute_lost') then
    raise exception 'Unsupported payment event state' using errcode='22023';
  end if;

  select * into v_order
    from public.goodies_orders
   where id=p_order_id and payment_provider_ref=p_payment_intent_id
   for update;
  if not found then return 'ignored'; end if;

  if lower(coalesce(p_currency,'')) <> 'usd'
     or p_amount_cents <> round(v_order.total*100)::bigint then
    raise exception 'Stripe amount or currency does not match the Goodies order' using errcode='22023';
  end if;
  if p_event_created is null or p_event_created <= 0 then
    raise exception 'Stripe event creation time is required' using errcode='22023';
  end if;
  if p_event_created < coalesce(v_order.payment_last_event_created,0) then
    return 'stale';
  end if;

  update public.goodies_orders
     set payment_last_event_created=p_event_created,updated_at=now()
   where id=v_order.id;

  if p_event_state='refund_updated' then
    if p_refunded_amount_cents is null or p_refunded_amount_cents < 0
       or p_refunded_amount_cents > p_amount_cents then
      raise exception 'Stripe refunded amount is invalid' using errcode='22023';
    end if;
    v_refunded := greatest(v_order.payment_refunded_amount,round(p_refunded_amount_cents::numeric/100,2));
    update public.goodies_orders set
      payment_refunded_amount=v_refunded,
      payment_status=case
        when v_order.payment_dispute_status='open' then 'disputed'
        when v_order.payment_status in ('disputed','dispute_won','disputed_lost') then v_order.payment_status
        when v_refunded>=v_order.total then 'refunded'
        when v_refunded>0 then 'partially_refunded'
        when v_order.status in ('cancelled','declined','expired') then 'refund_pending'
        else v_order.payment_status
      end,
      payment_refunded_at=case when v_refunded>=v_order.total then coalesce(payment_refunded_at,now()) else payment_refunded_at end,
      updated_at=now()
     where id=v_order.id;
    return case
      when v_order.payment_status in ('disputed','dispute_won','disputed_lost') then v_order.payment_status
      when v_refunded>=v_order.total then 'refunded'
      when v_refunded>0 then 'partially_refunded'
      else v_order.payment_status
    end;
  end if;

  if p_event_state in ('failed','cancelled') then
    if v_order.payment_dispute_status is not null or v_order.payment_status in ('paid','refund_pending','partially_refunded','refunded','disputed','dispute_won','disputed_lost') then
      return v_order.payment_status;
    end if;
    if v_order.status in ('scheduled','placed') then
      for v_line in
        select (e->>'id')::uuid as product_id,sum((e->>'q')::integer) as qty
          from jsonb_array_elements(v_order.items) e
         where jsonb_typeof(e->'byo') is distinct from 'object'
           and (e->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
           and (e->>'q') ~ '^[0-9]+$'
         group by 1
      loop
        update public.goodies_products
           set stock=least(stock+v_line.qty,100000),updated_at=now()
         where id=v_line.product_id and business_id=v_order.business_id;
      end loop;
      update public.goodies_orders
         set status='cancelled',payment_status='failed',updated_at=now()
       where id=v_order.id;
      perform public.goodies_order_notify(
        v_order.customer_id,'Goodies payment failed',
        'Payment for order '||v_order.order_code||' did not complete. The order was cancelled.',
        v_order.id,v_order.order_code,'cancelled',null
      );
      return 'cancelled';
    end if;
    update public.goodies_orders
       set payment_status='failed',updated_at=now()
     where id=v_order.id
       and payment_dispute_status is null
       and payment_status not in ('paid','refund_pending','partially_refunded','refunded','disputed','dispute_won','disputed_lost');
    return 'failed';
  elsif p_event_state='succeeded' then
    if v_order.status in ('cancelled','declined','expired') then
      if v_order.payment_status in ('refunded','disputed','dispute_won','disputed_lost') or v_order.payment_dispute_status is not null then
        return v_order.payment_status;
      end if;
      update public.goodies_orders
         set payment_status='refund_pending',updated_at=now()
       where id=v_order.id;
      return 'refund_required';
    end if;
    update public.goodies_orders
       set payment_status=case when payment_refunded_amount>0 then 'partially_refunded' else 'paid' end,
           updated_at=now()
     where id=v_order.id
       and payment_dispute_status is null
       and payment_status not in ('refunded','disputed','dispute_won','disputed_lost');
    return case when v_order.payment_refunded_amount>0 then 'partially_refunded' else 'paid' end;
  elsif p_event_state='disputed' then
    if v_order.payment_status='refunded' or v_order.payment_dispute_status in ('won','lost') then
      return v_order.payment_status;
    end if;
    update public.goodies_orders set payment_status='disputed',payment_dispute_status='open',updated_at=now() where id=v_order.id;
    return 'disputed';
  elsif p_event_state='dispute_won' then
    if v_order.payment_status='refunded' or v_order.payment_dispute_status='lost' then
      return v_order.payment_status;
    end if;
    update public.goodies_orders set payment_dispute_status='won',payment_status=case
        when payment_refunded_amount>0 then 'partially_refunded'
        else 'paid'
      end,updated_at=now()
     where id=v_order.id;
    return case when v_order.payment_refunded_amount>0 then 'partially_refunded' else 'paid' end;
  else
    if v_order.payment_status='refunded' or v_order.payment_dispute_status='won' then
      return v_order.payment_status;
    end if;
    update public.goodies_orders set payment_status='disputed_lost',payment_dispute_status='lost',updated_at=now() where id=v_order.id;
    return 'disputed_lost';
  end if;
end;
$function$
;

revoke all on function public.process_goodies_card_payment_event(uuid,text,text,bigint,text,bigint,bigint) from public,anon,authenticated;
grant execute on function public.process_goodies_card_payment_event(uuid,text,text,bigint,text,bigint,bigint) to service_role;
