begin;

-- Deploy with funding paused. Recovery/refunds remain available independently.
create table private.goodies_shared_bill_config(singleton boolean primary key default true check(singleton),wallet_enabled boolean not null default false);
insert into private.goodies_shared_bill_config values(true,false);
alter table private.goodies_shared_bill_config enable row level security;
revoke all on private.goodies_shared_bill_config from public,anon,authenticated;
alter table public.help_pay_requests add column refund_attempts integer not null default 0 check(refund_attempts>=0),add column refund_retry_at timestamptz,add column refund_failure_code text,add column refund_attention_required boolean not null default false,add column refund_result text check(refund_result in ('expired','cancelled'));

create or replace function public.help_pay_wallet_enabled()
returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select wallet_enabled from private.goodies_shared_bill_config where singleton),false)
$$;
revoke all on function public.help_pay_wallet_enabled() from public,anon;
grant execute on function public.help_pay_wallet_enabled() to authenticated;

create function private.help_pay_assert_funding()
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='28000';end if;
 if not public.help_pay_wallet_enabled() then raise exception 'Shared payments unavailable' using errcode='55000';end if;
 if not private.goodies_customer_can_access() then raise exception 'Goodies access required' using errcode='42501';end if;
 if not exists(select 1 from public.wantiss_cms_content where content_key='goodies.content' and locale='en' and status='published' and coalesce(payload#>>'{fees,pay,Wallet}','false') in ('true','1','TRUE')) then raise exception 'Wallet payments unavailable' using errcode='55000';end if;
end $$;

-- All Shared Bill operations take request locks first, then payer Wallet locks
-- in a common order, including the final contributor's potential refund.
create function private.help_pay_lock_wallets(p_request_id uuid,p_extra uuid default null)
returns void language plpgsql security definer set search_path='' as $$
declare payer uuid;
begin
 for payer in select distinct contributor_id from public.help_pay_contributions where request_id=p_request_id and status in ('paid','refund_pending')
  union select p_extra where p_extra is not null order by 1
 loop
  if payer is distinct from p_extra then insert into public.wallets(user_id,balance) values(payer,0) on conflict(user_id) do nothing;end if;
  perform 1 from public.wallets where user_id=payer and balance::text not in ('NaN','Infinity','-Infinity') for update;
  if not found then raise exception 'Wallet unavailable' using errcode='55000';end if;
 end loop;
end $$;

-- Financial totals use exact cents. Validation-only requests also check
-- aggregate stock before any Wallet reservation, without consuming inventory.
-- Keep all checkout variants consistent with the deployed first-delivery rule.
do $first_delivery$
declare f record;definition text;matched integer:=0;
begin
 for f in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('place_goodies_order','goodies_place_multi_order','goodies_group_order_checkout','goodies_group_order_checkout_estimate') loop
  definition:=pg_get_functiondef(f.oid);
  definition:=regexp_replace(definition,'where o.customer_id\s*=\s*v_uid\)','where o.customer_id=v_uid and o.order_type=''delivery'')','g');
  if position('o.customer_id=v_uid and o.order_type=''delivery''' in definition)=0 then raise exception 'First-delivery checkout contract drift';end if;
  execute definition;matched:=matched+1;
 end loop;
 if matched<>4 then raise exception 'Checkout variants drifted';end if;
end $first_delivery$;

do $canonical$
declare definition text;needle text;
begin
 definition:=pg_get_functiondef('public.place_goodies_order(text,text,timestamptz,jsonb,text,jsonb,numeric,numeric,numeric,numeric,numeric,numeric,text,text)'::regprocedure);
 needle:='if abs(v_sum-p_subtotal)>0.01 or abs((p_subtotal+p_delivery_fee+p_service_fee-p_discount+p_tip)-p_total)>0.01 then';
 if position(needle in definition)=0 then raise exception 'Checkout totals drift: review Shared Bill migration';end if;
 definition:=replace(definition,needle,'if round(v_sum,2)<>p_subtotal or round(p_subtotal+p_delivery_fee+p_service_fee-p_discount+p_tip,2)<>p_total then');
 needle:='if abs(coalesce(p_discount,0)-v_expected_discount)>0.01 then';
 if position(needle in definition)=0 then raise exception 'Checkout discount drift';end if;
 definition:=replace(definition,needle,'if p_discount<>round(v_expected_discount,2) then');
 needle:='  if p_delivery_fee is null or p_service_fee is null';
 if position(needle in definition)=0 then raise exception 'Checkout amount validation drift';end if;
 definition:=replace(definition,needle,E'  if exists(select 1 from unnest(array[p_subtotal,p_delivery_fee,p_service_fee,p_discount,p_tip,p_total]) amount where amount is null or amount::text in (''NaN'',''Infinity'',''-Infinity'') or amount<>round(amount,2)) then raise exception ''Invalid order amounts'' using errcode=''22023'';end if;\n  if p_delivery_fee is null or p_service_fee is null');
 needle:='  if current_setting(''app.goodies_help_pay_validation'',true)=''on'' then return; end if;';
 if position(needle in definition)=0 then raise exception 'Checkout validation-only drift';end if;
 definition:=replace(definition,needle,E'  for v_agg in select (e->>''id'')::uuid as pid,sum((e->>''q'')::int) as qty from jsonb_array_elements(p_items) e where jsonb_typeof(e->''byo'') is distinct from ''object'' group by 1 loop\n perform 1 from public.goodies_products where id=v_agg.pid and business_id=v_store.business_id and stock>=v_agg.qty for update;\n if not found then raise exception ''An item in your cart is out of stock'' using errcode=''P0001'';end if;\n end loop;\n'||needle);
 needle:='case when p_order_type=''delivery'' then (p_address-''delivery_quote_id'') else null end';
 if position(needle in definition)=0 then raise exception 'Checkout delivery coordinates contract drift';end if;
 definition:=replace(definition,needle,'case when p_order_type=''delivery'' then p_address else null end');
 execute definition;
end $canonical$;

-- Retain the exact validated quote through INSERT, then strip its internal id.
-- Shared requests can remain open longer than the old six-minute fallback.
create or replace function public.goodies_orders_capture_delivery_coordinates()
returns trigger language plpgsql security definer set search_path='' as $$
declare quote public.goodies_delivery_quotes%rowtype;quote_id uuid;
begin
 if new.order_type='delivery' and new.address is not null then
  if nullif(new.address->>'delivery_quote_id','') is not null then
   begin quote_id:=(new.address->>'delivery_quote_id')::uuid;exception when invalid_text_representation then raise exception 'Invalid delivery quote' using errcode='22023';end;
   select * into quote from public.goodies_delivery_quotes q where q.id=quote_id and q.customer_id=new.customer_id and q.store_id=new.store_id and q.address_payload=(new.address-'delivery_quote_id');
  else
   select * into quote from public.goodies_delivery_quotes q where q.customer_id=new.customer_id and q.store_id=new.store_id and q.address_payload=(new.address-'delivery_quote_id') and q.created_at>now()-interval '6 minutes' order by q.created_at desc limit 1;
  end if;
  if found then
   new.store_latitude:=quote.origin_latitude;new.store_longitude:=quote.origin_longitude;new.delivery_latitude:=quote.destination_latitude;new.delivery_longitude:=quote.destination_longitude;new.delivery_route:=quote.route_geometry;
  end if;
  new.address:=new.address-'delivery_quote_id';
 end if;
 return new;
end $$;
revoke all on function public.goodies_orders_capture_delivery_coordinates() from public,anon,authenticated;

-- Refresh the existing private finalizer from the CURRENT canonical validator,
-- preserving the hardened pricing/builders/moderation and order triggers.
do $finalizer$
declare definition text;original text;
begin
 original:=pg_get_functiondef('public.place_goodies_order(text,text,timestamptz,jsonb,text,jsonb,numeric,numeric,numeric,numeric,numeric,numeric,text,text)'::regprocedure);
 if position('app.goodies_help_pay_validation' in original)=0 or position('v_uid uuid := auth.uid()' in original)=0 then raise exception 'Canonical checkout drift: review Shared Bill finalizer before deployment';end if;
 definition:=replace(original,'FUNCTION public.place_goodies_order(p_store_id text','FUNCTION private.help_pay_place_goodies_order(p_creator_id uuid, p_store_id text');
 definition:=replace(definition,'v_uid uuid := auth.uid()','v_uid uuid := p_creator_id');
 definition:=replace(definition,'  select * into v_store from public.goodies_store_schedules',
  E'  if exists(select 1 from public.wantiss_admin_account_restrictions r where r.target_user_id=p_creator_id and r.scope in (''all'',''GoodiesCustomer'') and r.status=''active'' and r.starts_at<=now() and (r.ends_at is null or r.ends_at>now())) then raise exception ''Customer access required'' using errcode=''42501'';end if;\n  select * into v_store from public.goodies_store_schedules');
 if definition=original or position('v_uid uuid := auth.uid()' in definition)>0 or position('r.target_user_id=p_creator_id' in definition)=0 then raise exception 'Shared Bill finalizer drift';end if;
 execute definition;
end $finalizer$;

create or replace function private.help_pay_reverse_locked(p_request_id uuid,p_result text)
returns integer language plpgsql security definer set search_path='' as $$
declare request public.help_pay_requests%rowtype;contribution public.help_pay_contributions%rowtype;refunded integer:=0;
begin
 if p_result is null or p_result not in ('expired','cancelled') then raise exception 'Invalid refund result' using errcode='22023';end if;
 select * into request from public.help_pay_requests where id=p_request_id for update;
 if not found then raise exception 'Payment request unavailable' using errcode='P0002';end if;
 perform private.help_pay_lock_wallets(p_request_id);
 for contribution in select * from public.help_pay_contributions where request_id=p_request_id and status in ('paid','refund_pending') order by contributor_id,id for update loop
  if contribution.payment_method<>'wallet' then raise exception 'Provider refund review required' using errcode='55000';end if;
  update public.wallets set balance=balance+contribution.amount_cents::numeric/100,updated_at=now() where user_id=contribution.contributor_id;
  if not found then raise exception 'Refund unavailable' using errcode='55000';end if;
  insert into public.wallet_transactions(user_id,amount,status,description,wallet_amount,wallet_currency,feature_name,activity_type,direction,reference_id,metadata)
  values(contribution.contributor_id,contribution.amount_cents::numeric/100,'completed','Help Pay refund',contribution.amount_cents::numeric/100,'USD','Goodies','help_pay_refund','credit',contribution.id::text,jsonb_build_object('request_id',p_request_id,'contribution_id',contribution.id,'order_id',request.order_id));
  update public.help_pay_contributions set status='refunded' where id=contribution.id;
  refunded:=refunded+1;
 end loop;
 update public.help_pay_requests set status=p_result,contributed_cents=0 where id=p_request_id;
 return refunded;
end $$;

create function private.help_pay_refund_or_queue(p_request_id uuid,p_result text)
returns boolean language plpgsql security definer set search_path='' as $$
declare request public.help_pay_requests%rowtype;
begin
 begin
  perform private.help_pay_reverse_locked(p_request_id,p_result);
  select * into request from public.help_pay_requests where id=p_request_id;
  update public.help_pay_requests set refund_retry_at=null,refund_failure_code=null,refund_attention_required=false,refund_result=null where id=p_request_id;
  if request.order_id is not null then update public.goodies_orders set payment_status='refunded',payment_refunded_amount=total,payment_refunded_at=now(),updated_at=now() where id=request.order_id and payment_status in ('paid','refund_pending');end if;
  return true;
 exception when others then
  update public.help_pay_contributions set status='refund_pending' where request_id=p_request_id and status in ('paid','refund_pending');
  update public.help_pay_requests set status='refund_pending',refund_result=p_result,refund_attempts=refund_attempts+1,refund_retry_at=now()+least(interval '1 hour',interval '1 minute'*power(2,least(refund_attempts,6))),refund_failure_code=SQLSTATE,refund_attention_required=(refund_attempts+1>=8) where id=p_request_id returning * into request;
  if request.refund_attempts in (1,8) then
   insert into public.notifications(user_id,title,body,notification_type,feature_name,destination,metadata)
   select s.user_id,'Shared Bill refund needs attention','A Shared Bill refund is waiting for recovery. Review the Goodies refund queue.','goodies_admin_shared_refund','Goodies','goodiesOrders',jsonb_build_object('request_id',p_request_id,'page','goodiesOrders') from public.wantiss_admin_staff s join auth.users u on u.id=s.user_id where s.status='active' and s.role='super_admin' and u.email_confirmed_at is not null and (s.invitation_expires_at is null or s.invitation_expires_at>now());
  end if;
  return false;
 end;
end $$;

create or replace function public.help_pay_create_request(p_mode text,p_total_cents bigint,p_checkout_key text,p_checkout_snapshot jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid();existing public.help_pay_requests%rowtype;v_request_id uuid;initial bigint;total numeric;snapshot jsonb:=p_checkout_snapshot;previous_validation text;
begin
 if caller is null then raise exception 'Sign in required' using errcode='28000';end if;
 if p_mode is null or p_mode not in ('share','full') or p_total_cents is null or p_total_cents<1 or p_total_cents>100000000 or p_checkout_key is null or length(btrim(p_checkout_key))<12 or length(p_checkout_key)>180 then raise exception 'Invalid payment request' using errcode='22023';end if;
 if jsonb_typeof(snapshot) is distinct from 'object' or jsonb_typeof(snapshot->'p_items') is distinct from 'array' then raise exception 'Checkout required' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('help-pay:'||caller::text||':'||p_checkout_key,0));
 select * into existing from public.help_pay_requests where creator_id=caller and checkout_key=p_checkout_key for update;
 if found then
  if existing.mode<>p_mode or existing.total_cents<>p_total_cents or existing.checkout_snapshot<>snapshot then raise exception 'Checkout key already used' using errcode='22023';end if;
  return existing.id;
 end if;
 perform private.help_pay_assert_funding();
 begin total:=(snapshot->>'p_total')::numeric;exception when others then raise exception 'Invalid checkout total' using errcode='22023';end;
 if total is null or total::text in ('NaN','Infinity','-Infinity') or total<=0 or total<>round(total,2) or total*100<>p_total_cents then raise exception 'Checkout total changed' using errcode='22023';end if;
 initial:=case when p_mode='share' then (p_total_cents*60+99)/100 else 0 end;
 if p_mode='share' and initial>=p_total_cents then raise exception 'Bill is too small to split' using errcode='22023';end if;
 previous_validation:=current_setting('app.goodies_help_pay_validation',true);
 perform set_config('app.goodies_help_pay_validation','on',true);
 perform 1 from public.place_goodies_order(snapshot->>'p_store_id',snapshot->>'p_order_type',nullif(snapshot->>'p_scheduled_for','')::timestamptz,snapshot->'p_address',snapshot->>'p_contact_phone',snapshot->'p_items',(snapshot->>'p_subtotal')::numeric,(snapshot->>'p_delivery_fee')::numeric,(snapshot->>'p_service_fee')::numeric,(snapshot->>'p_discount')::numeric,(snapshot->>'p_tip')::numeric,total,snapshot->>'p_notes',snapshot->>'p_promo_code');
 perform set_config('app.goodies_help_pay_validation',coalesce(previous_validation,''),true);
 if coalesce(snapshot->'p_address','{}'::jsonb)?'delivery_quote_id' then
  update public.goodies_delivery_quotes set expires_at=greatest(expires_at,now()+interval '30 minutes') where id=(snapshot->'p_address'->>'delivery_quote_id')::uuid and customer_id=caller and store_id=snapshot->>'p_store_id' and address_payload=((snapshot->'p_address')-'delivery_quote_id') and expires_at>now() and consumed_at is null;
  if not found then raise exception 'Delivery quote changed' using errcode='22023';end if;
 end if;
 if initial>0 then
  perform 1 from public.wallets where user_id=caller and balance>=initial::numeric/100 and balance::text not in ('NaN','Infinity','-Infinity') for update;
  if not found then raise exception 'Insufficient Wallet balance' using errcode='P4001';end if;
 end if;
 insert into public.help_pay_requests(creator_id,service,mode,checkout_key,checkout_snapshot,total_cents,initial_cents,contributed_cents,currency,status,expires_at)
 values(caller,'goodies',p_mode,p_checkout_key,snapshot,p_total_cents,initial,0,'USD','active',now()+interval '30 minutes') returning id into v_request_id;
 if initial>0 then
  update public.wallets set balance=balance-initial::numeric/100,updated_at=now() where user_id=caller;
  insert into public.help_pay_contributions(request_id,contributor_id,amount_cents,payment_method,idempotency_key,wallet_transaction_id,status)
  values(v_request_id,caller,initial,'wallet','help-pay-upfront-'||v_request_id::text,null,'paid');
  with written_transaction as (
   insert into public.wallet_transactions(user_id,amount,status,description,wallet_amount,wallet_currency,feature_name,activity_type,direction,reference_id,metadata)
   values(caller,initial::numeric/100,'completed','Help Pay upfront share',initial::numeric/100,'USD','Goodies','help_pay_upfront','debit',v_request_id::text,jsonb_build_object('request_id',v_request_id)) returning id
  ) update public.help_pay_contributions set wallet_transaction_id=(select id from written_transaction) where help_pay_contributions.request_id=v_request_id and contributor_id=caller;
 end if;
 return v_request_id;
end $$;

create or replace function public.help_pay_contribute_wallet(p_request_id uuid,p_amount_cents bigint,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid();request public.help_pay_requests%rowtype;previous public.help_pay_contributions%rowtype;transaction_id uuid;remaining bigint;checkout jsonb;placed record;failed boolean:=false;previous_context text;previous_validation text;
begin
 if caller is null then raise exception 'Sign in required' using errcode='28000';end if;
 if p_request_id is null or p_amount_cents is null or p_amount_cents<1 or p_amount_cents>100000000 or p_idempotency_key is null or length(btrim(p_idempotency_key))<8 or length(p_idempotency_key)>180 then raise exception 'Invalid contribution' using errcode='22023';end if;
 select * into request from public.help_pay_requests where id=p_request_id and service='goodies' for update;
 if not found then raise exception 'Payment request unavailable' using errcode='P0002';end if;
 select * into previous from public.help_pay_contributions where contributor_id=caller and idempotency_key=p_idempotency_key;
 if found then
  if previous.request_id<>p_request_id or previous.amount_cents<>p_amount_cents then raise exception 'Payment key already used' using errcode='22023';end if;
  return jsonb_build_object('ok',previous.status='paid','already_processed',true,'status',request.status,'contribution_status',previous.status,'amount_cents',previous.amount_cents,'request_id',p_request_id,'order_id',request.order_id,'refunded',previous.status='refunded');
 end if;
 perform private.help_pay_assert_funding();
 if request.status<>'active' or request.expires_at<=now() or caller=request.creator_id then raise exception 'Request does not accept this contribution' using errcode='22023';end if;
 remaining:=request.total_cents-request.initial_cents-request.contributed_cents;
 if p_amount_cents>remaining or (request.mode='full' and p_amount_cents<>remaining) then raise exception 'Contribution exceeds remaining bill' using errcode='22023';end if;
 perform private.help_pay_lock_wallets(p_request_id,caller);
 update public.wallets set balance=balance-p_amount_cents::numeric/100,updated_at=now() where user_id=caller and balance>=p_amount_cents::numeric/100;
 if not found then raise exception 'Insufficient Wallet balance' using errcode='P4001';end if;
 insert into public.wallet_transactions(user_id,amount,status,description,wallet_amount,wallet_currency,feature_name,activity_type,direction,reference_id,metadata)
 values(caller,p_amount_cents::numeric/100,'completed','Help Pay contribution',p_amount_cents::numeric/100,'USD','Goodies','help_pay_contribution','debit',p_request_id::text,jsonb_build_object('request_id',p_request_id)) returning id into transaction_id;
 insert into public.help_pay_contributions(request_id,contributor_id,amount_cents,payment_method,idempotency_key,wallet_transaction_id,status)
 values(p_request_id,caller,p_amount_cents,'wallet',p_idempotency_key,transaction_id,'paid');
 remaining:=remaining-p_amount_cents;
 update public.help_pay_requests set contributed_cents=contributed_cents+p_amount_cents,status=case when remaining=0 then 'funded' else 'active' end where id=p_request_id;
 if remaining>0 then return jsonb_build_object('ok',true,'status','active','contribution_status','paid','amount_cents',p_amount_cents,'request_id',p_request_id,'remaining_cents',remaining);end if;
 checkout:=request.checkout_snapshot;
 previous_context:=current_setting('app.goodies_payment_context',true);previous_validation:=current_setting('app.goodies_help_pay_validation',true);
 begin
  perform set_config('app.goodies_payment_context','wallet',true);perform set_config('app.goodies_help_pay_validation','off',true);
  select * into placed from private.help_pay_place_goodies_order(request.creator_id,checkout->>'p_store_id',checkout->>'p_order_type',nullif(checkout->>'p_scheduled_for','')::timestamptz,checkout->'p_address',checkout->>'p_contact_phone',checkout->'p_items',(checkout->>'p_subtotal')::numeric,(checkout->>'p_delivery_fee')::numeric,(checkout->>'p_service_fee')::numeric,(checkout->>'p_discount')::numeric,(checkout->>'p_tip')::numeric,(checkout->>'p_total')::numeric,checkout->>'p_notes',checkout->>'p_promo_code') limit 1;
  if placed.id is null then raise exception 'Checkout unavailable';end if;
  update public.goodies_orders set payment_method='wallet',payment_status='paid',updated_at=now() where id=placed.id and customer_id=request.creator_id;
  if not found then raise exception 'Checkout unavailable';end if;
  update public.help_pay_requests set order_id=placed.id,status='fulfilled' where id=p_request_id;
  update public.wallet_transactions set metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('order_id',placed.id) where id in (select wallet_transaction_id from public.help_pay_contributions where request_id=p_request_id);
 exception when others then failed:=true;raise log 'Shared Bill finalization failed for request %, SQLSTATE %',p_request_id,SQLSTATE;
 end;
 perform set_config('app.goodies_payment_context',coalesce(previous_context,''),true);perform set_config('app.goodies_help_pay_validation',coalesce(previous_validation,''),true);
 if failed then
  if private.help_pay_refund_or_queue(p_request_id,'cancelled') then
   return jsonb_build_object('ok',false,'status','cancelled','contribution_status','refunded','amount_cents',p_amount_cents,'refunded',true,'request_id',p_request_id,'code','checkout_unavailable');
  end if;
  return jsonb_build_object('ok',false,'status','refund_pending','contribution_status','refund_pending','amount_cents',p_amount_cents,'refunded',false,'request_id',p_request_id,'code','refund_pending');
 end if;
 return jsonb_build_object('ok',true,'status','fulfilled','contribution_status','paid','amount_cents',p_amount_cents,'order_id',placed.id,'request_id',p_request_id,'remaining_cents',0);
end $$;

create or replace function public.help_pay_cancel_request(p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare request public.help_pay_requests%rowtype;refunded boolean;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='28000';end if;
 select * into request from public.help_pay_requests where id=p_request_id and creator_id=auth.uid() for update;
 if not found then raise exception 'Payment request unavailable' using errcode='42501';end if;
 if request.status in ('expired','cancelled') then return jsonb_build_object('ok',true,'status',request.status,'refunded',true,'already_processed',true);end if;
 if request.status not in ('active','pending','refund_pending') then raise exception 'Order cancellation required' using errcode='22023';end if;
 if request.status='refund_pending' and request.refund_retry_at>now() then return jsonb_build_object('ok',true,'status','refund_pending','refunded',false,'already_processed',true);end if;
 refunded:=private.help_pay_refund_or_queue(p_request_id,'cancelled');
 return jsonb_build_object('ok',true,'status',case when refunded then 'cancelled' else 'refund_pending' end,'refunded',refunded);
end $$;

create or replace function public.help_pay_status(p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare request public.help_pay_requests%rowtype;caller uuid:=auth.uid();mine bigint;returned bigint;donors jsonb:='[]';
begin
 if caller is null then raise exception 'Sign in required' using errcode='28000';end if;
 select * into request from public.help_pay_requests where id=p_request_id and service='goodies' for update;
 if not found or (request.status='pending' and request.creator_id<>caller) then raise exception 'Payment request unavailable' using errcode='P0002';end if;
 if (request.status in ('active','pending') and request.expires_at<=now()) or (request.status='refund_pending' and coalesce(request.refund_retry_at,now())<=now()) then
  perform private.help_pay_refund_or_queue(p_request_id,coalesce(request.refund_result,'expired'));select * into request from public.help_pay_requests where id=p_request_id;
 end if;
 select coalesce(sum(amount_cents) filter(where status in ('paid','refund_pending')),0),coalesce(sum(amount_cents) filter(where status='refunded'),0) into mine,returned from public.help_pay_contributions where request_id=p_request_id and contributor_id=caller;
 if request.creator_id=caller then
  select coalesce(jsonb_agg(jsonb_build_object('name',coalesce(nullif(btrim(p.full_name),''),'Wantiss member'),'amount_cents',c.amount_cents,'user_id',c.contributor_id) order by c.created_at),'[]') into donors from public.help_pay_contributions c left join public.profiles p on p.id=c.contributor_id where c.request_id=p_request_id and c.status='paid' and c.contributor_id<>caller;
 end if;
 return jsonb_build_object('id',request.id,'mode',request.mode,'service',request.service,'status',request.status,'total_cents',request.total_cents,'initial_cents',request.initial_cents,'contributed_cents',request.contributed_cents,'remaining_cents',request.total_cents-request.initial_cents-request.contributed_cents,'expires_at',request.expires_at,'is_creator',caller=request.creator_id,'my_contributed_cents',mine,'my_refunded_cents',returned,'contributors',donors,'order_id',case when caller=request.creator_id then request.order_id end);
end $$;

create function public.help_pay_request_for_checkout(p_checkout_key text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare request_id uuid;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='28000';end if;
 select id into request_id from public.help_pay_requests where creator_id=auth.uid() and checkout_key=p_checkout_key and service='goodies';
 return case when request_id is null then jsonb_build_object('found',false) else jsonb_build_object('found',true,'request',public.help_pay_status(request_id)) end;
end $$;

create function public.help_pay_contribution_status(p_request_id uuid,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare contribution public.help_pay_contributions%rowtype;request_status text;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='28000';end if;
 perform public.help_pay_status(p_request_id);
 select * into contribution from public.help_pay_contributions where request_id=p_request_id and contributor_id=auth.uid() and idempotency_key=p_idempotency_key;
 if not found then return jsonb_build_object('found',false);end if;
 select status into request_status from public.help_pay_requests where id=p_request_id;
 return jsonb_build_object('found',true,'request_id',p_request_id,'amount_cents',contribution.amount_cents,'contribution_status',contribution.status,'status',request_status,'ok',contribution.status='paid','refunded',contribution.status='refunded');
end $$;

create or replace function public.help_pay_expire()
returns integer language plpgsql security definer set search_path='' as $$
declare request record;processed integer:=0;
begin
 if auth.uid() is not null then raise exception 'Internal operation only' using errcode='42501';end if;
 for request in select id,refund_result from public.help_pay_requests where (status in ('active','pending') and expires_at<=now()) or (status='refund_pending' and coalesce(refund_retry_at,now())<=now()) order by created_at for update skip locked loop
  perform private.help_pay_refund_or_queue(request.id,coalesce(request.refund_result,'expired'));processed:=processed+1;
 end loop;
 return processed;
end $$;

-- Keep the existing cancellation authorization and regular Wallet refund path.
-- Only the Shared Bill branch gains durable recovery and correct refunded totals.
do $refund$
declare definition text;needle text:=E'perform private.help_pay_reverse_locked(v_help_id,''cancelled'');\n    update public.goodies_orders set payment_status=''refunded'',payment_refunded_at=now(),updated_at=now() where id=p_order_id;\n    return true;';
begin
 definition:=pg_get_functiondef('public.refund_goodies_wallet_order(uuid,text)'::regprocedure);
 if position(needle in definition)=0 then raise exception 'Wallet refund drift: review Shared Bill integration';end if;
 execute replace(definition,needle,E'if private.help_pay_refund_or_queue(v_help_id,''cancelled'') then\n update public.goodies_orders set payment_status=''refunded'',payment_refunded_amount=total,payment_refunded_at=now(),updated_at=now() where id=p_order_id;\n else update public.goodies_orders set payment_status=''refund_pending'',updated_at=now() where id=p_order_id;end if;\n return true;');
end $refund$;

-- Sharing is idempotent per request/friend while the request lock is held.
do $invitation$
declare definition text;needle text:='insert into public.messages(conversation_id,sender_id,body) values(v_conversation,v_user,v_message);';
begin
 definition:=pg_get_functiondef('public.help_pay_share_to_friend(uuid,uuid)'::regprocedure);
 if position(needle in definition)=0 then raise exception 'Shared Bill invitation drift';end if;
 execute replace(definition,needle,'if not exists(select 1 from public.messages where conversation_id=v_conversation and sender_id=v_user and body=v_message) then '||needle||' end if;');
end $invitation$;

create function public.help_pay_create_for_account(p_mode text,p_total_cents bigint,p_checkout_key text,p_checkout_snapshot jsonb,p_expected_user_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or auth.uid() is distinct from p_expected_user_id then raise exception 'Account changed' using errcode='42501';end if;
 return public.help_pay_create_request(p_mode,p_total_cents,p_checkout_key,p_checkout_snapshot);
end $$;
create function public.help_pay_contribute_for_account(p_request_id uuid,p_amount_cents bigint,p_idempotency_key text,p_expected_user_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or auth.uid() is distinct from p_expected_user_id then raise exception 'Account changed' using errcode='42501';end if;
 return public.help_pay_contribute_wallet(p_request_id,p_amount_cents,p_idempotency_key);
end $$;
create function public.help_pay_set_wallet_enabled(p_enabled boolean,p_reason text)
returns void language plpgsql security definer set search_path='' as $$
begin
 perform private.goodies_finance_assert(true);
 if p_enabled is null or length(btrim(coalesce(p_reason,'')))<8 then raise exception 'Review reason required' using errcode='22023';end if;
 update private.goodies_shared_bill_config set wallet_enabled=p_enabled where singleton;
 insert into public.wantiss_admin_audit_log(actor_user_id,action,resource_type,resource_id,reason,after_state) values(auth.uid(),'shared_bill_funding_updated','goodies_config','shared_bill',btrim(p_reason),jsonb_build_object('wallet_enabled',p_enabled));
end $$;
create function public.help_pay_admin_refund_queue(p_offset integer default 0,p_limit integer default 40)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform private.goodies_finance_assert();
 return (select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) from (select id,total_cents,currency,refund_attempts,refund_retry_at,refund_attention_required,created_at,order_id from public.help_pay_requests where status='refund_pending' order by created_at,id offset greatest(coalesce(p_offset,0),0) limit least(greatest(coalesce(p_limit,40),1),100))q);
end $$;
create function public.help_pay_admin_retry_refund(p_request_id uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare request public.help_pay_requests%rowtype;refunded boolean;
begin
 perform private.goodies_finance_assert(true);
 if length(btrim(coalesce(p_reason,'')))<10 or length(p_reason)>500 then raise exception 'Review reason required' using errcode='22023';end if;
 select * into request from public.help_pay_requests where id=p_request_id and status='refund_pending' for update;
 if not found then raise exception 'Refund no longer pending' using errcode='P0002';end if;
 refunded:=private.help_pay_refund_or_queue(p_request_id,coalesce(request.refund_result,'expired'));
 insert into public.wantiss_admin_audit_log(actor_user_id,action,resource_type,resource_id,reason,after_state) values(auth.uid(),'shared_bill_refund_retried','help_pay_request',p_request_id::text,btrim(p_reason),jsonb_build_object('refunded',refunded));
 return jsonb_build_object('refunded',refunded,'status',case when refunded then coalesce(request.refund_result,'expired') else 'refund_pending' end);
end $$;

-- Private server tables remain inaccessible for client writes; all money moves
-- through the serialized RPCs, with the existing payer-owned SELECT policies.
revoke insert,update,delete on public.help_pay_requests,public.help_pay_contributions from public,anon,authenticated;
do $$declare f record;begin
 for f in select p.oid::regprocedure signature,n.nspname,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') and p.proname like 'help_pay_%' loop
  execute format('revoke all on function %s from public,anon,authenticated',f.signature);
  if f.nspname='public' and f.proname not in ('help_pay_expire','help_pay_refund_request') then execute format('grant execute on function %s to authenticated',f.signature);end if;
 end loop;
end $$;
commit;
