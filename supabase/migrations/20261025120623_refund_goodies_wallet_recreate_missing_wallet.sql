-- A wallet-funded order must still be refundable if the customer deleted their wallet
-- after paying. Recreate the zero-balance wallet and credit the idempotent refund.
create or replace function public.refund_goodies_wallet_order(p_order_id uuid, p_reason text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_o public.goodies_orders%rowtype;
  v_wallet_id uuid;
begin
  select * into v_o from public.goodies_orders where id = p_order_id for update;
  if not found or v_o.payment_method <> 'wallet' or v_o.payment_status <> 'paid' then
    return false;
  end if;
  if exists (
    select 1 from public.wallet_transactions
    where reference_id = v_o.id::text
      and activity_type = 'goodies_order_refund'
      and direction = 'credit'
  ) then
    return false;
  end if;

  insert into public.wallets (user_id, balance)
  values (v_o.customer_id, 0)
  on conflict (user_id) do nothing;

  select id into v_wallet_id
  from public.wallets
  where user_id = v_o.customer_id
  for update;
  if not found then raise exception 'Could not restore customer wallet for refund' using errcode = 'P0001'; end if;

  update public.wallets
  set balance = balance + v_o.total, updated_at = now()
  where id = v_wallet_id;

  insert into public.wallet_transactions (
    user_id, amount, description, status, wallet_amount, wallet_currency,
    feature_name, activity_type, direction, reference_id, metadata
  ) values (
    v_o.customer_id, v_o.total, 'Refund for Goodies order ' || v_o.order_code,
    'completed', v_o.total, 'USD', 'Goodies', 'goodies_order_refund', 'credit',
    v_o.id::text,
    jsonb_build_object('order_id', v_o.id, 'order_code', v_o.order_code, 'reason', left(coalesce(p_reason, ''), 120))
  );

  update public.goodies_orders
  set payment_status = 'refunded', updated_at = now()
  where id = v_o.id;
  return true;
end;
$$;

revoke all on function public.refund_goodies_wallet_order(uuid, text) from public, anon, authenticated;
grant execute on function public.refund_goodies_wallet_order(uuid, text) to service_role;
