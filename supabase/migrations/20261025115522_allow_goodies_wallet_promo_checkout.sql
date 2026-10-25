-- Wallet checkout passes the same server-validated promo code to order placement.
drop function if exists public.place_goodies_order_with_wallet(text,text,timestamp with time zone,jsonb,text,jsonb,numeric,numeric,numeric,numeric,numeric,numeric,text);
CREATE OR REPLACE FUNCTION public.place_goodies_order_with_wallet(p_store_id text, p_order_type text, p_scheduled_for timestamp with time zone, p_address jsonb, p_contact_phone text, p_items jsonb, p_subtotal numeric, p_delivery_fee numeric, p_service_fee numeric, p_discount numeric, p_tip numeric, p_total numeric, p_notes text, p_promo_code text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, order_code text, status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid uuid:=auth.uid();
  v_wallet_id uuid;
  v_balance numeric;
  v_id uuid;
  v_code text;
  v_status text;
begin
  if v_uid is null then raise exception 'Sign in to place an order' using errcode='28000'; end if;
  if p_total is null or p_total<=0 then raise exception 'Invalid order total' using errcode='22023'; end if;
  select w.id,w.balance into v_wallet_id,v_balance from public.wallets w where w.user_id=v_uid for update;
  if not found then raise exception 'No Wantiss wallet found. Create your wallet to pay with it.' using errcode='P0002'; end if;
  if v_balance < p_total then raise exception 'Insufficient Wantiss wallet balance. Add funds or choose another payment method.' using errcode='P0001'; end if;

  select o.id,o.order_code,o.status into v_id,v_code,v_status
  from public.place_goodies_order(p_store_id,p_order_type,p_scheduled_for,p_address,p_contact_phone,p_items,
    p_subtotal,p_delivery_fee,p_service_fee,p_discount,p_tip,p_total,p_notes,p_promo_code) o;

  update public.wallets set balance=balance-p_total,updated_at=now() where id=v_wallet_id;
  insert into public.wallet_transactions(user_id,amount,description,status,wallet_amount,wallet_currency,feature_name,activity_type,direction,reference_id,metadata)
  values(v_uid,p_total,'Goodies order '||v_code,'completed',p_total,'USD','Goodies','goodies_order_payment','debit',v_id::text,
    jsonb_build_object('order_id',v_id,'order_code',v_code));
  update public.goodies_orders set payment_method='wallet',payment_status='paid',updated_at=now() where id=v_id;
  return query select v_id,v_code,v_status;
end $function$
;
revoke all on function public.place_goodies_order_with_wallet(text,text,timestamp with time zone,jsonb,text,jsonb,numeric,numeric,numeric,numeric,numeric,numeric,text,text) from public,anon;
grant execute on function public.place_goodies_order_with_wallet(text,text,timestamp with time zone,jsonb,text,jsonb,numeric,numeric,numeric,numeric,numeric,numeric,text,text) to authenticated;
