-- Make Card checkout idempotency reject reuse of the same customer key
-- for a different cart, matching the Wallet/Cash checkout contract.
alter table public.goodies_card_checkout_attempts
  add column if not exists request_fingerprint text;

do $constraint$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid='public.goodies_card_checkout_attempts'::regclass
       and conname='goodies_card_checkout_attempts_fingerprint_check'
  ) then
    alter table public.goodies_card_checkout_attempts
      add constraint goodies_card_checkout_attempts_fingerprint_check
      check (request_fingerprint is null or length(request_fingerprint)=32);
  end if;
end
$constraint$;

create or replace function public.place_goodies_card_order_once(
  p_idempotency_key text,
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
  v_created record;
begin
  if v_uid is null then
    raise exception 'Sign in to place an order' using errcode='28000';
  end if;
  if p_idempotency_key is null or length(p_idempotency_key)<8 or length(p_idempotency_key)>200 then
    raise exception 'A valid checkout idempotency key is required' using errcode='22023';
  end if;

  v_fingerprint := md5(jsonb_build_object(
    'payment_method','card',
    'store_id',p_store_id,
    'order_type',p_order_type,
    'scheduled_for',p_scheduled_for,
    'address',case when p_address is null then null else p_address - 'delivery_quote_id' end,
    'contact_phone',p_contact_phone,
    'items',p_items,
    'subtotal',p_subtotal,
    'delivery_fee',p_delivery_fee,
    'service_fee',p_service_fee,
    'discount',p_discount,
    'tip',p_tip,
    'total',p_total,
    'notes',p_notes,
    'promo_code',p_promo_code
  )::text);

  insert into public.goodies_card_checkout_attempts as attempt(
    user_id,idempotency_key,request_fingerprint
  ) values(v_uid,p_idempotency_key,v_fingerprint)
  on conflict(user_id,idempotency_key) do nothing
  returning attempt.id into v_attempt_id;

  if v_attempt_id is null then
    select a.order_id,a.request_fingerprint
      into v_existing_order,v_existing_fingerprint
      from public.goodies_card_checkout_attempts a
     where a.user_id=v_uid and a.idempotency_key=p_idempotency_key
     for update;
    if v_existing_fingerprint is not null and v_existing_fingerprint is distinct from v_fingerprint then
      raise exception 'This checkout key was already used for different order details. Start a new checkout.' using errcode='22023';
    end if;
    if v_existing_order is null then
      raise exception 'This card checkout is already being processed. Please retry shortly' using errcode='55P03';
    end if;
    return query
      select o.id,o.order_code,o.status
        from public.goodies_orders o
       where o.id=v_existing_order and o.customer_id=v_uid;
    return;
  end if;

  perform set_config('app.goodies_payment_context','card',true);
  select * into v_created from public.place_goodies_order(
    p_store_id,p_order_type,p_scheduled_for,p_address,p_contact_phone,p_items,
    p_subtotal,p_delivery_fee,p_service_fee,p_discount,p_tip,p_total,p_notes,p_promo_code
  ) limit 1;
  if v_created.id is null then
    raise exception 'The order could not be created' using errcode='P0001';
  end if;
  update public.goodies_card_checkout_attempts
     set order_id=v_created.id
   where id=v_attempt_id;
  return query select v_created.id,v_created.order_code,v_created.status;
end;
$$;

revoke all on function public.place_goodies_card_order_once(text,text,text,timestamptz,jsonb,text,jsonb,numeric,numeric,numeric,numeric,numeric,numeric,text,text) from public,anon;
grant execute on function public.place_goodies_card_order_once(text,text,text,timestamptz,jsonb,text,jsonb,numeric,numeric,numeric,numeric,numeric,numeric,text,text) to authenticated,service_role;
