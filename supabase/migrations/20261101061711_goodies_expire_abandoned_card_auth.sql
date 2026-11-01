create or replace function public.expire_goodies_card_auth(
  p_order_id uuid,
  p_payment_intent_id text,
  p_stripe_status text
)
returns text
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_order public.goodies_orders%rowtype;
  v_line record;
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'Service role required' using errcode='42501';
  end if;
  if p_stripe_status not in ('canceled','succeeded') then
    raise exception 'Unsupported Stripe PaymentIntent state' using errcode='22023';
  end if;

  select * into v_order
    from public.goodies_orders
   where id=p_order_id
     and payment_method='card'
     and payment_provider_ref=p_payment_intent_id
   for update;
  if not found then return 'ignored'; end if;

  if v_order.payment_status <> 'requires_action' then
    return v_order.payment_status;
  end if;
  if v_order.created_at > now()-interval '30 minutes' then
    return 'not_due';
  end if;

  if p_stripe_status='succeeded' then
    if v_order.payment_dispute_status in ('open','lost')
       or v_order.payment_status in ('disputed','disputed_lost','refunded') then
      return v_order.payment_status;
    end if;
    if v_order.status in ('cancelled','declined','expired') then
      update public.goodies_orders
         set payment_status='refund_pending',updated_at=now()
       where id=v_order.id;
      return 'refund_pending';
    end if;
    update public.goodies_orders
       set payment_status='paid',updated_at=now()
     where id=v_order.id;
    return 'paid';
  end if;

  if v_order.status in ('scheduled','placed') then
    for v_line in
      select (e->>'id')::uuid as product_id,
             sum((e->>'q')::integer) as qty
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
       set status='expired',payment_status='failed',updated_at=now()
     where id=v_order.id;

    perform public.goodies_order_notify(
      v_order.customer_id,
      'Goodies card verification expired',
      'Card verification for order '||v_order.order_code||' was not completed within 30 minutes. The order expired and reserved stock was released.',
      v_order.id,v_order.order_code,'expired',null
    );
    return 'expired';
  end if;

  if v_order.status in ('cancelled','declined','expired') then
    update public.goodies_orders
       set payment_status='failed',updated_at=now()
     where id=v_order.id;
    return 'failed';
  end if;

  return v_order.payment_status;
end;
$function$;

revoke all on function public.expire_goodies_card_auth(uuid,text,text) from public,anon,authenticated;
grant execute on function public.expire_goodies_card_auth(uuid,text,text) to service_role;

select cron.schedule(
  'goodies-expire-abandoned-card-auth',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://ycbirmgppwavorwudlrv.supabase.co/functions/v1/expire-goodies-card-auth',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-goodies-worker-token',
      (select decrypted_secret from vault.decrypted_secrets where name='goodies_refund_worker_token' limit 1)
    ),
    body := '{}'::jsonb
  );
  $$
);
