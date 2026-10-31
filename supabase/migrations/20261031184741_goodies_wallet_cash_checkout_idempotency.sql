create table if not exists public.goodies_checkout_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key text not null check (length(idempotency_key) between 8 and 200),
  payment_method text not null check (payment_method in ('wallet', 'cash')),
  request_fingerprint text not null check (length(request_fingerprint) = 32),
  order_id uuid references public.goodies_orders(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

alter table public.goodies_checkout_attempts enable row level security;
revoke all on public.goodies_checkout_attempts from public, anon, authenticated;
grant all on public.goodies_checkout_attempts to service_role;

create or replace function public.place_goodies_order_with_payment_once(
  p_idempotency_key text,
  p_payment_method text,
  p_store_id text,
  p_order_type text,
  p_scheduled_for timestamptz,
  p_address jsonb,
  p_contact_phone text,
  p_items jsonb,
  p_subtotal numeric,
  p_delivery_fee numeric,
  p_service_fee numeric,
  p_discount numeric,
  p_tip numeric,
  p_total numeric,
  p_notes text,
  p_promo_code text default null
) returns table(id uuid, order_code text, status text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_attempt_id uuid;
  v_existing_order uuid;
  v_existing_fingerprint text;
  v_fingerprint text;
  v_wallet_id uuid;
  v_balance numeric;
  v_created record;
begin
  if v_uid is null then
    raise exception 'Sign in to place an order' using errcode = '28000';
  end if;

  if p_payment_method not in ('wallet', 'cash') then
    raise exception 'Unsupported payment method for this checkout' using errcode = '22023';
  end if;

  if p_idempotency_key is null or length(p_idempotency_key) < 8 or length(p_idempotency_key) > 200 then
    raise exception 'A valid checkout idempotency key is required' using errcode = '22023';
  end if;

  v_fingerprint := md5(jsonb_build_object(
    'payment_method', p_payment_method,
    'store_id', p_store_id,
    'order_type', p_order_type,
    'scheduled_for', p_scheduled_for,
    'address', case when p_address is null then null else p_address - 'delivery_quote_id' end,
    'contact_phone', p_contact_phone,
    'items', p_items,
    'subtotal', p_subtotal,
    'delivery_fee', p_delivery_fee,
    'service_fee', p_service_fee,
    'discount', p_discount,
    'tip', p_tip,
    'total', p_total,
    'notes', p_notes,
    'promo_code', p_promo_code
  )::text);

  insert into public.goodies_checkout_attempts(
    user_id, idempotency_key, payment_method, request_fingerprint
  ) values (
    v_uid, p_idempotency_key, p_payment_method, v_fingerprint
  )
  on conflict (user_id, idempotency_key) do nothing
  returning id into v_attempt_id;

  if v_attempt_id is null then
    select a.order_id, a.request_fingerprint
      into v_existing_order, v_existing_fingerprint
      from public.goodies_checkout_attempts a
     where a.user_id = v_uid
       and a.idempotency_key = p_idempotency_key
     for update;

    if v_existing_fingerprint is distinct from v_fingerprint then
      raise exception 'This checkout key was already used for different order details. Start a new checkout.' using errcode = '22023';
    end if;

    if v_existing_order is null then
      raise exception 'This checkout is still being processed. Please retry shortly.' using errcode = '55P03';
    end if;

    return query
      select o.id, o.order_code, o.status
        from public.goodies_orders o
       where o.id = v_existing_order
         and o.customer_id = v_uid;
    return;
  end if;

  if p_payment_method = 'wallet' then
    if p_total is null or p_total <= 0 then
      raise exception 'Invalid order total' using errcode = '22023';
    end if;

    select w.id, w.balance
      into v_wallet_id, v_balance
      from public.wallets w
     where w.user_id = v_uid
     for update;

    if not found then
      raise exception 'No Wantiss wallet found. Create your wallet to pay with it.' using errcode = 'P0002';
    end if;

    if v_balance < p_total then
      raise exception 'Insufficient Wantiss wallet balance. Add funds or choose another payment method.' using errcode = 'P0001';
    end if;
  end if;

  perform set_config('app.goodies_payment_context', p_payment_method, true);

  select o.*
    into v_created
    from public.place_goodies_order(
      p_store_id, p_order_type, p_scheduled_for, p_address, p_contact_phone, p_items,
      p_subtotal, p_delivery_fee, p_service_fee, p_discount, p_tip, p_total, p_notes, p_promo_code
    ) o
   limit 1;

  if v_created.id is null then
    raise exception 'The order could not be created' using errcode = 'P0001';
  end if;

  if p_payment_method = 'wallet' then
    update public.wallets
       set balance = balance - p_total,
           updated_at = now()
     where id = v_wallet_id;

    insert into public.wallet_transactions(
      user_id, amount, description, status, wallet_amount, wallet_currency,
      feature_name, activity_type, direction, reference_id, metadata
    ) values (
      v_uid, p_total, 'Goodies order ' || v_created.order_code, 'completed',
      p_total, 'USD', 'Goodies', 'goodies_order_payment', 'debit',
      v_created.id::text,
      jsonb_build_object('order_id', v_created.id, 'order_code', v_created.order_code)
    );

    update public.goodies_orders
       set payment_method = 'wallet',
           payment_status = 'paid',
           updated_at = now()
     where id = v_created.id
       and customer_id = v_uid;
  end if;

  update public.goodies_checkout_attempts
     set order_id = v_created.id
   where id = v_attempt_id;

  return query select v_created.id, v_created.order_code, v_created.status;
end;
$$;

revoke all on function public.place_goodies_order_with_payment_once(text,text,text,text,timestamptz,jsonb,text,jsonb,numeric,numeric,numeric,numeric,numeric,numeric,text,text) from public, anon;
grant execute on function public.place_goodies_order_with_payment_once(text,text,text,text,timestamptz,jsonb,text,jsonb,numeric,numeric,numeric,numeric,numeric,numeric,text,text) to authenticated, service_role;

-- The shared creator is now reachable only through the protected card or
-- Wallet/Cash wrappers. Their SECURITY DEFINER owner can still call it.
revoke all on function public.place_goodies_order(text,text,timestamptz,jsonb,text,jsonb,numeric,numeric,numeric,numeric,numeric,numeric,text,text) from public, anon, authenticated;
revoke all on function public.place_goodies_order_with_wallet(text,text,timestamptz,jsonb,text,jsonb,numeric,numeric,numeric,numeric,numeric,numeric,text,text) from public, anon, authenticated;
