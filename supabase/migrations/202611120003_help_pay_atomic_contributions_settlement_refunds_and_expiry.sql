-- Atomic, serialized Wallet contributions; finalization and refunds are in the same DB transaction.
create or replace function public.help_pay_contribute_wallet(p_request_id uuid,p_amount_cents bigint,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare v_user uuid:=auth.uid(); r public.help_pay_requests%rowtype; v_prev public.help_pay_contributions%rowtype;
  v_bal numeric; v_tx uuid; v_remaining bigint; v_s jsonb; v_order record; v_err text; v_status text;
begin
 if v_user is null then raise exception 'Sign in to contribute'; end if;
 if p_idempotency_key is null or length(p_idempotency_key)<8 or length(p_idempotency_key)>180 then raise exception 'Invalid payment key'; end if;
 if p_request_id is null then raise exception 'Invalid payment request'; end if;
 select * into r from public.help_pay_requests where id=p_request_id for update;
 if not found then raise exception 'Payment request not found'; end if;
 select * into v_prev from public.help_pay_contributions where contributor_id=v_user and idempotency_key=p_idempotency_key;
 if found then
   if v_prev.request_id<>p_request_id or v_prev.amount_cents<>p_amount_cents then raise exception 'Payment key was reused for a different contribution'; end if;
   return jsonb_build_object('ok',v_prev.status='paid','already_processed',true,'status',v_prev.status,'request_id',p_request_id);
 end if;
 if r.status<>'active' or r.expires_at<=now() then raise exception 'This payment request is no longer accepting payments'; end if;
 if v_user=r.creator_id then raise exception 'You cannot contribute to your own shared request'; end if;
 v_remaining:=r.total_cents-r.initial_cents-r.contributed_cents;
 if p_amount_cents is null or p_amount_cents<1 or p_amount_cents>v_remaining then raise exception 'Amount exceeds the remaining bill'; end if;
 if r.mode='full' and p_amount_cents<>v_remaining then raise exception 'This request requires one full payment'; end if;
 select balance into v_bal from public.wallets where user_id=v_user for update;
 if not found then raise exception 'Create a Wantiss Wallet to contribute'; end if;
 if v_bal<p_amount_cents::numeric/100 then raise exception 'Insufficient Wallet balance'; end if;
 update public.wallets set balance=balance-p_amount_cents::numeric/100,updated_at=now() where user_id=v_user and balance>=p_amount_cents::numeric/100;
 if not found then raise exception 'Insufficient Wallet balance'; end if;
 insert into public.wallet_transactions(user_id,amount,status,description,wallet_amount,wallet_currency,feature_name,activity_type,direction,reference_id,metadata)
 values(v_user,p_amount_cents::numeric/100,'completed','Help Pay contribution',p_amount_cents::numeric/100,'USD','Goodies','help_pay_contribution','debit',p_request_id::text,jsonb_build_object('request_id',p_request_id))
 returning id into v_tx;
 insert into public.help_pay_contributions(request_id,contributor_id,amount_cents,payment_method,idempotency_key,wallet_transaction_id,status)
 values(p_request_id,v_user,p_amount_cents,'wallet',p_idempotency_key,v_tx,'paid');
 v_remaining:=v_remaining-p_amount_cents;
 update public.help_pay_requests set contributed_cents=contributed_cents+p_amount_cents,status=case when v_remaining=0 then 'funded' else 'active' end where id=p_request_id;
 if v_remaining>0 then
   return jsonb_build_object('ok',true,'status','active','request_id',p_request_id,'remaining_cents',v_remaining);
 end if;
 -- Full funding: create the actual order for its original creator, never the contributor.
 v_s:=r.checkout_snapshot;
 begin
   perform set_config('app.goodies_payment_context','wallet',true);
   select o.* into v_order from private.help_pay_place_goodies_order(
     r.creator_id,v_s->>'p_store_id',v_s->>'p_order_type',
     nullif(v_s->>'p_scheduled_for','')::timestamptz,
     v_s->'p_address',v_s->>'p_contact_phone',v_s->'p_items',
     (v_s->>'p_subtotal')::numeric,(v_s->>'p_delivery_fee')::numeric,
     (v_s->>'p_service_fee')::numeric,(v_s->>'p_discount')::numeric,
     (v_s->>'p_tip')::numeric,(v_s->>'p_total')::numeric,
     v_s->>'p_notes',v_s->>'p_promo_code'
   ) o limit 1;
   if v_order.id is null then raise exception 'Order finalization failed'; end if;
   update public.goodies_orders set payment_method='wallet',payment_status='paid',updated_at=now()
     where id=v_order.id and customer_id=r.creator_id;
   if not found then raise exception 'Order finalization could not verify the customer'; end if;
   update public.help_pay_requests set order_id=v_order.id,status='fulfilled' where id=p_request_id;
   update public.wallet_transactions set metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('order_id',v_order.id)
     where id in (select wallet_transaction_id from public.help_pay_contributions where request_id=p_request_id);
 exception when others then
   v_err:=SQLERRM;
 end;
 if v_err is not null then
   perform private.help_pay_reverse_locked(p_request_id,'cancelled');
   return jsonb_build_object('ok',false,'status','cancelled','refunded',true,'request_id',p_request_id,
     'message','The Goodies checkout changed or became unavailable. All Help Pay wallet contributions were refunded. '||left(v_err,160));
 end if;
 return jsonb_build_object('ok',true,'status','fulfilled','order_id',v_order.id,'order_code',v_order.order_code,'request_id',p_request_id,'remaining_cents',0);
end $$;
revoke all on function public.help_pay_contribute_wallet(uuid,bigint,text) from public,anon,authenticated;
-- Execution is enabled only after the integration tests below.
create or replace function public.help_pay_cancel_request(p_request_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare v_user uuid:=auth.uid(); r public.help_pay_requests%rowtype; n int;
begin
 if v_user is null then raise exception 'Sign in to cancel'; end if;
 select * into r from public.help_pay_requests where id=p_request_id and creator_id=v_user for update;
 if not found then raise exception 'Payment request not found'; end if;
 if r.status not in ('active','pending') then raise exception 'This request cannot be cancelled'; end if;
 n:=private.help_pay_reverse_locked(p_request_id,'cancelled');
 return jsonb_build_object('ok',true,'status','cancelled','refunded_payments',n);
end $$;
revoke all on function public.help_pay_cancel_request(uuid) from public,anon;
grant execute on function public.help_pay_cancel_request(uuid) to authenticated;
create or replace function public.help_pay_refund_request(p_request_id uuid)
returns integer language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare r public.help_pay_requests%rowtype;
begin
 if auth.uid() is not null then raise exception 'Internal operation only'; end if;
 select * into r from public.help_pay_requests where id=p_request_id for update;
 if not found or r.status not in ('refund_pending','expired','cancelled') then raise exception 'Not refundable'; end if;
 return private.help_pay_reverse_locked(p_request_id,case when r.status='cancelled' then 'cancelled' else 'expired' end);
end $$;
revoke all on function public.help_pay_refund_request(uuid) from public,anon,authenticated;
grant execute on function public.help_pay_refund_request(uuid) to service_role;
create or replace function public.help_pay_expire()
returns integer language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare v_id uuid; v_count int:=0;
begin
 if auth.uid() is not null then raise exception 'Internal operation only'; end if;
 for v_id in select id from public.help_pay_requests
   where status in ('active','pending','refund_pending') and (status='refund_pending' or expires_at<=now())
   order by created_at for update skip locked loop
   perform private.help_pay_reverse_locked(v_id,'expired');
   v_count:=v_count+1;
 end loop;
 return v_count;
end $$;
revoke all on function public.help_pay_expire() from public,anon,authenticated;
grant execute on function public.help_pay_expire() to service_role;
-- Route all regular Goodies cancellation/decline/expiry refunds through split payer ledger where needed.
CREATE OR REPLACE FUNCTION public.refund_goodies_wallet_order(p_order_id uuid, p_reason text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_o public.goodies_orders%rowtype;
  v_wallet_id uuid;
  v_help_id uuid;
begin
  select * into v_o from public.goodies_orders where id = p_order_id for update;
  if not found or v_o.payment_method <> 'wallet' or v_o.payment_status <> 'paid' then
    return false;
  end if;
  -- Shared Help Pay orders have multiple payers: refund EACH payer, not only the order owner.
  select id into v_help_id from public.help_pay_requests where order_id=p_order_id for update;
  if v_help_id is not null then
    perform private.help_pay_reverse_locked(v_help_id,'cancelled');
    update public.goodies_orders set payment_status='refunded',payment_refunded_at=now(),updated_at=now() where id=p_order_id;
    return true;
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
$function$
;
-- A scheduled job refunds expired requests even if no participant re-opens the app.
do $cron$begin
  if exists(select 1 from pg_extension where extname='pg_cron') then
    perform cron.schedule('wantiss-help-pay-expire','* * * * *','select public.help_pay_expire()');
  end if;
end $cron$;
