-- Captured schema/functions only from Wantiss on 2026-11-13T10:14:29.966374+00:00. No production rows or credentials.
-- Replays the existing Help Pay extension over the Goodies core fixture before candidate migrations.
create table public.help_pay_requests ("id" uuid default gen_random_uuid() not null,
"creator_id" uuid not null,
"service" text not null,
"mode" text not null,
"checkout_key" text not null,
"checkout_snapshot" jsonb not null,
"total_cents" bigint not null,
"initial_cents" bigint default 0 not null,
"contributed_cents" bigint default 0 not null,
"currency" text default 'USD'::text not null,
"status" text default 'pending'::text not null,
"expires_at" timestamp with time zone not null,
"created_at" timestamp with time zone default now() not null,
"order_id" uuid,
CHECK (((initial_cents + contributed_cents) <= total_cents)),
CHECK ((((mode = 'share'::text) AND (initial_cents = (((total_cents * 60) + 99) / 100))) OR ((mode = 'full'::text) AND (initial_cents = 0)))),
CHECK ((contributed_cents >= 0)),
FOREIGN KEY (creator_id) REFERENCES auth.users(id),
CHECK ((currency = 'USD'::text)),
CHECK ((initial_cents >= 0)),
CHECK ((mode = ANY (ARRAY['share'::text, 'full'::text]))),
FOREIGN KEY (order_id) REFERENCES goodies_orders(id),
PRIMARY KEY (id),
CHECK ((service = ANY (ARRAY['goodies'::text, 'other'::text]))),
CHECK ((status = ANY (ARRAY['pending'::text, 'active'::text, 'funded'::text, 'expired'::text, 'cancelled'::text, 'fulfilled'::text, 'refund_pending'::text]))),
CHECK ((total_cents > 0)));
alter table public.help_pay_requests enable row level security;
grant INSERT on public.help_pay_requests to service_role;
grant SELECT on public.help_pay_requests to service_role;
grant UPDATE on public.help_pay_requests to service_role;
grant DELETE on public.help_pay_requests to service_role;
grant TRUNCATE on public.help_pay_requests to service_role;
grant REFERENCES on public.help_pay_requests to service_role;
grant TRIGGER on public.help_pay_requests to service_role;
grant SELECT on public.help_pay_requests to authenticated;
create policy "help_pay_creator_insert" on public.help_pay_requests for INSERT to authenticated with check (((creator_id = ( SELECT auth.uid() AS uid)) AND (status = 'pending'::text) AND (contributed_cents = 0)));
create policy "help_pay_creator_select" on public.help_pay_requests for SELECT to authenticated using ((creator_id = ( SELECT auth.uid() AS uid)));
create table public.help_pay_contributions ("id" uuid default gen_random_uuid() not null,
"request_id" uuid not null,
"contributor_id" uuid not null,
"amount_cents" bigint not null,
"payment_method" text not null,
"idempotency_key" text not null,
"wallet_transaction_id" uuid,
"status" text default 'paid'::text not null,
"created_at" timestamp with time zone default now() not null,
CHECK ((amount_cents > 0)),
FOREIGN KEY (contributor_id) REFERENCES auth.users(id),
UNIQUE (contributor_id, idempotency_key),
CHECK ((payment_method = ANY (ARRAY['wallet'::text, 'card'::text]))),
PRIMARY KEY (id),
FOREIGN KEY (request_id) REFERENCES help_pay_requests(id),
CHECK ((status = ANY (ARRAY['paid'::text, 'refunded'::text, 'refund_pending'::text]))),
FOREIGN KEY (wallet_transaction_id) REFERENCES wallet_transactions(id));
alter table public.help_pay_contributions enable row level security;
grant INSERT on public.help_pay_contributions to service_role;
grant SELECT on public.help_pay_contributions to service_role;
grant UPDATE on public.help_pay_contributions to service_role;
grant DELETE on public.help_pay_contributions to service_role;
grant TRUNCATE on public.help_pay_contributions to service_role;
grant REFERENCES on public.help_pay_contributions to service_role;
grant TRIGGER on public.help_pay_contributions to service_role;
grant SELECT on public.help_pay_contributions to authenticated;
create policy "help_pay_contribution_select" on public.help_pay_contributions for SELECT to authenticated using (((contributor_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM help_pay_requests r
  WHERE ((r.id = help_pay_contributions.request_id) AND (r.creator_id = ( SELECT auth.uid() AS uid)))))));
CREATE INDEX help_pay_contribution_request ON public.help_pay_contributions USING btree (request_id);
CREATE UNIQUE INDEX help_pay_creator_checkout_key ON public.help_pay_requests USING btree (creator_id, checkout_key);
CREATE UNIQUE INDEX help_pay_order_id_unique ON public.help_pay_requests USING btree (order_id) WHERE (order_id IS NOT NULL);
CREATE UNIQUE INDEX help_pay_active_checkout ON public.help_pay_requests USING btree (creator_id, checkout_key) WHERE (status = ANY (ARRAY['pending'::text, 'active'::text, 'funded'::text, 'refund_pending'::text]));
CREATE OR REPLACE FUNCTION public.help_pay_cancel_request(p_request_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_user uuid:=auth.uid(); r public.help_pay_requests%rowtype; n int;
begin
 if v_user is null then raise exception 'Sign in to cancel'; end if;
 select * into r from public.help_pay_requests where id=p_request_id and creator_id=v_user for update;
 if not found then raise exception 'Payment request not found'; end if;
 if r.status not in ('active','pending') then raise exception 'This request cannot be cancelled'; end if;
 n:=private.help_pay_reverse_locked(p_request_id,'cancelled');
 return jsonb_build_object('ok',true,'status','cancelled','refunded_payments',n);
end $function$;
revoke all on function public.help_pay_cancel_request(uuid) from public,anon,authenticated;
grant execute on function public.help_pay_cancel_request(uuid) to authenticated;
grant execute on function public.help_pay_cancel_request(uuid) to authenticated;
CREATE OR REPLACE FUNCTION public.help_pay_contribute_wallet(p_request_id uuid, p_amount_cents bigint, p_idempotency_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
end $function$;
revoke all on function public.help_pay_contribute_wallet(uuid,bigint,text) from public,anon,authenticated;
grant execute on function public.help_pay_contribute_wallet(uuid,bigint,text) to service_role;
grant execute on function public.help_pay_contribute_wallet(uuid,bigint,text) to service_role;
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
end $function$;
revoke all on function public.help_pay_create_request(text,bigint,text,jsonb) from public,anon,authenticated;
grant execute on function public.help_pay_create_request(text,bigint,text,jsonb) to authenticated;
grant execute on function public.help_pay_create_request(text,bigint,text,jsonb) to authenticated;
CREATE OR REPLACE FUNCTION public.help_pay_expire()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
end $function$;
revoke all on function public.help_pay_expire() from public,anon,authenticated;
grant execute on function public.help_pay_expire() to service_role;
CREATE OR REPLACE FUNCTION private.help_pay_place_goodies_order(p_creator_id uuid, p_store_id text, p_order_type text, p_scheduled_for timestamp with time zone, p_address jsonb, p_contact_phone text, p_items jsonb, p_subtotal numeric, p_delivery_fee numeric, p_service_fee numeric, p_discount numeric, p_tip numeric, p_total numeric, p_notes text, p_promo_code text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, order_code text, status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
#variable_conflict use_column
declare
  v_uid uuid := p_creator_id;
  v_store public.goodies_store_schedules%rowtype;
  v_prod public.goodies_products%rowtype;
  v_status text; v_code text; v_id uuid;
  v_sum numeric := 0; v_item jsonb; v_q numeric; v_p numeric; v_pid uuid; v_tries int := 0;
  v_agg record; v_builder_price numeric;
  v_content jsonb; v_coupon jsonb; v_promo_id uuid; v_coupon_code text := upper(trim(coalesce(p_promo_code,'')));
  v_expected_discount numeric := 0; v_coupon_val numeric := 0; v_coupon_min numeric := 0;
  v_coupon_store text; v_coupon_kind text; v_free_delivery boolean := false;
  v_fee_settings jsonb := '{}'::jsonb;
  v_expected_service_fee numeric := 0;
  v_expected_delivery_fee numeric := 0;
  v_first_order boolean := false;
  v_delivery_quote public.goodies_delivery_quotes%rowtype;
begin
  if v_uid is null then raise exception 'Sign in to place an order' using errcode = '28000'; end if;
  if not private.goodies_customer_can_access() then raise exception 'Your access to Goodies is currently suspended or banned.' using errcode = '42501'; end if;
  if exists(select 1 from public.wantiss_admin_account_restrictions r
    where r.target_user_id=p_creator_id and r.scope in ('all','GoodiesCustomer')
    and r.status='active' and r.starts_at<=now() and (r.ends_at is null or r.ends_at>now())) then
    raise exception 'This customer cannot place Goodies orders' using errcode='42501';
  end if;
  select * into v_store from public.goodies_store_schedules s where s.store_id = p_store_id and s.is_live = true;
  if not found then raise exception 'This store is not accepting online orders yet' using errcode = 'P0001'; end if;
  select c.payload into v_content from public.wantiss_cms_content c
   where c.content_key in ('goodies.content','goodies') and c.status='published'
   order by case when c.content_key='goodies.content' then 0 else 1 end,
            case when c.locale='en' then 0 else 1 end,c.published_at desc nulls last,c.version desc limit 1;
  v_fee_settings:=coalesce(v_content->'fees','{}'::jsonb);
  if nullif(v_fee_settings->>'svc','') is not null then
    begin v_expected_service_fee:=(v_fee_settings->>'svc')::numeric;
    exception when invalid_text_representation then raise exception 'Goodies service fee configuration is invalid' using errcode='22023'; end;
  end if;
  if v_expected_service_fee<0 or v_expected_service_fee>1000 then raise exception 'Goodies service fee configuration is outside the allowed range' using errcode='22023'; end if;
  if nullif(current_setting('app.goodies_group_first_order', true), '') is not null then v_first_order := current_setting('app.goodies_group_first_order', true)::boolean; else select not exists(select 1 from public.goodies_orders o where o.customer_id=v_uid) into v_first_order; end if;
  if p_order_type not in ('delivery','pickup') then raise exception 'Invalid order type' using errcode='22023'; end if;
  if coalesce(array_length(v_store.delivery_modes,1),0)>0 and not exists(select 1 from unnest(v_store.delivery_modes) m where lower(m)=p_order_type) then raise exception 'This store does not offer %',p_order_type using errcode='P0001'; end if;
  if p_order_type='delivery' and (p_address is null or jsonb_typeof(p_address)<>'object') then raise exception 'A delivery address is required' using errcode='22023'; end if;
  if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>100 then raise exception 'Cart must contain between 1 and 100 lines' using errcode='22023'; end if;
  for v_item in select * from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item)<>'object' then raise exception 'Invalid cart line' using errcode='22023'; end if;
    if jsonb_typeof(v_item->'byo')='object' then
      v_builder_price:=public.validate_goodies_builder_line(v_store.business_id,p_store_id,v_item);
      v_q:=(v_item->>'q')::numeric;
      if v_q is null or v_q<1 or v_q>99 or v_q<>trunc(v_q) then raise exception 'Invalid cart line quantity' using errcode='22023'; end if;
      v_sum:=v_sum+v_builder_price*v_q; continue;
    end if;
    begin v_pid:=(v_item->>'id')::uuid; v_q:=(v_item->>'q')::numeric; v_p:=(v_item->>'p')::numeric;
    exception when others then raise exception 'Invalid cart line' using errcode='22023'; end;
    if v_pid is null or v_q is null or v_p is null or v_q<1 or v_q>99 or v_q<>trunc(v_q) then raise exception 'Invalid cart line' using errcode='22023'; end if;
    select * into v_prod from public.goodies_products gp where gp.id=v_pid and gp.business_id=v_store.business_id and gp.is_available and gp.review_status='approved' and gp.restriction<>'alcohol' and not (concat_ws(' ',gp.name,gp.description) ~* '(alcohol|alcool|liquor|rhum|clairin|barbancourt|whisk|vodka|tequila|cognac|brandy|\\mbeer|bi[èe]re|\\mwine|champagne|cocktail)') for update;
    if not found then raise exception 'An item in your cart is no longer available' using errcode='P0001'; end if;
    if v_prod.restriction='alcohol' then raise exception 'Alcohol orders are not available yet' using errcode='P0001'; end if;
    v_builder_price:=public.validate_goodies_standard_product_line(v_store.category,v_prod.price,v_item,coalesce(v_content->'deals','[]'::jsonb));
    v_sum:=v_sum+v_builder_price*v_q;
  end loop;
  if p_delivery_fee is null or p_service_fee is null or p_discount is null or p_tip is null or p_subtotal is null or p_total is null or p_delivery_fee<0 or p_service_fee<0 or p_discount<0 or p_tip<0 then raise exception 'Invalid order totals' using errcode='22023'; end if;
  if not public.goodies_tip_is_allowed(p_tip,coalesce(v_fee_settings->>'tips','0')) then raise exception 'Choose one of the available courier tip amounts' using errcode='22023'; end if;
  if current_setting('app.goodies_group_waive_service_fee', true) = 'on' then v_expected_service_fee := 0; end if; if abs(p_service_fee-v_expected_service_fee)>0.005 then raise exception 'The service fee has changed. Please review your order' using errcode='P0001'; end if;
  if v_coupon_code<>'' then
    v_coupon:=null; v_promo_id:=null;
    select p.id,jsonb_build_object('code',p.code,'st',case when p.is_active then 'Live' else 'Draft' end,
      'from',case when p.starts_at is null then null else to_char(p.starts_at at time zone 'UTC','YYYY-MM-DD') end,
      'to',case when p.expires_at is null then null else to_char(p.expires_at at time zone 'UTC','YYYY-MM-DD') end,
      'min',p.min_subtotal,'store',coalesce(p.store_id,'All stores'),
      'kind',case when p.discount_type='percent' then 'Percent' else 'Free delivery' end,'val',p.discount_value)
    into v_promo_id,v_coupon from public.goodies_promotions p
    where upper(p.code)=v_coupon_code and p.is_active and (p.starts_at is null or p.starts_at<=now())
      and (p.expires_at is null or p.expires_at>=now()) and (p.max_redemptions is null or p.redemption_count<p.max_redemptions)
      and (p.store_id is null or p.store_id=p_store_id) for update limit 1;
    if v_coupon is null then
      select c.payload into v_content from public.wantiss_cms_content c
      where c.content_key in ('goodies.content','goodies') and c.status='published'
      order by case when c.content_key='goodies.content' then 0 else 1 end,case when c.locale='en' then 0 else 1 end,c.published_at desc nulls last,c.version desc limit 1;
      select c into v_coupon from jsonb_array_elements(coalesce(v_content->'coupons','[]'::jsonb)) c
      where upper(trim(coalesce(c->>'code','')))=v_coupon_code and coalesce(c->>'st','')='Live'
      and (nullif(c->>'from','') is null or (c->>'from')::date<=current_date)
      and (nullif(c->>'to','') is null or (c->>'to')::date>=current_date) limit 1;
    end if;
    if v_coupon is null then raise exception 'That promo code is not valid or is no longer active' using errcode='P0001'; end if;
    v_coupon_min:=coalesce(nullif(v_coupon->>'min','')::numeric,0);
    if v_sum<v_coupon_min then raise exception 'The order does not meet this promo code minimum' using errcode='P0001'; end if;
    v_coupon_store:=nullif(v_coupon->>'store','');
    if v_coupon_store is not null and v_coupon_store<>'All stores' and v_coupon_store<>p_store_id then raise exception 'This promo code is not valid for this store' using errcode='P0001'; end if;
    v_coupon_kind:=lower(coalesce(v_coupon->>'kind',''));
    if v_coupon_kind='percent' then v_coupon_val:=coalesce(nullif(v_coupon->>'val','')::numeric,0); if v_coupon_val<=0 or v_coupon_val>100 then raise exception 'Invalid promo configuration' using errcode='22023'; end if; v_expected_discount:=round(v_sum*v_coupon_val)/100;
    else v_free_delivery:=true; v_expected_discount:=0; end if;
    if abs(coalesce(p_discount,0)-v_expected_discount)>0.01 then raise exception 'Promo discount does not match the active offer' using errcode='22023'; end if;
    if v_free_delivery and p_order_type='delivery' and p_delivery_fee<>0 then raise exception 'This promo code provides free delivery' using errcode='22023'; end if;
  elsif p_discount>0 then raise exception 'A valid promo code is required for this discount' using errcode='P0001'; end if;
  if p_order_type='pickup' and (p_delivery_fee<>0 or p_tip<>0) then raise exception 'Invalid order totals' using errcode='22023'; end if;
  if p_order_type='delivery' then
    if v_store.delivery_pricing_mode='distance' then
      if nullif(p_address->>'delivery_quote_id','') is null then raise exception 'Please refresh the delivery fee before placing your order' using errcode='P0001'; end if;
      begin select * into v_delivery_quote from public.goodies_delivery_quotes q where q.id=(p_address->>'delivery_quote_id')::uuid and q.customer_id=v_uid and q.store_id=p_store_id and q.address_payload=(p_address-'delivery_quote_id') and q.expires_at>now() and q.consumed_at is null for update;
      exception when invalid_text_representation then raise exception 'The delivery quote is invalid. Please refresh the delivery fee' using errcode='P0001'; end;
      if not found then raise exception 'The delivery quote expired or no longer matches this address. Please refresh it' using errcode='P0001'; end if;
      v_expected_delivery_fee:=v_delivery_quote.fee;
    else v_expected_delivery_fee:=v_store.delivery_fee; end if;
    if v_free_delivery or (v_first_order and coalesce((v_fee_settings->>'first')::boolean,false)) then v_expected_delivery_fee:=0; end if;
    if abs(p_delivery_fee-v_expected_delivery_fee)>0.005 then raise exception 'The delivery fee has changed. Please review your order' using errcode='P0001'; end if;
    if v_store.delivery_pricing_mode='distance' then update public.goodies_delivery_quotes set consumed_at=now() where id=v_delivery_quote.id; end if;
  end if;
  if abs(v_sum-p_subtotal)>0.01 or abs((p_subtotal+p_delivery_fee+p_service_fee-p_discount+p_tip)-p_total)>0.01 then raise exception 'Order totals do not match the cart' using errcode='22023'; end if;
  if p_subtotal<v_store.min_order then raise exception 'The minimum order for this store is %',v_store.min_order using errcode='P0001'; end if;
  if p_scheduled_for is not null then
    if not v_store.accept_scheduled_orders then raise exception 'This store does not accept scheduled orders' using errcode='P0001'; end if;
    if p_scheduled_for<=now() then raise exception 'Choose a future time for a scheduled order' using errcode='P0001'; end if;
    if (p_scheduled_for at time zone coalesce(nullif(v_store.scheduled_order_timezone,''),'UTC'))::time<v_store.scheduled_order_start_time then raise exception 'Choose a time at or after the store minimum order time' using errcode='P0001'; end if;
    if p_scheduled_for>now()+interval '30 days' then raise exception 'Scheduled time is too far ahead' using errcode='P0001'; end if;
    v_status:='scheduled';
  else v_status:='placed'; end if;
  for v_agg in select (e->>'id')::uuid as pid,sum((e->>'q')::int) as qty from jsonb_array_elements(p_items) e where jsonb_typeof(e->'byo') is distinct from 'object' group by 1 loop
    update public.goodies_products gp set stock=gp.stock-v_agg.qty,updated_at=now()
    where gp.id=v_agg.pid and gp.business_id=v_store.business_id and gp.is_available and gp.review_status='approved' and gp.restriction<>'alcohol'
      and not (concat_ws(' ',gp.name,gp.description) ~* '(alcohol|alcool|liquor|rhum|clairin|barbancourt|whisk|vodka|tequila|cognac|brandy|\\mbeer|bi[èe]re|\\mwine|champagne|cocktail)')
      and gp.stock>=v_agg.qty;
    if not found then raise exception 'An item in your cart is out of stock' using errcode='P0001'; end if;
  end loop;
  loop
    v_code:='GD'||lpad((floor(random()*1000000))::int::text,6,'0');
    exit when not exists(select 1 from public.goodies_orders o where o.order_code=v_code);
    v_tries:=v_tries+1; if v_tries>20 then raise exception 'Could not allocate an order code' using errcode='P0001'; end if;
  end loop;
  insert into public.goodies_orders(order_code,business_id,customer_id,store_id,status,scheduled_for,order_type,address,contact_phone,items,
    subtotal,delivery_fee,service_fee,discount,tip,total,payment_method,payment_status,notes,promo_code)
  values(v_code,v_store.business_id,v_uid,p_store_id,v_status,p_scheduled_for,p_order_type,
    case when p_order_type='delivery' then (p_address-'delivery_quote_id') else null end,
    left(nullif(trim(p_contact_phone),''),32),p_items,p_subtotal,p_delivery_fee,p_service_fee,p_discount,p_tip,p_total,
    'cash','pay_on_receipt',left(nullif(trim(p_notes),''),500),nullif(v_coupon_code,''))
  returning goodies_orders.id into v_id;
  if v_promo_id is not null then update public.goodies_promotions set redemption_count=redemption_count+1,updated_at=now() where id=v_promo_id; end if;
  return query select v_id,v_code,v_status;
end;
$function$;
revoke all on function private.help_pay_place_goodies_order(uuid,text,text,timestamptz,jsonb,text,jsonb,numeric,numeric,numeric,numeric,numeric,numeric,text,text) from public,anon,authenticated;
CREATE OR REPLACE FUNCTION public.help_pay_refund_request(p_request_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare r public.help_pay_requests%rowtype;
begin
 if auth.uid() is not null then raise exception 'Internal operation only'; end if;
 select * into r from public.help_pay_requests where id=p_request_id for update;
 if not found or r.status not in ('refund_pending','expired','cancelled') then raise exception 'Not refundable'; end if;
 return private.help_pay_reverse_locked(p_request_id,case when r.status='cancelled' then 'cancelled' else 'expired' end);
end $function$;
revoke all on function public.help_pay_refund_request(uuid) from public,anon,authenticated;
grant execute on function public.help_pay_refund_request(uuid) to service_role;
CREATE OR REPLACE FUNCTION private.help_pay_reverse_locked(p_request_id uuid, p_result text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_req public.help_pay_requests%rowtype; v_con public.help_pay_contributions%rowtype; v_count int:=0; v_tx uuid;
begin
 if p_result not in ('expired','cancelled') then raise exception 'Invalid refund result'; end if;
 select * into v_req from public.help_pay_requests where id=p_request_id for update;
 if not found then raise exception 'Request not found'; end if;
 for v_con in select * from public.help_pay_contributions where request_id=p_request_id and status='paid' order by contributor_id,id for update loop
   insert into public.wallets(user_id,balance) values(v_con.contributor_id,0) on conflict(user_id) do nothing;
   update public.wallets set balance=balance+v_con.amount_cents::numeric/100,updated_at=now() where user_id=v_con.contributor_id;
   if not found then raise exception 'Could not refund wallet'; end if;
   insert into public.wallet_transactions(user_id,amount,status,description,wallet_amount,wallet_currency,feature_name,activity_type,direction,reference_id,metadata)
   values(v_con.contributor_id,v_con.amount_cents::numeric/100,'completed','Help Pay refund',v_con.amount_cents::numeric/100,'USD','Goodies','help_pay_refund','credit',v_con.id::text,jsonb_build_object('request_id',p_request_id,'contribution_id',v_con.id,'order_id',v_req.order_id))
   returning id into v_tx;
   update public.help_pay_contributions set status='refunded' where id=v_con.id;
   v_count:=v_count+1;
 end loop;
 update public.help_pay_requests set status=p_result,contributed_cents=0 where id=p_request_id;
 return v_count;
end $function$;
revoke all on function private.help_pay_reverse_locked(uuid,text) from public,anon,authenticated;
CREATE OR REPLACE FUNCTION public.help_pay_share_to_friend(p_request_id uuid, p_friend_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_user uuid:=auth.uid(); v_req public.help_pay_requests%rowtype; v_conversation uuid; v_message text; v_name text;
begin
 if v_user is null then raise exception 'Sign in first'; end if;
 select * into v_req from public.help_pay_requests where id=p_request_id and creator_id=v_user for update;
 if not found or v_req.status<>'active' or v_req.expires_at<=now() then raise exception 'This Help Pay request is no longer shareable'; end if;
 if p_friend_id is null or p_friend_id=v_user or not exists(
   select 1 from public.user_friendships where status='accepted' and
   ((requester_id=v_user and recipient_id=p_friend_id) or (requester_id=p_friend_id and recipient_id=v_user))
 ) then raise exception 'You can only send a payment card to an accepted friend'; end if;
 perform pg_advisory_xact_lock(hashtextextended('friend-chat:'||least(v_user::text,p_friend_id::text)||':'||greatest(v_user::text,p_friend_id::text),0));
 select id into v_conversation from public.conversations where feature='friends'
   and participant_ids @> array[v_user,p_friend_id]::uuid[] and array_length(participant_ids,1)=2
   order by created_at limit 1;
 if v_conversation is null then
   select coalesce(nullif(btrim(full_name),''),'Wantiss member') into v_name from public.profiles where id=p_friend_id;
   insert into public.conversations(participant_ids,customer_id,feature,status,title)
   values(array[v_user,p_friend_id],v_user,'friends','active',coalesce(v_name,'Wantiss member'))
   returning id into v_conversation;
 end if;
 v_message := '[wantiss-attachment-v1]'||jsonb_build_object(
  'kind','help-pay','name','Help pay a Goodies order','reference','wantiss://help-pay/'||p_request_id::text
 )::text;
 insert into public.messages(conversation_id,sender_id,body) values(v_conversation,v_user,v_message);
 update public.conversations set updated_at=now() where id=v_conversation;
 return v_conversation;
end $function$;
revoke all on function public.help_pay_share_to_friend(uuid,uuid) from public,anon,authenticated;
grant execute on function public.help_pay_share_to_friend(uuid,uuid) to authenticated;
grant execute on function public.help_pay_share_to_friend(uuid,uuid) to authenticated;
CREATE OR REPLACE FUNCTION public.help_pay_status(p_request_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare r public.help_pay_requests%rowtype; caller uuid:=auth.uid(); mine bigint:=0; donors jsonb:='[]'::jsonb;
begin
 if caller is null then raise exception 'Sign in to view Help Pay'; end if;
 select * into r from public.help_pay_requests where id=p_request_id;
 if not found or (r.status='pending' and caller<>r.creator_id) then raise exception 'Payment request not found'; end if;
 select coalesce(sum(amount_cents),0) into mine from public.help_pay_contributions where request_id=r.id and contributor_id=caller and status='paid';
 if caller=r.creator_id then
   select coalesce(jsonb_agg(jsonb_build_object('name',coalesce(nullif(btrim(p.full_name),''),'Wantiss member'),'amount_cents',c.amount_cents,'user_id',c.contributor_id) order by c.created_at),'[]'::jsonb)
   into donors from public.help_pay_contributions c left join public.profiles p on p.id=c.contributor_id
   where c.request_id=r.id and c.status='paid' and c.contributor_id<>r.creator_id;
 end if;
 return jsonb_build_object('id',r.id,'mode',r.mode,'service',r.service,
  'status',case when r.status in ('active','pending') and r.expires_at<=now() then 'expired' else r.status end,
  'total_cents',r.total_cents,'initial_cents',r.initial_cents,
  'contributed_cents',r.contributed_cents,'remaining_cents',greatest(0,r.total_cents-r.initial_cents-r.contributed_cents),
  'expires_at',r.expires_at,'is_creator',caller=r.creator_id,'my_contributed_cents',mine,'contributors',donors,'order_id',case when caller=r.creator_id then r.order_id else null end);
end $function$;
revoke all on function public.help_pay_status(uuid) from public,anon,authenticated;
grant execute on function public.help_pay_status(uuid) to authenticated;
grant execute on function public.help_pay_status(uuid) to authenticated;
CREATE OR REPLACE FUNCTION public.place_goodies_order(p_store_id text, p_order_type text, p_scheduled_for timestamp with time zone, p_address jsonb, p_contact_phone text, p_items jsonb, p_subtotal numeric, p_delivery_fee numeric, p_service_fee numeric, p_discount numeric, p_tip numeric, p_total numeric, p_notes text, p_promo_code text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, order_code text, status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_store public.goodies_store_schedules%rowtype;
  v_prod public.goodies_products%rowtype;
  v_status text; v_code text; v_id uuid;
  v_sum numeric := 0; v_item jsonb; v_q numeric; v_p numeric; v_pid uuid; v_tries int := 0;
  v_agg record; v_builder_price numeric;
  v_content jsonb; v_coupon jsonb; v_promo_id uuid; v_coupon_code text := upper(trim(coalesce(p_promo_code,'')));
  v_expected_discount numeric := 0; v_coupon_val numeric := 0; v_coupon_min numeric := 0;
  v_coupon_store text; v_coupon_kind text; v_free_delivery boolean := false;
  v_fee_settings jsonb := '{}'::jsonb;
  v_expected_service_fee numeric := 0;
  v_expected_delivery_fee numeric := 0;
  v_first_order boolean := false;
  v_delivery_quote public.goodies_delivery_quotes%rowtype;
begin
  if v_uid is null then raise exception 'Sign in to place an order' using errcode = '28000'; end if;
  if not private.goodies_customer_can_access() then raise exception 'Your access to Goodies is currently suspended or banned.' using errcode = '42501'; end if;
  select * into v_store from public.goodies_store_schedules s where s.store_id = p_store_id and s.is_live = true;
  if not found then raise exception 'This store is not accepting online orders yet' using errcode = 'P0001'; end if;
  select c.payload into v_content from public.wantiss_cms_content c
   where c.content_key in ('goodies.content','goodies') and c.status='published'
   order by case when c.content_key='goodies.content' then 0 else 1 end,
            case when c.locale='en' then 0 else 1 end,c.published_at desc nulls last,c.version desc limit 1;
  v_fee_settings:=coalesce(v_content->'fees','{}'::jsonb);
  if nullif(v_fee_settings->>'svc','') is not null then
    begin v_expected_service_fee:=(v_fee_settings->>'svc')::numeric;
    exception when invalid_text_representation then raise exception 'Goodies service fee configuration is invalid' using errcode='22023'; end;
  end if;
  if v_expected_service_fee<0 or v_expected_service_fee>1000 then raise exception 'Goodies service fee configuration is outside the allowed range' using errcode='22023'; end if;
  if nullif(current_setting('app.goodies_group_first_order', true), '') is not null then v_first_order := current_setting('app.goodies_group_first_order', true)::boolean; else select not exists(select 1 from public.goodies_orders o where o.customer_id=v_uid) into v_first_order; end if;
  if p_order_type not in ('delivery','pickup') then raise exception 'Invalid order type' using errcode='22023'; end if;
  if coalesce(array_length(v_store.delivery_modes,1),0)>0 and not exists(select 1 from unnest(v_store.delivery_modes) m where lower(m)=p_order_type) then raise exception 'This store does not offer %',p_order_type using errcode='P0001'; end if;
  if p_order_type='delivery' and (p_address is null or jsonb_typeof(p_address)<>'object') then raise exception 'A delivery address is required' using errcode='22023'; end if;
  if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>100 then raise exception 'Cart must contain between 1 and 100 lines' using errcode='22023'; end if;
  for v_item in select * from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item)<>'object' then raise exception 'Invalid cart line' using errcode='22023'; end if;
    if jsonb_typeof(v_item->'byo')='object' then
      v_builder_price:=public.validate_goodies_builder_line(v_store.business_id,p_store_id,v_item);
      v_q:=(v_item->>'q')::numeric;
      if v_q is null or v_q<1 or v_q>99 or v_q<>trunc(v_q) then raise exception 'Invalid cart line quantity' using errcode='22023'; end if;
      v_sum:=v_sum+v_builder_price*v_q; continue;
    end if;
    begin v_pid:=(v_item->>'id')::uuid; v_q:=(v_item->>'q')::numeric; v_p:=(v_item->>'p')::numeric;
    exception when others then raise exception 'Invalid cart line' using errcode='22023'; end;
    if v_pid is null or v_q is null or v_p is null or v_q<1 or v_q>99 or v_q<>trunc(v_q) then raise exception 'Invalid cart line' using errcode='22023'; end if;
    select * into v_prod from public.goodies_products gp where gp.id=v_pid and gp.business_id=v_store.business_id and gp.is_available and gp.review_status='approved' and gp.restriction<>'alcohol' and not (concat_ws(' ',gp.name,gp.description) ~* '(alcohol|alcool|liquor|rhum|clairin|barbancourt|whisk|vodka|tequila|cognac|brandy|\\mbeer|bi[èe]re|\\mwine|champagne|cocktail)') for update;
    if not found then raise exception 'An item in your cart is no longer available' using errcode='P0001'; end if;
    if v_prod.restriction='alcohol' then raise exception 'Alcohol orders are not available yet' using errcode='P0001'; end if;
    v_builder_price:=public.validate_goodies_standard_product_line(v_store.category,v_prod.price,v_item,coalesce(v_content->'deals','[]'::jsonb));
    v_sum:=v_sum+v_builder_price*v_q;
  end loop;
  if p_delivery_fee is null or p_service_fee is null or p_discount is null or p_tip is null or p_subtotal is null or p_total is null or p_delivery_fee<0 or p_service_fee<0 or p_discount<0 or p_tip<0 then raise exception 'Invalid order totals' using errcode='22023'; end if;
  if not public.goodies_tip_is_allowed(p_tip,coalesce(v_fee_settings->>'tips','0')) then raise exception 'Choose one of the available courier tip amounts' using errcode='22023'; end if;
  if current_setting('app.goodies_group_waive_service_fee', true) = 'on' then v_expected_service_fee := 0; end if; if abs(p_service_fee-v_expected_service_fee)>0.005 then raise exception 'The service fee has changed. Please review your order' using errcode='P0001'; end if;
  if v_coupon_code<>'' then
    v_coupon:=null; v_promo_id:=null;
    select p.id,jsonb_build_object('code',p.code,'st',case when p.is_active then 'Live' else 'Draft' end,
      'from',case when p.starts_at is null then null else to_char(p.starts_at at time zone 'UTC','YYYY-MM-DD') end,
      'to',case when p.expires_at is null then null else to_char(p.expires_at at time zone 'UTC','YYYY-MM-DD') end,
      'min',p.min_subtotal,'store',coalesce(p.store_id,'All stores'),
      'kind',case when p.discount_type='percent' then 'Percent' else 'Free delivery' end,'val',p.discount_value)
    into v_promo_id,v_coupon from public.goodies_promotions p
    where upper(p.code)=v_coupon_code and p.is_active and (p.starts_at is null or p.starts_at<=now())
      and (p.expires_at is null or p.expires_at>=now()) and (p.max_redemptions is null or p.redemption_count<p.max_redemptions)
      and (p.store_id is null or p.store_id=p_store_id) for update limit 1;
    if v_coupon is null then
      select c.payload into v_content from public.wantiss_cms_content c
      where c.content_key in ('goodies.content','goodies') and c.status='published'
      order by case when c.content_key='goodies.content' then 0 else 1 end,case when c.locale='en' then 0 else 1 end,c.published_at desc nulls last,c.version desc limit 1;
      select c into v_coupon from jsonb_array_elements(coalesce(v_content->'coupons','[]'::jsonb)) c
      where upper(trim(coalesce(c->>'code','')))=v_coupon_code and coalesce(c->>'st','')='Live'
      and (nullif(c->>'from','') is null or (c->>'from')::date<=current_date)
      and (nullif(c->>'to','') is null or (c->>'to')::date>=current_date) limit 1;
    end if;
    if v_coupon is null then raise exception 'That promo code is not valid or is no longer active' using errcode='P0001'; end if;
    v_coupon_min:=coalesce(nullif(v_coupon->>'min','')::numeric,0);
    if v_sum<v_coupon_min then raise exception 'The order does not meet this promo code minimum' using errcode='P0001'; end if;
    v_coupon_store:=nullif(v_coupon->>'store','');
    if v_coupon_store is not null and v_coupon_store<>'All stores' and v_coupon_store<>p_store_id then raise exception 'This promo code is not valid for this store' using errcode='P0001'; end if;
    v_coupon_kind:=lower(coalesce(v_coupon->>'kind',''));
    if v_coupon_kind='percent' then v_coupon_val:=coalesce(nullif(v_coupon->>'val','')::numeric,0); if v_coupon_val<=0 or v_coupon_val>100 then raise exception 'Invalid promo configuration' using errcode='22023'; end if; v_expected_discount:=round(v_sum*v_coupon_val)/100;
    else v_free_delivery:=true; v_expected_discount:=0; end if;
    if abs(coalesce(p_discount,0)-v_expected_discount)>0.01 then raise exception 'Promo discount does not match the active offer' using errcode='22023'; end if;
    if v_free_delivery and p_order_type='delivery' and p_delivery_fee<>0 then raise exception 'This promo code provides free delivery' using errcode='22023'; end if;
  elsif p_discount>0 then raise exception 'A valid promo code is required for this discount' using errcode='P0001'; end if;
  if p_order_type='pickup' and (p_delivery_fee<>0 or p_tip<>0) then raise exception 'Invalid order totals' using errcode='22023'; end if;
  if p_order_type='delivery' then
    if v_store.delivery_pricing_mode='distance' then
      if nullif(p_address->>'delivery_quote_id','') is null then raise exception 'Please refresh the delivery fee before placing your order' using errcode='P0001'; end if;
      begin select * into v_delivery_quote from public.goodies_delivery_quotes q where q.id=(p_address->>'delivery_quote_id')::uuid and q.customer_id=v_uid and q.store_id=p_store_id and q.address_payload=(p_address-'delivery_quote_id') and q.expires_at>now() and q.consumed_at is null for update;
      exception when invalid_text_representation then raise exception 'The delivery quote is invalid. Please refresh the delivery fee' using errcode='P0001'; end;
      if not found then raise exception 'The delivery quote expired or no longer matches this address. Please refresh it' using errcode='P0001'; end if;
      v_expected_delivery_fee:=v_delivery_quote.fee;
    else v_expected_delivery_fee:=v_store.delivery_fee; end if;
    if v_free_delivery or (v_first_order and coalesce((v_fee_settings->>'first')::boolean,false)) then v_expected_delivery_fee:=0; end if;
    if abs(p_delivery_fee-v_expected_delivery_fee)>0.005 then raise exception 'The delivery fee has changed. Please review your order' using errcode='P0001'; end if;
    if v_store.delivery_pricing_mode='distance' and current_setting('app.goodies_help_pay_validation',true) is distinct from 'on' then update public.goodies_delivery_quotes set consumed_at=now() where id=v_delivery_quote.id; end if;
  end if;
  if abs(v_sum-p_subtotal)>0.01 or abs((p_subtotal+p_delivery_fee+p_service_fee-p_discount+p_tip)-p_total)>0.01 then raise exception 'Order totals do not match the cart' using errcode='22023'; end if;
  if p_subtotal<v_store.min_order then raise exception 'The minimum order for this store is %',v_store.min_order using errcode='P0001'; end if;
  if p_scheduled_for is not null then
    if not v_store.accept_scheduled_orders then raise exception 'This store does not accept scheduled orders' using errcode='P0001'; end if;
    if p_scheduled_for<=now() then raise exception 'Choose a future time for a scheduled order' using errcode='P0001'; end if;
    if (p_scheduled_for at time zone coalesce(nullif(v_store.scheduled_order_timezone,''),'UTC'))::time<v_store.scheduled_order_start_time then raise exception 'Choose a time at or after the store minimum order time' using errcode='P0001'; end if;
    if p_scheduled_for>now()+interval '30 days' then raise exception 'Scheduled time is too far ahead' using errcode='P0001'; end if;
    v_status:='scheduled';
  else v_status:='placed'; end if;
  if current_setting('app.goodies_help_pay_validation',true)='on' then return; end if;
  for v_agg in select (e->>'id')::uuid as pid,sum((e->>'q')::int) as qty from jsonb_array_elements(p_items) e where jsonb_typeof(e->'byo') is distinct from 'object' group by 1 loop
    update public.goodies_products gp set stock=gp.stock-v_agg.qty,updated_at=now()
    where gp.id=v_agg.pid and gp.business_id=v_store.business_id and gp.is_available and gp.review_status='approved' and gp.restriction<>'alcohol'
      and not (concat_ws(' ',gp.name,gp.description) ~* '(alcohol|alcool|liquor|rhum|clairin|barbancourt|whisk|vodka|tequila|cognac|brandy|\\mbeer|bi[èe]re|\\mwine|champagne|cocktail)')
      and gp.stock>=v_agg.qty;
    if not found then raise exception 'An item in your cart is out of stock' using errcode='P0001'; end if;
  end loop;
  loop
    v_code:='GD'||lpad((floor(random()*1000000))::int::text,6,'0');
    exit when not exists(select 1 from public.goodies_orders o where o.order_code=v_code);
    v_tries:=v_tries+1; if v_tries>20 then raise exception 'Could not allocate an order code' using errcode='P0001'; end if;
  end loop;
  insert into public.goodies_orders(order_code,business_id,customer_id,store_id,status,scheduled_for,order_type,address,contact_phone,items,
    subtotal,delivery_fee,service_fee,discount,tip,total,payment_method,payment_status,notes,promo_code)
  values(v_code,v_store.business_id,v_uid,p_store_id,v_status,p_scheduled_for,p_order_type,
    case when p_order_type='delivery' then (p_address-'delivery_quote_id') else null end,
    left(nullif(trim(p_contact_phone),''),32),p_items,p_subtotal,p_delivery_fee,p_service_fee,p_discount,p_tip,p_total,
    'cash','pay_on_receipt',left(nullif(trim(p_notes),''),500),nullif(v_coupon_code,''))
  returning goodies_orders.id into v_id;
  if v_promo_id is not null then update public.goodies_promotions set redemption_count=redemption_count+1,updated_at=now() where id=v_promo_id; end if;
  return query select v_id,v_code,v_status;
end;
$function$;
revoke all on function public.place_goodies_order(text,text,timestamptz,jsonb,text,jsonb,numeric,numeric,numeric,numeric,numeric,numeric,text,text) from public,anon,authenticated;
grant execute on function public.place_goodies_order(text,text,timestamptz,jsonb,text,jsonb,numeric,numeric,numeric,numeric,numeric,numeric,text,text) to service_role;
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
$function$;
revoke all on function public.refund_goodies_wallet_order(uuid,text) from public,anon,authenticated;
grant execute on function public.refund_goodies_wallet_order(uuid,text) to service_role;
