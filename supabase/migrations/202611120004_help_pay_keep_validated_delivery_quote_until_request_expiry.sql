-- Keep the server-validated delivery quote valid for the 30-minute shared payment window.
CREATE OR REPLACE FUNCTION public.help_pay_create_request(p_mode text, p_total_cents bigint, p_checkout_key text, p_checkout_snapshot jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_user uuid:=auth.uid(); v_existing public.help_pay_requests%rowtype; v_id uuid; v_initial bigint; v_wallet numeric; v_tx uuid; v_s jsonb:=p_checkout_snapshot; v_total numeric;
begin
 if v_user is null then raise exception 'Sign in to create a payment request' using errcode='28000'; end if;
 if p_mode not in ('share','full') or p_total_cents is null or p_total_cents<1 or p_total_cents>100000000 then raise exception 'Invalid Help Pay amount' using errcode='22023'; end if;
 if p_checkout_key is null or length(btrim(p_checkout_key))<12 or length(p_checkout_key)>180 then raise exception 'Invalid checkout key' using errcode='22023'; end if;
 if jsonb_typeof(v_s) is distinct from 'object' or jsonb_typeof(v_s->'p_items') is distinct from 'array' then raise exception 'A live Goodies checkout is required' using errcode='22023'; end if;
 begin v_total := (v_s->>'p_total')::numeric; exception when others then raise exception 'Invalid Goodies checkout total'; end;
 if v_total is null or v_total<=0 or round(v_total*100)::bigint<>p_total_cents then raise exception 'The Help Pay total does not match the Goodies checkout'; end if;
 perform pg_advisory_xact_lock(hashtextextended('help-pay:'||v_user::text||':'||p_checkout_key,0));
 select * into v_existing from public.help_pay_requests where creator_id=v_user and checkout_key=p_checkout_key for update;
 if found then
   if v_existing.mode<>p_mode or v_existing.total_cents<>p_total_cents or v_existing.checkout_snapshot<>v_s then raise exception 'Checkout key is already used for different details'; end if;
   return v_existing.id;
 end if;
 -- Execute the exact store, price, options, fee, promo and delivery-quote validator.
 perform set_config('app.goodies_help_pay_validation','on',true);
 perform 1 from public.place_goodies_order(
   v_s->>'p_store_id',v_s->>'p_order_type',nullif(v_s->>'p_scheduled_for','')::timestamptz,
   v_s->'p_address',v_s->>'p_contact_phone',v_s->'p_items',(v_s->>'p_subtotal')::numeric,
   (v_s->>'p_delivery_fee')::numeric,(v_s->>'p_service_fee')::numeric,(v_s->>'p_discount')::numeric,
   (v_s->>'p_tip')::numeric,v_total,v_s->>'p_notes',v_s->>'p_promo_code'
 );
 perform set_config('app.goodies_help_pay_validation','off',true);
 -- Delivery quotes ordinarily expire in five minutes. A verified Help Pay request
 -- may take up to 30 minutes to fund, so keep its *validated* quote until
 -- the request deadline. Never change the quoted amount or address.
 if coalesce(v_s->'p_address','{}'::jsonb) ? 'delivery_quote_id' then
   update public.goodies_delivery_quotes q
     set expires_at=greatest(q.expires_at,now()+interval '30 minutes')
     where q.id=(v_s->'p_address'->>'delivery_quote_id')::uuid
       and q.customer_id=v_user and q.consumed_at is null
       and q.expires_at>now()
       and q.address_payload=(v_s->'p_address'-'delivery_quote_id')
       and q.store_id=v_s->>'p_store_id';
   if not found then raise exception 'The delivery quote expired. Refresh it before creating Help Pay.'; end if;
 end if;
 v_initial := case when p_mode='share' then (p_total_cents*60+99)/100 else 0 end;
 if v_initial>0 then
   select balance into v_wallet from public.wallets where user_id=v_user for update;
   if not found then raise exception 'Create a Wantiss Wallet to pay your share'; end if;
   if v_wallet<v_initial::numeric/100 then raise exception 'Insufficient Wallet balance for your 60%% share'; end if;
 end if;
 insert into public.help_pay_requests(creator_id,service,mode,checkout_key,checkout_snapshot,total_cents,initial_cents,contributed_cents,currency,status,expires_at)
 values(v_user,'goodies',p_mode,p_checkout_key,v_s,p_total_cents,v_initial,0,'USD','active',now()+interval '30 minutes') returning id into v_id;
 if v_initial>0 then
   update public.wallets set balance=balance-v_initial::numeric/100,updated_at=now() where user_id=v_user and balance>=v_initial::numeric/100;
   if not found then raise exception 'Insufficient Wallet balance'; end if;
   insert into public.wallet_transactions(user_id,amount,status,description,wallet_amount,wallet_currency,feature_name,activity_type,direction,reference_id,metadata)
   values(v_user,v_initial::numeric/100,'completed','Help Pay upfront share',v_initial::numeric/100,'USD','Goodies','help_pay_upfront','debit',v_id::text,jsonb_build_object('request_id',v_id))
   returning id into v_tx;
   insert into public.help_pay_contributions(request_id,contributor_id,amount_cents,payment_method,idempotency_key,wallet_transaction_id,status)
   values(v_id,v_user,v_initial,'wallet','help-pay-upfront-'||v_id::text,v_tx,'paid');
 end if;
 return v_id;
end $function$
;