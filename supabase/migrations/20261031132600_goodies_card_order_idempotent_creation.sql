create table if not exists public.goodies_card_checkout_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key text not null check (length(idempotency_key) between 8 and 200),
  order_id uuid references public.goodies_orders(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id,idempotency_key)
);
alter table public.goodies_card_checkout_attempts enable row level security;
revoke all on public.goodies_card_checkout_attempts from public, anon, authenticated;
grant all on public.goodies_card_checkout_attempts to service_role;

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
  v_created record;
begin
  if v_uid is null then raise exception 'Sign in to place an order' using errcode='28000'; end if;
  if p_idempotency_key is null or length(p_idempotency_key) < 8 or length(p_idempotency_key) > 200 then
    raise exception 'A valid checkout idempotency key is required' using errcode='22023';
  end if;
  insert into public.goodies_card_checkout_attempts(user_id,idempotency_key)
  values(v_uid,p_idempotency_key)
  on conflict(user_id,idempotency_key) do nothing
  returning id into v_attempt_id;
  if v_attempt_id is null then
    select a.order_id into v_existing_order
      from public.goodies_card_checkout_attempts a
     where a.user_id=v_uid and a.idempotency_key=p_idempotency_key
     for update;
    if v_existing_order is null then
      raise exception 'This card checkout is already being processed. Please retry shortly' using errcode='55P03';
    end if;
    return query select o.id,o.order_code,o.status
      from public.goodies_orders o where o.id=v_existing_order;
    return;
  end if;
  select * into v_created from public.place_goodies_order(
    p_store_id,p_order_type,p_scheduled_for,p_address,p_contact_phone,p_items,
    p_subtotal,p_delivery_fee,p_service_fee,p_discount,p_tip,p_total,p_notes,p_promo_code
  ) limit 1;
  update public.goodies_card_checkout_attempts set order_id=v_created.id where id=v_attempt_id;
  return query select v_created.id,v_created.order_code,v_created.status;
end;
$$;
revoke all on function public.place_goodies_card_order_once(text,text,text,timestamptz,jsonb,text,jsonb,numeric,numeric,numeric,numeric,numeric,numeric,text,text) from public,anon;
grant execute on function public.place_goodies_card_order_once(text,text,text,timestamptz,jsonb,text,jsonb,numeric,numeric,numeric,numeric,numeric,numeric,text,text) to authenticated,service_role;
