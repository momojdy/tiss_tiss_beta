-- Schema-only fixture observed from Wantiss on 2026-11-06. No production rows or secrets.

-- The fixture omits foreign keys to unrelated domains; core checks/uniqueness and Goodies triggers are retained.

create role anon; create role authenticated; create role service_role bypassrls;

create schema auth; create schema private; create schema extensions;

grant usage on schema auth,private,extensions to anon,authenticated,service_role;

create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;

create function auth.role() returns text language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claim.role',true),''),current_user)$$;

create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;

create table auth.users(id uuid primary key,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');

set check_function_bodies=off;

create table public."business_members"("id" uuid not null,"business_id" uuid not null,"user_id" uuid not null,"role" text not null,"created_at" timestamp with time zone not null);

create table public."businesses"("id" uuid not null,"name" text not null,"verification" text not null,"payout_ready" boolean not null,"is_live" boolean not null,"created_at" timestamp with time zone not null,"vendor_id" text,"accept_scheduled_orders" boolean not null,"scheduled_order_start_minutes" integer not null,"description" text,"phone" text,"phone_country" text not null,"email" text,"website" text,"address" text,"city" text,"country" text not null,"delivery_modes" text[] not null,"hours" jsonb not null,"logo_url" text,"goodies_store_id" text);

create table public."conversations"("id" uuid not null,"participant_ids" uuid[] not null,"title" text,"created_at" timestamp with time zone not null,"updated_at" timestamp with time zone not null,"business_id" uuid,"customer_id" uuid,"customer_name" text,"feature" text,"ref_id" text,"ref_label" text,"last_body" text,"unread_business" integer not null,"unread_customer" integer not null,"status" text not null,"vendor_replied_at" timestamp with time zone);

create table public."goodies_builder_configs"("id" uuid not null,"business_id" uuid not null,"builder_id" text not null,"config" jsonb not null,"enabled" boolean not null,"created_at" timestamp with time zone not null,"updated_at" timestamp with time zone not null);

create table public."goodies_card_checkout_attempts"("id" uuid not null,"user_id" uuid not null,"idempotency_key" text not null,"order_id" uuid,"created_at" timestamp with time zone not null,"request_fingerprint" text);

create table public."goodies_card_refund_queue"("id" uuid not null,"order_id" uuid not null,"status" text not null,"attempts" integer not null,"next_attempt_at" timestamp with time zone not null,"stripe_refund_id" text,"last_error" text,"created_at" timestamp with time zone not null,"updated_at" timestamp with time zone not null,"lease_token" uuid);

create table public."goodies_checkout_attempts"("id" uuid not null,"user_id" uuid not null,"idempotency_key" text not null,"payment_method" text not null,"request_fingerprint" text not null,"order_id" uuid,"created_at" timestamp with time zone not null);

create table public."goodies_courier_presence"("courier_id" uuid not null,"is_available" boolean not null,"accepts_cash_on_delivery" boolean not null,"latitude" double precision,"longitude" double precision,"accuracy_m" double precision,"heading" double precision,"speed_mps" double precision,"last_location_at" timestamp with time zone,"updated_at" timestamp with time zone not null);

create table public."goodies_courier_roster"("courier_id" uuid not null,"is_approved" boolean not null,"added_by" uuid,"created_at" timestamp with time zone not null,"updated_at" timestamp with time zone not null);

create table public."goodies_delivery_assignments"("id" uuid not null,"order_id" uuid not null,"business_id" uuid not null,"courier_id" uuid not null,"status" text not null,"offered_at" timestamp with time zone not null,"accepted_at" timestamp with time zone,"picked_up_at" timestamp with time zone,"delivered_at" timestamp with time zone,"latitude" double precision,"longitude" double precision,"accuracy_m" double precision,"heading" double precision,"speed_mps" double precision,"location_updated_at" timestamp with time zone,"created_at" timestamp with time zone not null,"updated_at" timestamp with time zone not null,"expires_at" timestamp with time zone);

create table public."goodies_delivery_quotes"("id" uuid not null,"customer_id" uuid not null,"store_id" text not null,"address_payload" jsonb not null,"distance_m" integer not null,"fee" numeric(10,2) not null,"created_at" timestamp with time zone not null,"expires_at" timestamp with time zone not null,"consumed_at" timestamp with time zone,"origin_latitude" double precision,"origin_longitude" double precision,"destination_latitude" double precision,"destination_longitude" double precision,"route_geometry" jsonb);

create table public."goodies_geocode_cache"("address_hash" text not null,"latitude" double precision not null,"longitude" double precision not null,"updated_at" timestamp with time zone not null,"expires_at" timestamp with time zone not null);

create table public."goodies_group_order_invites"("id" uuid not null,"group_id" uuid not null,"invited_user_id" uuid not null,"invited_by" uuid not null,"status" text not null,"created_at" timestamp with time zone not null);

create table public."goodies_group_order_items"("id" uuid not null,"group_id" uuid not null,"user_id" uuid not null,"line_key" text not null,"product_id" uuid not null,"quantity" integer not null,"options" jsonb not null,"note" text,"created_at" timestamp with time zone not null,"updated_at" timestamp with time zone not null);

create table public."goodies_group_order_members"("group_id" uuid not null,"user_id" uuid not null,"role" text not null,"joined_at" timestamp with time zone not null);

create table public."goodies_group_orders"("id" uuid not null,"invite_code" text not null,"store_id" text not null,"host_user_id" uuid not null,"status" text not null,"max_members" integer not null,"expires_at" timestamp with time zone not null,"created_at" timestamp with time zone not null,"updated_at" timestamp with time zone not null,"order_id" uuid);

create table public."goodies_ingredient_requests"("id" uuid not null,"business_id" uuid not null,"requested_by" uuid not null,"name" text not null,"builder" text not null,"role" text,"note" text,"status" text not null,"review_note" text,"reviewed_by" uuid,"reviewed_at" timestamp with time zone,"created_at" timestamp with time zone not null,"updated_at" timestamp with time zone not null,"image_path" text,"admin_asset_key" text,"library_id" text);

create table public."goodies_ingredient_rules"("id" boolean not null,"rules" text not null,"updated_by" uuid,"updated_at" timestamp with time zone not null);

create table public."goodies_library_ingredients"("id" text not null,"builder" text not null,"role" text,"name" text not null,"asset_key" text,"request_id" uuid,"active" boolean not null,"created_by" uuid,"created_at" timestamp with time zone not null,"updated_at" timestamp with time zone not null);

create table public."goodies_order_cancellation_private"("order_id" uuid not null,"business_id" uuid not null,"reason_code" text not null,"reason_detail" text,"created_by" uuid not null,"created_at" timestamp with time zone not null);

create table public."goodies_order_groups"("id" uuid not null,"customer_id" uuid not null,"order_type" text not null,"stop_count" integer not null,"subtotal" numeric not null,"delivery_fee" numeric not null,"service_fee" numeric not null,"tip" numeric not null,"total" numeric not null,"payment_method" text not null,"idempotency_key" text not null,"request_fingerprint" text not null,"created_at" timestamp with time zone not null);

create table public."goodies_orders"("id" uuid not null,"order_code" text not null,"business_id" uuid not null,"customer_id" uuid not null,"store_id" text not null,"status" text not null,"scheduled_for" timestamp with time zone,"order_type" text not null,"address" jsonb,"contact_phone" text,"items" jsonb not null,"subtotal" numeric(12,2) not null,"delivery_fee" numeric(12,2) not null,"service_fee" numeric(12,2) not null,"discount" numeric(12,2) not null,"tip" numeric(12,2) not null,"total" numeric(12,2) not null,"payment_method" text not null,"payment_status" text not null,"notes" text,"created_at" timestamp with time zone not null,"updated_at" timestamp with time zone not null,"acceptance_deadline_at" timestamp with time zone,"accepted_at" timestamp with time zone,"declined_at" timestamp with time zone,"decline_reason_code" text,"decline_reason_internal" text,"decline_reason_public" text,"promo_code" text,"payment_provider_ref" text,"payment_refunded_at" timestamp with time zone,"courier_id" uuid,"courier_assigned_at" timestamp with time zone,"picked_up_at" timestamp with time zone,"delivered_at" timestamp with time zone,"store_latitude" double precision,"store_longitude" double precision,"delivery_latitude" double precision,"delivery_longitude" double precision,"delivery_route" jsonb,"commissionable_subtotal" numeric(12,2) not null,"platform_commission_rate" numeric(5,4) not null,"platform_commission_amount" numeric(12,2) not null,"vendor_net_amount" numeric(12,2) not null,"delivery_commission_rate" numeric(5,4) not null,"delivery_commission_amount" numeric(12,2) not null,"courier_net_delivery_amount" numeric(12,2) not null,"payment_refunded_amount" numeric(12,2) not null,"payment_last_event_created" bigint not null,"cancelled_at" timestamp with time zone,"cancelled_by" uuid,"cancellation_reason_public" text,"payment_dispute_status" text,"ready_at" timestamp with time zone,"self_delivery" boolean not null,"self_driver_name" text,"self_driver_phone" text,"delivery_proof_url" text,"vendor_delivered_at" timestamp with time zone,"receipt_deadline_at" timestamp with time zone,"customer_confirmed_at" timestamp with time zone,"delivery_dispute_status" text,"delivery_dispute_reason" text,"delivery_dispute_opened_at" timestamp with time zone,"parent_id" uuid,"stop_index" integer);

create table public."goodies_products"("id" uuid not null,"business_id" uuid not null,"name" text not null,"description" text,"price" numeric(10,2) not null,"emoji" text not null,"aisle" text,"stock" integer not null,"is_available" boolean not null,"restriction" text not null,"photo_url" text,"sort_order" integer not null,"created_at" timestamp with time zone not null,"updated_at" timestamp with time zone not null,"review_status" text not null,"review_note" text,"reviewed_by" uuid,"reviewed_at" timestamp with time zone,"photo_urls" jsonb not null);

create table public."goodies_promotions"("id" uuid not null,"code" text not null,"discount_type" text not null,"discount_value" numeric not null,"min_subtotal" numeric not null,"store_id" text,"starts_at" timestamp with time zone,"expires_at" timestamp with time zone,"max_redemptions" integer,"redemption_count" integer not null,"is_active" boolean not null,"created_at" timestamp with time zone not null,"updated_at" timestamp with time zone not null);

create table public."goodies_route_cache"("store_id" text not null,"address_hash" text not null,"origin_latitude" double precision not null,"origin_longitude" double precision not null,"distance_m" integer not null,"route_geometry" jsonb,"updated_at" timestamp with time zone not null,"expires_at" timestamp with time zone not null);

create table public."goodies_store_schedules"("id" uuid not null,"business_id" uuid not null,"store_id" text not null,"hours" jsonb not null,"accept_scheduled_orders" boolean not null,"scheduled_order_start_minutes" integer not null,"is_live" boolean not null,"updated_at" timestamp with time zone not null,"business_name" text,"description" text,"phone" text,"email" text,"website" text,"address" text,"city" text,"country" text,"delivery_modes" text[] not null,"logo_url" text,"category" text,"kind" text,"min_order" numeric(10,2) not null,"delivery_fee" numeric(10,2) not null,"eta_min" integer not null,"eta_max" integer not null,"promo" text,"names" jsonb not null,"delivery_pricing_mode" text not null,"delivery_base_fee" numeric(10,2) not null,"delivery_per_km_fee" numeric(10,2) not null,"delivery_min_fee" numeric(10,2) not null,"delivery_max_fee" numeric(10,2),"delivery_max_distance_km" numeric(8,2),"accept_cash_on_delivery" boolean not null,"cover_url" text,"scheduled_order_start_time" time without time zone not null,"scheduled_order_timezone" text not null,"store_name" text,"thumbnail_url" text,"store_latitude" double precision,"store_longitude" double precision);

create table public."goodies_stripe_webhook_events"("event_id" text not null,"event_type" text not null,"livemode" boolean not null,"status" text not null,"attempts" integer not null,"locked_at" timestamp with time zone not null,"processed_at" timestamp with time zone,"last_error" text,"created_at" timestamp with time zone not null,"updated_at" timestamp with time zone not null,"claim_token" uuid);

create table public."messages"("id" uuid not null,"conversation_id" uuid not null,"sender_id" uuid not null,"body" text not null,"created_at" timestamp with time zone not null,"read_at" timestamp with time zone);

create table public."notifications"("id" uuid not null,"created_at" timestamp with time zone not null,"vendor_id" uuid,"title" text,"body" text,"read" boolean,"user_id" uuid,"feature_name" text,"notification_type" text not null,"destination" text,"metadata" jsonb not null,"updated_at" timestamp with time zone not null);

create table public."profiles"("id" uuid not null,"created_at" timestamp with time zone not null,"role" text,"full_name" text,"email" text,"business_name" text,"wantiss_number" text,"preferred_currency" text not null,"phone_number" text,"avatar_url" text,"membership_tier" text,"profile_bio" text);

create table public."wallet_transactions"("id" uuid not null,"created_at" timestamp with time zone not null,"status" text,"description" text,"amount" numeric not null,"user_id" uuid not null,"original_amount" numeric(20,2),"original_currency" text,"wallet_amount" numeric(20,2),"wallet_currency" text,"market_rate" numeric(20,10),"wantiss_rate" numeric(20,10),"rate_lock_id" uuid,"exchange_rate" numeric(20,10),"feature_name" text,"counterparty_user_id" uuid,"activity_type" text,"direction" text,"reference_id" text,"metadata" jsonb not null);

create table public."wallets"("id" uuid not null,"created_at" timestamp with time zone not null,"updated_at" timestamp with time zone,"balance" numeric(12,2) not null,"user_id" uuid not null);

create table public."wantiss_admin_account_restrictions"("id" uuid not null,"target_user_id" uuid not null,"kind" text not null,"scope" text not null,"reason" text not null,"notes" text not null,"starts_at" timestamp with time zone not null,"ends_at" timestamp with time zone,"status" text not null,"created_by" uuid not null,"lifted_by" uuid,"lifted_at" timestamp with time zone,"lift_reason" text,"notify_user" boolean not null,"created_at" timestamp with time zone not null);

create table public."wantiss_admin_audit_log"("id" bigint not null,"actor_user_id" uuid,"action" text not null,"resource_type" text not null,"resource_id" text,"reason" text,"before_state" jsonb,"after_state" jsonb,"created_at" timestamp with time zone not null);

create table public."wantiss_admin_permission_grants"("id" uuid not null,"staff_user_id" uuid not null,"permission_key" text not null,"access_level" text not null,"expires_at" timestamp with time zone,"revoked_at" timestamp with time zone,"revoked_by" uuid,"granted_by" uuid not null,"reason" text not null,"created_at" timestamp with time zone not null);

create table public."wantiss_admin_staff"("user_id" uuid not null,"display_name" text not null,"status" text not null,"role" text not null,"created_by" uuid,"created_at" timestamp with time zone not null,"updated_at" timestamp with time zone not null,"invited_at" timestamp with time zone,"invitation_expires_at" timestamp with time zone,"invited_by" uuid);

create table public."wantiss_cms_content"("id" uuid not null,"content_key" text not null,"locale" text not null,"version" integer not null,"status" text not null,"payload" jsonb not null,"created_by" uuid not null,"updated_by" uuid not null,"published_by" uuid,"published_at" timestamp with time zone,"created_at" timestamp with time zone not null,"updated_at" timestamp with time zone not null);

CREATE OR REPLACE FUNCTION private.goodies_customer_can_access()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select (select auth.uid()) is null or not exists(select 1 from public.wantiss_admin_account_restrictions r where r.target_user_id=(select auth.uid()) and r.scope in ('all','GoodiesCustomer') and r.status='active' and r.starts_at<=now() and (r.ends_at is null or r.ends_at>now()));
$function$;

CREATE OR REPLACE FUNCTION private.goodies_group_is_member(p_group_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
  select exists (
    select 1 from public.goodies_group_order_members m
    where m.group_id = p_group_id and m.user_id = auth.uid()
  );
$function$;

CREATE OR REPLACE FUNCTION private.goodies_merchant_can_operate(p_business_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1
    from public.business_members bm
    where bm.business_id = p_business_id
      and bm.user_id = (select auth.uid())
      and bm.role in ('owner','admin')
  )
  and not exists (
    select 1
    from public.wantiss_admin_account_restrictions r
    where r.target_user_id = (select auth.uid())
      and r.scope in ('all','GoodiesMerchant')
      and r.status = 'active'
      and r.starts_at <= now()
      and (r.ends_at is null or r.ends_at > now())
  );
$function$;

CREATE OR REPLACE FUNCTION private.goodies_orders_set_ready_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.status = 'ready' and (tg_op = 'INSERT' or old.status is distinct from 'ready') then new.ready_at := now(); end if;
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.accept_goodies_order(p_order_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_o public.goodies_orders%rowtype;
begin
  if v_uid is null then raise exception 'Sign in required' using errcode = '28000'; end if;
  select * into v_o from public.goodies_orders where id = p_order_id for update;
  if not found then raise exception 'Order not found' using errcode = 'P0002'; end if;
  if not exists (select 1 from public.business_members bm where bm.business_id = v_o.business_id and bm.user_id = v_uid) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if v_o.status <> 'placed' then raise exception 'This order is no longer awaiting a response' using errcode = 'P0001'; end if;
  if v_o.acceptance_deadline_at is null or v_o.acceptance_deadline_at <= now() then
    raise exception 'The 15-minute acceptance window has expired' using errcode = 'P0001';
  end if;
  if v_o.payment_method = 'card' and v_o.payment_status <> 'paid' then
    raise exception 'Card payment has not been confirmed yet' using errcode = 'P0001';
  end if;
  update public.goodies_orders set status='accepted', accepted_at=now(), updated_at=now() where id=p_order_id;
  perform public.goodies_order_notify(
    v_o.customer_id, 'Goodies order accepted',
    'The store accepted order ' || v_o.order_code || ' and is preparing it.',
    v_o.id, v_o.order_code, 'accepted', null
  );
  return 'accepted';
end;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_goodies_order_by_store(p_order_id uuid, p_reason_code text, p_reason_detail text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_o public.goodies_orders%rowtype;
  v_item record;
  v_member boolean;
  v_refunded boolean := false;
  v_public_reason text := 'The restaurant had to cancel this order. We’re sorry for the inconvenience.';
  v_customer_body text;
  v_store_member record;
begin
  if v_uid is null then
    raise exception 'Sign in required' using errcode = '28000';
  end if;
  if p_reason_code is null or p_reason_code not in (
    'out_of_stock','too_busy','fulfilment_unavailable',
    'delivery_unavailable','timing_unavailable','other'
  ) then
    raise exception 'Choose a valid cancellation reason' using errcode = '22023';
  end if;
  if p_reason_code = 'other' and length(trim(coalesce(p_reason_detail,''))) < 10 then
    raise exception 'For Other, enter at least 10 characters' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_reason_detail,''))) > 1000 then
    raise exception 'Cancellation note is too long' using errcode = '22023';
  end if;

  select * into v_o
    from public.goodies_orders
   where id = p_order_id
   for update;
  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;
  select exists (
    select 1 from public.business_members bm
     where bm.business_id = v_o.business_id and bm.user_id = v_uid
  ) into v_member;
  if not v_member then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if v_o.status not in ('scheduled','placed','accepted','preparing') then
    raise exception 'This order can no longer be cancelled' using errcode = 'P0001';
  end if;

  insert into public.goodies_order_cancellation_private(
    order_id,business_id,reason_code,reason_detail,created_by
  ) values (
    v_o.id,v_o.business_id,p_reason_code,nullif(trim(p_reason_detail),''),v_uid
  );

  update public.goodies_orders
     set status = 'cancelled',
         cancelled_at = now(),
         cancelled_by = v_uid,
         cancellation_reason_public = v_public_reason,
         updated_at = now()
   where id = v_o.id;

  for v_item in
    select (e->>'id')::uuid as product_id, sum((e->>'q')::integer) as qty
      from jsonb_array_elements(v_o.items) e
     where (e->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       and (e->>'q') ~ '^[0-9]+$'
     group by 1
  loop
    update public.goodies_products
       set stock = least(stock + v_item.qty, 100000), updated_at = now()
     where id = v_item.product_id and business_id = v_o.business_id;
  end loop;

  v_refunded := public.refund_goodies_wallet_order(v_o.id, 'restaurant_cancelled');
  v_customer_body := v_public_reason ||
    case
      when v_refunded then ' Your payment was refunded to your Wantiss wallet.'
      when v_o.payment_method = 'card' and v_o.payment_status in ('paid','refund_pending','partially_refunded')
        then ' Your card refund is being processed.'
      when v_o.payment_method = 'wallet' and v_o.payment_status = 'paid'
        then ' Your wallet payment needs support review.'
      else ' No wallet refund was needed.'
    end;

  perform public.goodies_order_notify(
    v_o.customer_id,
    'Restaurant cancelled your Goodies order',
    'Order ' || v_o.order_code || ' was cancelled. ' || v_customer_body,
    v_o.id, v_o.order_code, 'cancelled', null
  );

  for v_store_member in
    select bm.user_id
      from public.business_members bm
     where bm.business_id = v_o.business_id and bm.user_id <> v_uid
  loop
    perform public.goodies_order_notify(
      v_store_member.user_id,
      'Goodies order cancelled',
      'Order ' || v_o.order_code || ' was cancelled by your store.',
      v_o.id, v_o.order_code, 'cancelled', p_reason_code
    );
  end loop;

  return 'cancelled';
end;
$function$;

CREATE OR REPLACE FUNCTION public.claim_goodies_card_refunds(p_limit integer DEFAULT 25)
 RETURNS TABLE(queue_id uuid, order_id uuid, order_code text, customer_id uuid, payment_provider_ref text, total numeric, attempts integer, lease_token uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_row record;
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'Service role required' using errcode='42501';
  end if;

  for v_row in
    select q.id,q.order_id,q.attempts,q.last_error
      from public.goodies_card_refund_queue q
      join public.goodies_orders o on o.id=q.order_id
     where q.attempts >= 8
       and (
         (q.status in ('pending','failed') and q.next_attempt_at <= now())
         or (q.status='processing' and q.updated_at <= now()-interval '30 minutes')
       )
       and o.status in ('declined','expired','cancelled')
       and o.payment_method='card'
       and o.payment_provider_ref is not null
       and o.payment_status in ('paid','refund_pending','partially_refunded')
       and o.payment_dispute_status is distinct from 'open'
       and o.payment_dispute_status is distinct from 'lost'
     for update of q skip locked
  loop
    update public.goodies_card_refund_queue
       set status='dead_letter',
           lease_token=null,
           last_error=left(coalesce(nullif(trim(v_row.last_error),''),'Refund worker exhausted 8 attempts; manual review required'),1000),
           updated_at=now()
     where id=v_row.id;

    insert into public.notifications(user_id,vendor_id,title,body,notification_type,feature_name,destination,metadata)
    select s.user_id,null,'Goodies card refund requires manual review',
      'A card refund reached the retry limit for order '||o.order_code||'. Review the payment in Stripe before retrying.',
      'goodies_refund_attention','Goodies','goodies/refunds',
      jsonb_build_object('queue_id',v_row.id,'order_id',o.id,'order_code',o.order_code,'attempts',v_row.attempts,'alert_key','refund_dead_letter:'||v_row.id)
    from public.wantiss_admin_staff s
    join auth.users u on u.id=s.user_id
    where s.status='active' and s.role='super_admin'
      and u.email_confirmed_at is not null
      and not exists (
        select 1 from public.notifications n
        where n.user_id=s.user_id
          and n.metadata->>'alert_key'='refund_dead_letter:'||v_row.id
      )
    returning id into v_row.id;
  end loop;

  return query
  with pick as (
    select q.id
      from public.goodies_card_refund_queue q
      join public.goodies_orders o on o.id=q.order_id
     where (
       (q.status in ('pending','failed') and q.next_attempt_at <= now())
       or (q.status='processing' and q.updated_at <= now()-interval '30 minutes')
     )
       and q.attempts < 8
       and o.status in ('declined','expired','cancelled')
       and o.payment_method='card'
       and o.payment_provider_ref is not null
       and o.payment_status in ('paid','refund_pending','partially_refunded')
       and o.payment_dispute_status is distinct from 'open'
       and o.payment_dispute_status is distinct from 'lost'
     order by q.created_at
     for update of q skip locked
     limit least(greatest(coalesce(p_limit,25),1),100)
  ), claimed as (
    update public.goodies_card_refund_queue q
       set status='processing',
           attempts=q.attempts+1,
           lease_token=gen_random_uuid(),
           updated_at=now()
      from pick
     where q.id=pick.id
     returning q.id,q.order_id,q.attempts,q.lease_token
  )
  select c.id,o.id,o.order_code,o.customer_id,o.payment_provider_ref,o.total,c.attempts,c.lease_token
    from claimed c
    join public.goodies_orders o on o.id=c.order_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.claim_goodies_stripe_webhook_event(p_event_id text, p_event_type text, p_livemode boolean)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_claim_token uuid;
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'Service role required' using errcode='42501';
  end if;
  if nullif(trim(p_event_id),'') is null or nullif(trim(p_event_type),'') is null then
    raise exception 'Stripe event identity is required' using errcode='22023';
  end if;

  insert into public.goodies_stripe_webhook_events(
    event_id,event_type,livemode,status,attempts,locked_at,claim_token,updated_at
  ) values (
    p_event_id,p_event_type,coalesce(p_livemode,false),'processing',1,now(),gen_random_uuid(),now()
  )
  on conflict(event_id) do update set
    event_type=excluded.event_type,
    livemode=excluded.livemode,
    status='processing',
    attempts=public.goodies_stripe_webhook_events.attempts+1,
    locked_at=now(),
    claim_token=gen_random_uuid(),
    last_error=null,
    updated_at=now()
  where public.goodies_stripe_webhook_events.status='failed'
     or (public.goodies_stripe_webhook_events.status='processing'
         and public.goodies_stripe_webhook_events.locked_at < now()-interval '30 minutes')
  returning claim_token into v_claim_token;

  return v_claim_token;
end;
$function$;

CREATE OR REPLACE FUNCTION public.complete_goodies_card_refund(p_order_id uuid, p_refund_id text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_o public.goodies_orders%rowtype;
begin
  select * into v_o from public.goodies_orders where id=p_order_id for update;
  if not found then raise exception 'Order not found' using errcode='P0002'; end if;
  if v_o.payment_method<>'card' or v_o.status not in ('declined','expired','cancelled') then raise exception 'Order is not eligible for card refund' using errcode='P0001'; end if;
  if v_o.payment_status='refunded' then return false; end if;
  if v_o.payment_status not in ('paid','refund_pending') then raise exception 'Card payment is not refundable in its current state' using errcode='P0001'; end if;
  update public.goodies_orders set payment_status='refunded',updated_at=now() where id=p_order_id;
  insert into public.notifications(user_id,vendor_id,title,body,notification_type,feature_name,destination,metadata)
  values(v_o.customer_id,null,'Goodies card refund completed',
    'Your card refund for order '||v_o.order_code||' has been processed by your payment provider. Posting time depends on your bank.',
    'goodies_order','Goodies','goodies/orders',
    jsonb_build_object('order_id',v_o.id,'order_code',v_o.order_code,'status',v_o.status,'payment_status','refunded','refund_id',p_refund_id));
  return true;
end $function$;

CREATE OR REPLACE FUNCTION public.complete_goodies_stripe_webhook_event(p_event_id text, p_claim_token uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'Service role required' using errcode='42501';
  end if;
  update public.goodies_stripe_webhook_events
     set status='processed',processed_at=now(),last_error=null,claim_token=null,updated_at=now()
   where event_id=p_event_id and status='processing' and claim_token=p_claim_token;
  if not found then
    raise exception 'Stripe event claim is no longer owned by this worker' using errcode='P0001';
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.decline_goodies_order(p_order_id uuid, p_reason_code text, p_reason_detail text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_uid uuid:=auth.uid(); v_o public.goodies_orders%rowtype; v_public_reason text; v_item record; v_refunded boolean:=false;
begin
  if v_uid is null then raise exception 'Sign in required' using errcode='28000'; end if;
  if p_reason_code not in ('out_of_stock','too_busy','fulfilment_unavailable','delivery_unavailable','timing_unavailable','other') then raise exception 'Choose a valid decline reason' using errcode='22023'; end if;
  if p_reason_code='other' and length(trim(coalesce(p_reason_detail,'')))<10 then raise exception 'For Other, enter at least 10 characters' using errcode='22023'; end if;
  if length(trim(coalesce(p_reason_detail,'')))>1000 then raise exception 'Decline note is too long' using errcode='22023'; end if;
  select * into v_o from public.goodies_orders where id=p_order_id for update;
  if not found then raise exception 'Order not found' using errcode='P0002'; end if;
  if not exists(select 1 from public.business_members bm where bm.business_id=v_o.business_id and bm.user_id=v_uid) then raise exception 'Not allowed' using errcode='42501'; end if;
  if v_o.status<>'placed' or v_o.acceptance_deadline_at is null or v_o.acceptance_deadline_at<=now() then raise exception 'This order is no longer awaiting a response' using errcode='P0001'; end if;
  v_public_reason:=case p_reason_code
    when 'out_of_stock' then 'One or more items are unavailable.'
    when 'too_busy' then 'The store is unable to prepare orders right now.'
    when 'fulfilment_unavailable' then 'The store cannot fulfil this order.'
    when 'delivery_unavailable' then 'Delivery is unavailable for this order.'
    when 'timing_unavailable' then 'The store cannot fulfil the order at the requested time.'
    else 'The store is unable to accept this order right now.' end;
  update public.goodies_orders set status='declined',declined_at=now(),decline_reason_code=p_reason_code,
    decline_reason_internal=nullif(trim(p_reason_detail),''),decline_reason_public=v_public_reason,updated_at=now() where id=p_order_id;
  for v_item in select (e->>'id')::uuid product_id,sum((e->>'q')::integer) qty from jsonb_array_elements(v_o.items) e
    where (e->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' and (e->>'q') ~ '^[0-9]+$' group by 1 loop
    update public.goodies_products set stock=least(stock+v_item.qty,100000),updated_at=now() where id=v_item.product_id and business_id=v_o.business_id;
  end loop;
  if v_o.payment_method='card' and v_o.payment_status='paid' then update public.goodies_orders set payment_status='refund_pending' where id=v_o.id; end if;
  v_refunded:=public.refund_goodies_wallet_order(v_o.id,'vendor_declined');
  perform public.goodies_order_notify(v_o.customer_id,'Store declined your Goodies order',
    'The store could not accept order '||v_o.order_code||'. '||v_public_reason||
    case when v_refunded then ' Your payment was refunded to your Wantiss wallet.' when v_o.payment_method='card' and v_o.payment_status='paid' then ' Your card refund is being processed.' else ' You were not charged for this order.' end,
    v_o.id,v_o.order_code,'declined',p_reason_code);
  return 'declined';
end; $function$;

CREATE OR REPLACE FUNCTION public.enqueue_goodies_card_refund()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if new.status in ('declined','expired','cancelled')
     and new.payment_method='card'
     and new.payment_provider_ref is not null
     and new.payment_status in ('paid','refund_pending','partially_refunded')
     and new.payment_dispute_status is distinct from 'open'
     and new.payment_dispute_status is distinct from 'lost' then
    insert into public.goodies_card_refund_queue(order_id,status,next_attempt_at)
    values(new.id,'pending',now())
    on conflict(order_id) do update set
      status=case
        when public.goodies_card_refund_queue.status='completed' then 'completed'
        else 'pending'
      end,
      next_attempt_at=now(),
      updated_at=now();
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.expire_goodies_card_auth(p_order_id uuid, p_payment_intent_id text, p_stripe_status text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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

CREATE OR REPLACE FUNCTION public.expire_goodies_courier_offers()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_assignment public.goodies_delivery_assignments%rowtype;
  v_order public.goodies_orders%rowtype;
  v_count integer := 0;
begin
  for v_assignment in
    select *
    from public.goodies_delivery_assignments
    where status = 'offered'
      and expires_at is not null
      and expires_at <= now()
    order by expires_at
    for update skip locked
  loop
    update public.goodies_delivery_assignments
      set status = 'expired', updated_at = now()
      where id = v_assignment.id and status = 'offered';

    if not found then
      continue;
    end if;

    select * into v_order
    from public.goodies_orders
    where id = v_assignment.order_id
    for update;

    if found and v_order.courier_id = v_assignment.courier_id
       and v_order.status = 'courier_assigned' then
      update public.goodies_orders
        set courier_id = null,
            courier_assigned_at = null,
            status = 'ready',
            updated_at = now()
        where id = v_order.id;

      perform public.goodies_order_notify(
        v_order.customer_id,
        'Courier offer expired',
        'The courier did not respond to order ' || v_order.order_code || '. The store can assign another courier.',
        v_order.id,
        v_order.order_code,
        'ready',
        null
      );

      insert into public.notifications(user_id,title,body,feature_name,notification_type,destination,metadata)
      values (
        v_assignment.courier_id,
        'Delivery offer expired',
        'The offer for order ' || v_order.order_code || ' expired because it was not accepted in time.',
        'Goodies','order','goodies_courier',
        jsonb_build_object('order_id',v_order.id,'order_code',v_order.order_code)
      );

      insert into public.notifications(user_id,title,body,feature_name,notification_type,destination,metadata)
      select bm.user_id,
        'Courier offer expired',
        'The courier did not respond to order ' || v_order.order_code || '. Assign another available courier.',
        'Goodies','order','business_goodies_orders',
        jsonb_build_object('order_id',v_order.id,'order_code',v_order.order_code)
      from public.business_members bm
      where bm.business_id = v_order.business_id;
    end if;

    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$function$;

CREATE OR REPLACE FUNCTION public.expire_unaccepted_goodies_orders()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_o public.goodies_orders%rowtype; v_item record; v_count integer:=0; v_member record; v_refunded boolean;
begin
  for v_o in select * from public.goodies_orders where status='scheduled' and scheduled_for is not null and scheduled_for<=now() for update skip locked loop
    update public.goodies_orders set status='placed',acceptance_deadline_at=now()+interval '15 minutes',updated_at=now() where id=v_o.id;
    perform public.goodies_order_notify(v_o.customer_id,'Scheduled Goodies order is due','Your scheduled order '||v_o.order_code||' is now due and awaiting the store.',v_o.id,v_o.order_code,'placed',null);
    for v_member in select bm.user_id from public.business_members bm where bm.business_id=v_o.business_id loop
      perform public.goodies_order_notify(v_member.user_id,'Scheduled Goodies order is due','Order '||v_o.order_code||' is ready for a response within 15 minutes.',v_o.id,v_o.order_code,'placed',null);
    end loop;
  end loop;
  for v_o in select * from public.goodies_orders where status='placed' and acceptance_deadline_at is not null and acceptance_deadline_at<=now() for update skip locked loop
    update public.goodies_orders set status='expired',updated_at=now() where id=v_o.id;
    for v_item in select (e->>'id')::uuid product_id,sum((e->>'q')::integer) qty from jsonb_array_elements(v_o.items) e
      where (e->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' and (e->>'q') ~ '^[0-9]+$' group by 1 loop
      update public.goodies_products set stock=least(stock+v_item.qty,100000),updated_at=now() where id=v_item.product_id and business_id=v_o.business_id;
    end loop;
    if v_o.payment_method='card' and v_o.payment_status='paid' then update public.goodies_orders set payment_status='refund_pending' where id=v_o.id; end if;
    v_refunded:=public.refund_goodies_wallet_order(v_o.id,'vendor_timeout');
    perform public.goodies_order_notify(v_o.customer_id,'Goodies order expired',
      'The store did not respond within 15 minutes, so order '||v_o.order_code||' was cancelled.'||
      case when v_refunded then ' Your payment was refunded to your Wantiss wallet.' when v_o.payment_method='card' and v_o.payment_status='paid' then ' Your card refund is being processed.' else ' You were not charged for this order.' end,
      v_o.id,v_o.order_code,'expired',null);
    v_count:=v_count+1;
  end loop;
  return v_count;
end; $function$;

CREATE OR REPLACE FUNCTION public.fail_goodies_stripe_webhook_event(p_event_id text, p_claim_token uuid, p_error text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'Service role required' using errcode='42501';
  end if;
  update public.goodies_stripe_webhook_events
     set status='failed',last_error=left(nullif(trim(p_error),''),1000),
         claim_token=null,updated_at=now()
   where event_id=p_event_id and status='processing' and claim_token=p_claim_token;
end;
$function$;

CREATE OR REPLACE FUNCTION public.finish_goodies_card_refund(p_queue_id uuid, p_lease_token uuid, p_status text, p_refund_id text DEFAULT NULL::text, p_error text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_order_id uuid;
  v_customer uuid;
  v_order_code text;
  v_order_status text;
  v_payment_status text;
  v_dispute_status text;
  v_attempts integer;
  v_queue_status text;
  v_retry_minutes integer;
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'Service role required' using errcode='42501';
  end if;
  if p_status not in ('refunded','refund_pending','failed') then
    raise exception 'Invalid refund status' using errcode='22023';
  end if;
  if p_lease_token is null then
    raise exception 'Refund worker lease token is required' using errcode='22023';
  end if;

  select order_id,attempts into v_order_id,v_attempts
    from public.goodies_card_refund_queue
   where id=p_queue_id
     and lease_token=p_lease_token
     and status='processing'
   for update;
  if v_order_id is null then
    return false;
  end if;

  update public.goodies_orders
     set payment_status=case
           when payment_dispute_status='open' then 'disputed'
           when payment_dispute_status='lost' then 'disputed_lost'
           when p_status='refunded' then 'refunded'
           when payment_refunded_amount > 0 then 'partially_refunded'
           else 'refund_pending'
         end,
         payment_refunded_amount=case when p_status='refunded' then total else payment_refunded_amount end,
         payment_refunded_at=case when p_status='refunded' then coalesce(payment_refunded_at,now()) else payment_refunded_at end,
         updated_at=now()
   where id=v_order_id
   returning customer_id,order_code,status,payment_status,payment_dispute_status
   into v_customer,v_order_code,v_order_status,v_payment_status,v_dispute_status;

  if not found then
    raise exception 'Refund queue order no longer exists' using errcode='P0002';
  end if;

  if p_status='refunded' then
    insert into public.notifications(user_id,vendor_id,title,body,notification_type,feature_name,destination,metadata)
    values(v_customer,null,'Goodies card refund completed',
      'Your card refund for order '||v_order_code||' has been processed by your payment provider. Posting time depends on your bank.',
      'goodies_order','Goodies','goodies/orders',
      jsonb_build_object('order_id',v_order_id,'order_code',v_order_code,'status',v_order_status,
        'payment_status',v_payment_status,'payment_dispute_status',v_dispute_status,'refund_id',p_refund_id));
  end if;

  if p_status='failed' then
    v_queue_status := case when v_attempts >= 8 then 'dead_letter' else 'failed' end;
    v_retry_minutes := least(5 * power(2, greatest(v_attempts - 1, 0)), 360)::integer;
  elsif p_status='refund_pending' then
    v_queue_status := 'pending';
    v_retry_minutes := 15;
  else
    v_queue_status := 'completed';
    v_retry_minutes := null;
  end if;

  update public.goodies_card_refund_queue
     set status=v_queue_status,
         attempts=case when p_status='refund_pending' then 0 else attempts end,
         stripe_refund_id=coalesce(p_refund_id,stripe_refund_id),
         last_error=left(nullif(trim(p_error),''),1000),
         next_attempt_at=case
           when v_queue_status='completed' then next_attempt_at
           when v_queue_status='dead_letter' then next_attempt_at
           else now()+make_interval(mins=>v_retry_minutes)
         end,
         lease_token=null,
         updated_at=now()
   where id=p_queue_id
     and lease_token=p_lease_token;
  if not found then
    raise exception 'Refund worker lease changed while finalizing' using errcode='P0001';
  end if;

  if v_queue_status='dead_letter' then
    insert into public.notifications(user_id,vendor_id,title,body,notification_type,feature_name,destination,metadata)
    select s.user_id,null,'Goodies card refund requires manual review',
      'A card refund reached the retry limit for order '||v_order_code||'. Review the payment in Stripe before retrying.',
      'goodies_refund_attention','Goodies','goodies/refunds',
      jsonb_build_object('queue_id',p_queue_id,'order_id',v_order_id,'order_code',v_order_code,
        'attempts',v_attempts,'alert_key','refund_dead_letter:'||p_queue_id)
    from public.wantiss_admin_staff s
    join auth.users u on u.id=s.user_id
    where s.status='active' and s.role='super_admin'
      and u.email_confirmed_at is not null
      and not exists (
        select 1 from public.notifications n
        where n.user_id=s.user_id
          and n.metadata->>'alert_key'='refund_dead_letter:'||p_queue_id
      );
  end if;

  return true;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_goodies_refund_worker_token()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if coalesce(auth.role(),'') <> 'service_role' then raise exception 'Not authorized' using errcode='42501'; end if;
  return (select decrypted_secret from vault.decrypted_secrets where name='goodies_refund_worker_token' limit 1);
end $function$;

CREATE OR REPLACE FUNCTION public.get_goodies_stripe_webhook_event_status(p_event_id text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_status text;
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'Service role required' using errcode='42501';
  end if;
  select status into v_status
    from public.goodies_stripe_webhook_events
   where event_id=p_event_id;
  return v_status;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_goodies_access_status()
 RETURNS TABLE(status text, reason text, ends_at timestamp with time zone, restriction_kind text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid := (select auth.uid()); v_row record;
begin
 if v_uid is null then raise exception 'Sign in required' using errcode='28000'; end if;
 select r.kind,r.reason,r.ends_at into v_row
 from public.wantiss_admin_account_restrictions r
 where r.target_user_id=v_uid and r.scope in ('all','GoodiesCustomer')
   and r.status='active' and r.starts_at<=now()
   and (r.ends_at is null or r.ends_at>now())
 order by case when r.kind='Ban' then 0 else 1 end,r.starts_at desc limit 1;
 if found then
   return query select case when v_row.kind='Ban' then 'banned' else 'suspended' end,v_row.reason,v_row.ends_at,v_row.kind;
 else
   return query select 'active'::text,null::text,null::timestamptz,null::text;
 end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.goodies_admin_add_courier(p_courier_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
 perform public.goodies_admin_assert();
 if not exists(select 1 from public.profiles where id=p_courier_id) then raise exception 'User not found' using errcode='P0002';end if;
 insert into public.goodies_courier_roster(courier_id,is_approved,added_by) values(p_courier_id,true,auth.uid())
 on conflict(courier_id) do update set is_approved=true,added_by=auth.uid(),updated_at=now();
end $function$;

CREATE OR REPLACE FUNCTION public.goodies_admin_analytics()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
 perform public.goodies_admin_assert();
 return jsonb_build_object(
  'orders_30d',(select count(*) from public.goodies_orders where created_at>=now()-interval '30 days'),
  'gross_30d',(select coalesce(sum(total),0) from public.goodies_orders where created_at>=now()-interval '30 days' and payment_status in ('paid','pay_on_receipt')),
  'average_order',(select coalesce(avg(total),0) from public.goodies_orders where created_at>=now()-interval '30 days'),
  'by_status',(select coalesce(jsonb_object_agg(status,n), '{}'::jsonb) from (select status,count(*) n from public.goodies_orders where created_at>=now()-interval '30 days' group by status) x),
  'by_payment',(select coalesce(jsonb_object_agg(payment_method,n), '{}'::jsonb) from (select payment_method,count(*) n from public.goodies_orders where created_at>=now()-interval '30 days' group by payment_method) x),
  'top_stores',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (select store_id,count(*) orders,sum(total) gross from public.goodies_orders where created_at>=now()-interval '30 days' group by store_id order by count(*) desc limit 10) x)
 );
end $function$;

CREATE OR REPLACE FUNCTION public.goodies_admin_assert()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not exists (
    select 1
      from public.wantiss_admin_staff s
      join auth.users u on u.id = s.user_id
     where s.user_id = v_uid
       and s.status = 'active'
       and s.role = 'super_admin'
       and (s.invitation_expires_at is null or s.invitation_expires_at > now())
       and u.email_confirmed_at is not null
       and (
         s.invited_at is null
         or coalesce(auth.jwt()->'user_metadata'->>'wantiss_invite_accepted', 'false') = 'true'
       )
  ) then
    raise exception 'Goodies administrator access required' using errcode = '42501';
  end if;
end
$function$;

CREATE OR REPLACE FUNCTION public.goodies_admin_cancel_order(p_order_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_o public.goodies_orders%rowtype;v_item record;v_refunded boolean:=false;
begin
 perform public.goodies_admin_assert();
 select * into v_o from public.goodies_orders where id=p_order_id for update;
 if not found then raise exception 'Order not found' using errcode='P0002';end if;
 if v_o.status in ('completed','cancelled','declined','expired') then raise exception 'This order is already in a terminal state' using errcode='P0001';end if;
 update public.goodies_orders set status='cancelled',decline_reason_public=coalesce(nullif(left(trim(p_reason),300),''),'The order was cancelled by Wantiss support.'),updated_at=now() where id=p_order_id;
 for v_item in select (e->>'id')::uuid product_id,sum((e->>'q')::integer) qty from jsonb_array_elements(v_o.items) e
   where (e->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' and (e->>'q') ~ '^[0-9]+$' group by 1 loop
  update public.goodies_products set stock=least(stock+v_item.qty,100000),updated_at=now() where id=v_item.product_id and business_id=v_o.business_id;
 end loop;
 update public.goodies_delivery_assignments set status='cancelled',updated_at=now() where order_id=p_order_id and status not in ('delivered','declined','cancelled');
 if v_o.payment_method='card' and v_o.payment_status='paid' then update public.goodies_orders set payment_status='refund_pending' where id=p_order_id; end if;
 if v_o.payment_method='wallet' then v_refunded:=public.refund_goodies_wallet_order(p_order_id,'admin_cancelled');end if;
 perform public.goodies_order_notify(v_o.customer_id,'Goodies order cancelled','Order '||v_o.order_code||' was cancelled by Wantiss support.'||case when v_refunded then ' Your Wantiss Wallet refund has been processed.' when v_o.payment_method='card' and v_o.payment_status='paid' then ' Your card refund is being processed.' else '' end,v_o.id,v_o.order_code,'cancelled','admin_cancelled');
end $function$;

CREATE OR REPLACE FUNCTION public.goodies_admin_dashboard()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare result jsonb;
begin
 perform public.goodies_admin_assert();
 select jsonb_build_object(
  'stats',jsonb_build_object(
   'stores',(select count(*) from public.goodies_store_schedules),
   'live_stores',(select count(*) from public.goodies_store_schedules where is_live),
   'products',(select count(*) from public.goodies_products),
   'pending_products',(select count(*) from public.goodies_products where review_status='pending'),
   'orders',(select count(*) from public.goodies_orders),
   'open_orders',(select count(*) from public.goodies_orders where status not in ('completed','cancelled','declined','expired')),
   'gross_total',(select coalesce(sum(total),0) from public.goodies_orders where payment_status in ('paid','pay_on_receipt'))
  ),
  'merchants',coalesce((select jsonb_agg(jsonb_build_object('business_id',s.business_id,'store_id',s.store_id,'name',coalesce(s.business_name,b.name),'category',s.category,'is_live',s.is_live,'verification',b.verification,'accept_cash_on_delivery',s.accept_cash_on_delivery,'delivery_fee',s.delivery_fee,'delivery_pricing_mode',s.delivery_pricing_mode,'city',s.city,'country',s.country) order by s.updated_at desc) from public.goodies_store_schedules s join public.businesses b on b.id=s.business_id),'[]'::jsonb),
  'products',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'business_id',p.business_id,'store_name',s.business_name,'name',p.name,'description',p.description,'price',p.price,'stock',p.stock,'is_available',p.is_available,'review_status',p.review_status,'review_note',p.review_note,'created_at',p.created_at) order by case p.review_status when 'pending' then 0 else 1 end,p.created_at desc) from public.goodies_products p left join public.goodies_store_schedules s on s.business_id=p.business_id),'[]'::jsonb),
  'orders',coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'order_code',o.order_code,'store_id',o.store_id,'store_name',s.business_name,'customer_id',o.customer_id,'status',o.status,'payment_method',o.payment_method,'payment_status',o.payment_status,'total',o.total,'created_at',o.created_at,'scheduled_for',o.scheduled_for,'courier_id',o.courier_id) order by o.created_at desc) from (select * from public.goodies_orders order by created_at desc limit 150) o left join public.goodies_store_schedules s on s.store_id=o.store_id),'[]'::jsonb)
 ) into result;
 return result;
end $function$;

CREATE OR REPLACE FUNCTION public.goodies_admin_list_courier_candidates()
 RETURNS TABLE(courier_id uuid, full_name text, phone_number text, already_added boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
 perform public.goodies_admin_assert();
 return query select p.id,p.full_name,p.phone_number,coalesce(r.is_approved,false)
 from public.profiles p left join public.goodies_courier_roster r on r.courier_id=p.id
 order by p.full_name nulls last limit 200;
end $function$;

CREATE OR REPLACE FUNCTION public.goodies_admin_list_delivery_reports()
 RETURNS TABLE(order_id uuid, order_code text, store_name text, customer_name text, customer_phone text, total numeric, payment_method text, payment_status text, driver_name text, driver_phone text, proof_url text, reason text, delivered_at timestamp with time zone, opened_at timestamp with time zone, report_status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform public.goodies_admin_assert();
  return query
    select o.id, o.order_code, coalesce(b.name, o.store_id),
           coalesce(nullif(trim(p.full_name), ''), 'Customer'),
           coalesce(o.contact_phone, p.phone_number),
           o.total, o.payment_method, o.payment_status, o.self_driver_name, o.self_driver_phone,
           o.delivery_proof_url, o.delivery_dispute_reason, o.vendor_delivered_at,
           o.delivery_dispute_opened_at, o.delivery_dispute_status
      from public.goodies_orders as o
      left join public.businesses as b on b.id = o.business_id
      left join public.profiles as p on p.id = o.customer_id
     where o.delivery_dispute_status is not null
     order by (o.delivery_dispute_status = 'open') desc, o.delivery_dispute_opened_at desc
     limit 100;
end
$function$;

CREATE OR REPLACE FUNCTION public.goodies_admin_remove_courier(p_courier_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
 perform public.goodies_admin_assert();
 update public.goodies_courier_roster set is_approved=false,updated_at=now() where courier_id=p_courier_id;
 update public.goodies_courier_presence set is_available=false,updated_at=now() where courier_id=p_courier_id;
 update public.goodies_delivery_assignments set status='cancelled',updated_at=now() where courier_id=p_courier_id and status in ('offered','accepted');
 update public.goodies_orders set courier_id=null,courier_assigned_at=null,status='ready',updated_at=now() where courier_id=p_courier_id and status='courier_assigned';
end $function$;

CREATE OR REPLACE FUNCTION public.goodies_admin_resolve_delivery_dispute(p_order_id uuid, p_resolution text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_o public.goodies_orders%rowtype;
  v_refunded boolean := false;
  v_notification_body text;
  v_before jsonb;
  v_after jsonb;
  v_actor uuid := auth.uid();
begin
  perform public.goodies_admin_assert();

  if p_resolution is null or p_resolution not in ('release', 'refund') then
    raise exception 'Invalid resolution' using errcode = 'P0001';
  end if;

  select * into v_o
    from public.goodies_orders
   where id = p_order_id
   for update;

  if not found or v_o.delivery_dispute_status is distinct from 'open' then
    raise exception 'No open report for this order' using errcode = 'P0002';
  end if;

  v_before := jsonb_build_object(
    'status', v_o.status,
    'payment_status', v_o.payment_status,
    'delivery_dispute_status', v_o.delivery_dispute_status
  );

  if p_resolution = 'release' then
    update public.goodies_orders
       set status = 'completed',
           delivered_at = coalesce(vendor_delivered_at, now()),
           delivery_dispute_status = 'resolved_release',
           updated_at = now()
     where id = p_order_id;
    v_notification_body := 'Order ' || v_o.order_code || ' was confirmed as delivered.';
  else
    if v_o.payment_method = 'wallet' then
      if v_o.payment_status = 'paid' then
        v_refunded := public.refund_goodies_wallet_order(p_order_id, 'delivery_dispute');
        if not coalesce(v_refunded, false) then
          raise exception 'Wallet refund was not completed; report remains open for review' using errcode = 'P0001';
        end if;
        v_notification_body := 'Order ' || v_o.order_code || ' was refunded to your Wantiss wallet.';
      elsif v_o.payment_status = 'refunded' then
        v_notification_body := 'Order ' || v_o.order_code || ' had already been refunded to your Wantiss wallet.';
      else
        raise exception 'Wallet payment is not in a refundable paid state; report remains open for review' using errcode = 'P0001';
      end if;

      update public.goodies_orders
         set status = 'cancelled',
             cancelled_at = now(),
             delivery_dispute_status = 'resolved_refund',
             updated_at = now()
       where id = p_order_id;

    elsif v_o.payment_method = 'card' then
      if v_o.payment_status in ('paid', 'partially_refunded', 'refund_pending') then
        if nullif(v_o.payment_provider_ref, '') is null then
          update public.goodies_orders
             set status = 'cancelled',
                 cancelled_at = now(),
                 delivery_dispute_status = 'resolved_refund',
                 payment_status = 'refund_manual_review',
                 updated_at = now()
           where id = p_order_id;
        else
          update public.goodies_orders
             set status = 'cancelled',
                 cancelled_at = now(),
                 delivery_dispute_status = 'resolved_refund',
                 updated_at = now()
           where id = p_order_id;
        end if;
        -- Existing terminal-status triggers enqueue card refunds when a provider
        -- reference exists. Without one, the order remains explicitly in manual review.
        v_notification_body := 'You were not charged for this order.';
      elsif v_o.payment_status = 'refunded' then
        update public.goodies_orders
           set status = 'cancelled',
               cancelled_at = now(),
               delivery_dispute_status = 'resolved_refund',
               updated_at = now()
         where id = p_order_id;
        v_notification_body := 'Order ' || v_o.order_code || ' had already been refunded to your card.';
      else
        raise exception 'Card payment is not in a refundable state; report remains open for review' using errcode = 'P0001';
      end if;

    else
      raise exception 'Unsupported payment method; report remains open for manual review' using errcode = 'P0001';
    end if;
  end if;

  perform public.goodies_order_notify(
    v_o.customer_id,
    'Your report was reviewed',
    v_notification_body,
    v_o.id,
    v_o.order_code,
    case when p_resolution = 'refund' then 'cancelled' else 'completed' end,
    null
  );

  select jsonb_build_object(
    'status', o.status,
    'payment_status', o.payment_status,
    'delivery_dispute_status', o.delivery_dispute_status
  ) into v_after
    from public.goodies_orders as o
   where id = p_order_id;

  insert into public.wantiss_admin_audit_log(
    actor_user_id, action, resource_type, resource_id, reason, before_state, after_state
  ) values (
    v_actor,
    case when p_resolution = 'refund' then 'goodies_delivery_report_refunded' else 'goodies_delivery_report_released' end,
    'goodies_order',
    p_order_id::text,
    'Delivery report decision: ' || p_resolution,
    v_before,
    v_after
  );
end
$function$;

CREATE OR REPLACE FUNCTION public.goodies_admin_review_product(p_product_id uuid, p_status text, p_note text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
 perform public.goodies_admin_assert();
 if p_status not in ('approved','rejected') then
   raise exception 'Invalid product review status' using errcode='22023';
 end if;
 if p_status = 'rejected' and nullif(trim(p_note),'') is null then
   raise exception 'A rejection reason is required' using errcode='22023';
 end if;
 update public.goodies_products
    set review_status=p_status,
        review_note=left(nullif(trim(p_note),''),500),
        reviewed_by=auth.uid(),
        reviewed_at=now(),
        is_available=(p_status='approved'),
        updated_at=now()
  where id=p_product_id;
 if not found then
   raise exception 'Product not found' using errcode='P0002';
 end if;
end
$function$;

CREATE OR REPLACE FUNCTION public.goodies_admin_set_merchant_status(p_business_id uuid, p_live boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  perform public.goodies_admin_assert();
  if not exists(select 1 from public.businesses where id=p_business_id) then raise exception 'Merchant not found' using errcode='P0002'; end if;
  if coalesce(p_live,false) and exists(
    select 1 from public.business_members bm
    join public.wantiss_admin_account_restrictions r on r.target_user_id=bm.user_id
    where bm.business_id=p_business_id and bm.role in ('owner','admin')
      and r.scope in ('all','GoodiesMerchant') and r.status='active' and r.starts_at<=now()
      and (r.ends_at is null or r.ends_at>now())
  ) then raise exception 'Goodies merchant access is restricted' using errcode='42501'; end if;
  update public.goodies_store_schedules set is_live=coalesce(p_live,false),updated_at=now() where business_id=p_business_id;
  update public.businesses set is_live=coalesce(p_live,false) where id=p_business_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.goodies_admin_set_merchant_verification(p_business_id uuid, p_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
 perform public.goodies_admin_assert();
 if p_status not in ('pending','verified','rejected') then raise exception 'Invalid merchant verification status' using errcode='22023';end if;
 update public.businesses set verification=p_status,is_live=case when p_status='verified' then is_live else false end where id=p_business_id;
 if not found then raise exception 'Merchant not found' using errcode='P0002';end if;
 if p_status<>'verified' then update public.goodies_store_schedules set is_live=false,updated_at=now() where business_id=p_business_id;end if;
end $function$;

CREATE OR REPLACE FUNCTION public.goodies_admin_update_delivery_surcharge_policy(p_enabled boolean, p_additional_store_fee numeric, p_extra_distance_per_km numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_row public.wantiss_cms_content%rowtype;
  v_fees jsonb;
begin
  perform public.goodies_admin_assert();

  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_enabled is null
     or p_additional_store_fee is null
     or p_extra_distance_per_km is null
     or p_additional_store_fee < 0
     or p_additional_store_fee > 1000
     or p_extra_distance_per_km < 0
     or p_extra_distance_per_km > 1000 then
    raise exception 'Enter valid non-negative delivery surcharge values up to 1000'
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('goodies.content:en', 0));

  select *
    into v_row
    from public.wantiss_cms_content
   where content_key = 'goodies.content'
     and locale = 'en'
     and status = 'published'
   order by version desc
   limit 1
   for update;

  if not found then
    raise exception 'Published Goodies CMS content not found'
      using errcode = 'P0002';
  end if;

  v_fees := coalesce(v_row.payload -> 'fees', '{}'::jsonb)
    || jsonb_build_object(
      'additionalStoreSurchargeEnabled', p_enabled,
      'additionalStoreFee', p_additional_store_fee,
      'extraDistancePerKm', p_extra_distance_per_km
    );

  update public.wantiss_cms_content
     set payload = jsonb_set(v_row.payload, '{fees}', v_fees, true),
         updated_at = now()
   where id = v_row.id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.goodies_admin_update_fee_policy(p_service_fee numeric, p_first_order_free boolean, p_wallet_enabled boolean, p_card_enabled boolean, p_cash_enabled boolean, p_tips numeric[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_row public.wantiss_cms_content%rowtype;
  v_fees jsonb;
begin
  perform public.goodies_admin_assert();

  if p_service_fee is null or p_service_fee < 0 or p_service_fee > 1000 then
    raise exception 'Service fee must be between 0 and 1000' using errcode = '22023';
  end if;
  if exists (
    select 1 from unnest(coalesce(p_tips, '{}'::numeric[])) t
    where t < 0 or t > 1000
  ) then
    raise exception 'Invalid tip preset' using errcode = '22023';
  end if;

  -- Use the same lock as CMS save/publish so neither operation can race the other.
  perform pg_advisory_xact_lock(hashtextextended('goodies.content:en', 0));

  select *
    into v_row
    from public.wantiss_cms_content
   where content_key = 'goodies.content'
     and locale = 'en'
     and status = 'published'
   order by version desc
   limit 1
   for update;
  if not found then
    raise exception 'Published Goodies CMS content not found' using errcode = 'P0002';
  end if;

  v_fees := coalesce(v_row.payload -> 'fees', '{}'::jsonb) || jsonb_build_object(
    'svc', p_service_fee,
    'first', coalesce(p_first_order_free, false),
    'tips', array_to_string(coalesce(p_tips, '{}'::numeric[]), ','),
    'pay', jsonb_build_object(
      'Wallet', coalesce(p_wallet_enabled, false),
      'MonCash', false,
      'Card', coalesce(p_card_enabled, false),
      'Cash', coalesce(p_cash_enabled, false)
    )
  );

  update public.wantiss_cms_content
     set payload = jsonb_set(v_row.payload, '{fees}', v_fees, true),
         updated_at = now()
   where id = v_row.id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.goodies_admin_update_max_stops(p_max_stops integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_row public.wantiss_cms_content%rowtype;
begin
  perform public.goodies_admin_assert();
  if p_max_stops is null or p_max_stops < 1 or p_max_stops > 8 then raise exception 'Choose a number from 1 to 8' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('goodies.content:en', 0));
  select * into v_row from public.wantiss_cms_content
   where content_key = 'goodies.content' and locale = 'en' and status = 'published' order by version desc limit 1 for update;
  if not found then raise exception 'Published Goodies CMS content not found' using errcode='P0002'; end if;
  update public.wantiss_cms_content
     set payload = jsonb_set(v_row.payload, '{fees}', coalesce(v_row.payload->'fees', '{}'::jsonb) || jsonb_build_object('maxStops', p_max_stops), true), updated_at = now()
   where id = v_row.id;
end $function$;

CREATE OR REPLACE FUNCTION public.goodies_admin_update_multi_store_policy(p_enabled boolean, p_additional_store_fee numeric, p_extra_distance_per_km numeric, p_max_stops integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  perform public.goodies_admin_assert();
  if p_enabled is null
     or p_additional_store_fee is null or p_additional_store_fee < 0 or p_additional_store_fee > 1000
     or p_extra_distance_per_km is null or p_extra_distance_per_km < 0 or p_extra_distance_per_km > 1000
     or p_max_stops is null or p_max_stops < 1 or p_max_stops > 8 then
    raise exception 'Invalid multi-store delivery settings' using errcode = '22023';
  end if;
  perform public.goodies_admin_update_delivery_surcharge_policy(
    p_enabled, p_additional_store_fee, p_extra_distance_per_km
  );
  perform public.goodies_admin_update_max_stops(p_max_stops);
end
$function$;

CREATE OR REPLACE FUNCTION public.goodies_assign_courier(p_order_id uuid, p_courier_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_order public.goodies_orders%rowtype; v_presence public.goodies_courier_presence%rowtype; v_uid uuid:=auth.uid(); v_assignment uuid; v_previous_courier uuid;
begin
 if v_uid is null then raise exception 'Sign in required' using errcode='28000'; end if;
 select * into v_order from public.goodies_orders where id=p_order_id for update;
 if not found or v_order.order_type<>'delivery' then raise exception 'Delivery order not found' using errcode='P0002'; end if;
 if not (exists(select 1 from public.business_members bm where bm.business_id=v_order.business_id and bm.user_id=v_uid and bm.role in ('owner','admin'))
  or exists(select 1 from public.profiles p where p.id=v_uid and lower(coalesce(p.role,'')) in ('admin','super_admin'))) then raise exception 'Not allowed to dispatch this order' using errcode='42501'; end if;
 if v_order.status not in ('ready','courier_assigned') then raise exception 'Order must be ready before courier assignment' using errcode='P0001'; end if;
 if exists(select 1 from public.goodies_delivery_assignments a where a.order_id=p_order_id and a.status in ('accepted','picked_up','delivered')) then
  raise exception 'This courier has already accepted or started the delivery. Contact the courier or support before changing it.' using errcode='P0001';
 end if;
 if coalesce(v_order.payment_method,'wallet')='cash' and (not public.goodies_cash_global_enabled() or not exists(
   select 1 from public.goodies_store_schedules gs where gs.store_id=v_order.store_id and gs.business_id=v_order.business_id and gs.is_live and gs.accept_cash_on_delivery
 )) then raise exception 'Cash on delivery is disabled globally or by this store' using errcode='42501'; end if;
 select cp.* into v_presence from public.goodies_courier_presence cp
 join public.goodies_courier_roster cr on cr.courier_id=cp.courier_id and cr.is_approved
 where cp.courier_id=p_courier_id and cp.is_available and cp.updated_at>now()-interval '3 minutes'
  and (coalesce(v_order.payment_method,'wallet')<>'cash' or cp.accepts_cash_on_delivery) for update of cp;
 if not found then raise exception 'Courier is unavailable or does not accept cash on delivery' using errcode='P0001'; end if;
 if exists(select 1 from public.goodies_delivery_assignments a where a.courier_id=p_courier_id and a.order_id<>p_order_id and a.status in ('offered','accepted','picked_up')) then
  raise exception 'Courier already has an active delivery or offer' using errcode='P0001'; end if;
 select courier_id into v_previous_courier from public.goodies_delivery_assignments where order_id=p_order_id and status='offered';
 if v_previous_courier is not null and v_previous_courier<>p_courier_id then
  insert into public.notifications(user_id,title,body,feature_name,notification_type,destination,metadata)
  values(v_previous_courier,'Delivery offer reassigned','The store has reassigned order '||v_order.order_code||' to another courier.','Goodies','order','goodies_courier',jsonb_build_object('order_id',v_order.id));
 end if;
 insert into public.goodies_delivery_assignments(order_id,business_id,courier_id,status) values(v_order.id,v_order.business_id,p_courier_id,'offered')
 on conflict(order_id) do update set courier_id=excluded.courier_id,status='offered',offered_at=now(),accepted_at=null,picked_up_at=null,delivered_at=null,latitude=null,longitude=null,location_updated_at=null,updated_at=now()
 returning id into v_assignment;
 update public.goodies_orders set courier_id=p_courier_id,courier_assigned_at=now(),status='courier_assigned',updated_at=now() where id=v_order.id;
 insert into public.notifications(user_id,title,body,feature_name,notification_type,destination,metadata)
 values(p_courier_id,'New Goodies delivery offer','You have a delivery offer for order '||v_order.order_code||'. Open Goodies Courier to accept or decline.','Goodies','order','goodies_courier',jsonb_build_object('order_id',v_order.id,'order_code',v_order.order_code,'assignment_id',v_assignment));
 perform public.goodies_order_notify(v_order.customer_id,'Courier offer sent','A delivery offer has been sent for order '||v_order.order_code||'. We will update you when the courier accepts.',v_order.id,v_order.order_code,'courier_assigned',null);
 return v_assignment;
end $function$;

CREATE OR REPLACE FUNCTION public.goodies_assign_own_driver(p_order_id uuid, p_driver_name text, p_driver_phone text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_uid uuid := auth.uid(); v_o public.goodies_orders%rowtype;
begin
  if v_uid is null then raise exception 'Sign in required' using errcode='28000'; end if;
  select * into v_o from public.goodies_orders where id = p_order_id for update;
  if not found or v_o.order_type <> 'delivery' then raise exception 'Delivery order not found' using errcode='P0002'; end if;
  if not exists(select 1 from public.business_members bm where bm.business_id = v_o.business_id and bm.user_id = v_uid and bm.role in ('owner','admin')) then
    raise exception 'Not allowed to dispatch this order' using errcode='42501'; end if;
  if v_o.status not in ('ready','courier_assigned') then raise exception 'Order must be ready first' using errcode='P0001'; end if;
  if exists(select 1 from public.goodies_delivery_assignments a where a.order_id = p_order_id and a.status in ('accepted','picked_up','delivered')) then
    raise exception 'A courier already accepted this delivery' using errcode='P0001'; end if;
  if coalesce(v_o.ready_at, v_o.updated_at) > now() - interval '20 minutes' then
    raise exception 'You can use your own driver if no courier accepts within 20 minutes' using errcode='P0001'; end if;
  if length(trim(coalesce(p_driver_name,''))) < 2 or length(regexp_replace(coalesce(p_driver_phone,''), '\D', '', 'g')) < 7 then
    raise exception 'Enter the driver name and phone number' using errcode='P0001'; end if;
  update public.goodies_delivery_assignments set status = 'cancelled', updated_at = now() where order_id = p_order_id and status = 'offered';
  update public.goodies_orders set self_delivery = true, self_driver_name = trim(p_driver_name), self_driver_phone = trim(p_driver_phone),
    courier_id = null, status = 'picked_up', picked_up_at = now(), updated_at = now() where id = p_order_id;
  perform public.goodies_order_notify(v_o.customer_id, 'Your order is on its way',
    'The store is delivering order ' || v_o.order_code || ' with its own driver, ' || trim(p_driver_name) || '.', v_o.id, v_o.order_code, 'picked_up', null);
end $function$;

CREATE OR REPLACE FUNCTION public.goodies_auto_complete_self_deliveries()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_n integer := 0; v_o public.goodies_orders%rowtype;
begin
  for v_o in
    select * from public.goodies_orders
    where self_delivery and status = 'picked_up' and vendor_delivered_at is not null
      and nullif(delivery_proof_url,'') is not null and receipt_deadline_at <= now()
      and delivery_dispute_status is null
    order by receipt_deadline_at
    for update skip locked
  loop
    update public.goodies_orders set status = 'completed', delivered_at = coalesce(v_o.vendor_delivered_at, now()), updated_at = now()
      where id = v_o.id and status = 'picked_up' and delivery_dispute_status is null;
    if found then
      v_n := v_n + 1;
      perform public.goodies_order_notify(v_o.customer_id, 'Goodies order completed',
        'Order ' || v_o.order_code || ' was automatically completed because no delivery report was received within 24 hours.',
        v_o.id, v_o.order_code, 'completed', null);
    end if;
  end loop;
  return v_n;
end $function$;

CREATE OR REPLACE FUNCTION public.goodies_cash_global_enabled()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
 select exists(
  select 1 from public.wantiss_cms_content c
  where c.content_key='goodies.content' and c.locale='en' and c.status='published'
    and coalesce(c.payload#>>'{fees,pay,Cash}','0') in ('1','true','TRUE')
 )
$function$;

CREATE OR REPLACE FUNCTION public.goodies_cash_on_delivery_available(p_store_id text)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
 select public.goodies_cash_global_enabled() and coalesce(s.accept_cash_on_delivery,false) and exists(
  select 1 from public.goodies_courier_presence cp
  join public.goodies_courier_roster cr on cr.courier_id=cp.courier_id and cr.is_approved
  where cp.is_available and cp.accepts_cash_on_delivery and cp.updated_at>now()-interval '3 minutes'
   and not exists(select 1 from public.goodies_delivery_assignments a where a.courier_id=cp.courier_id and a.status in ('offered','accepted','picked_up'))
 ) from public.goodies_store_schedules s where s.store_id=p_store_id and s.is_live
$function$;

CREATE OR REPLACE FUNCTION public.goodies_courier_respond_assignment(p_order_id uuid, p_accept boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_order public.goodies_orders%rowtype;
  v_assignment public.goodies_delivery_assignments%rowtype;
  v_presence public.goodies_courier_presence%rowtype;
begin
  if v_uid is null then
    raise exception 'Sign in required' using errcode='28000';
  end if;

  select * into v_assignment
  from public.goodies_delivery_assignments
  where order_id = p_order_id and courier_id = v_uid
  for update;

  if not found or v_assignment.status <> 'offered' then
    raise exception 'This delivery offer is no longer available' using errcode='P0001';
  end if;

  select * into v_order from public.goodies_orders where id = p_order_id for update;
  if not found or v_order.courier_id <> v_uid or v_order.status <> 'courier_assigned' then
    raise exception 'This delivery offer has been reassigned' using errcode='P0001';
  end if;

  if v_assignment.expires_at is not null and v_assignment.expires_at <= now() then
    update public.goodies_delivery_assignments
      set status = 'expired', updated_at = now()
      where id = v_assignment.id;
    update public.goodies_orders
      set courier_id = null, courier_assigned_at = null, status = 'ready', updated_at = now()
      where id = p_order_id and courier_id = v_uid and status = 'courier_assigned';

    perform public.goodies_order_notify(
      v_order.customer_id,
      'Courier offer expired',
      'The courier did not respond to order ' || v_order.order_code || '. The store can assign another courier.',
      v_order.id,
      v_order.order_code,
      'ready',
      null
    );

    insert into public.notifications(user_id,title,body,feature_name,notification_type,destination,metadata)
    values(v_uid,'Delivery offer expired',
      'The offer for order ' || v_order.order_code || ' expired because it was not accepted in time.',
      'Goodies','order','goodies_courier',jsonb_build_object('order_id',v_order.id,'order_code',v_order.order_code));

    insert into public.notifications(user_id,title,body,feature_name,notification_type,destination,metadata)
    select bm.user_id,'Courier offer expired',
      'The courier did not respond to order ' || v_order.order_code || '. Assign another available courier.',
      'Goodies','order','business_goodies_orders',jsonb_build_object('order_id',v_order.id,'order_code',v_order.order_code)
    from public.business_members bm where bm.business_id = v_order.business_id;

    return;
  end if;

  if not exists(select 1 from public.goodies_courier_roster where courier_id = v_uid and is_approved) then
    raise exception 'Courier access is no longer active' using errcode='42501';
  end if;

  select * into v_presence from public.goodies_courier_presence where courier_id = v_uid for update;

  if p_accept and (
    not coalesce(v_presence.is_available,false)
    or v_presence.updated_at < now() - interval '3 minutes'
    or (v_order.payment_method = 'cash' and (
      not public.goodies_cash_global_enabled()
      or not v_presence.accepts_cash_on_delivery
      or not exists(
        select 1 from public.goodies_store_schedules gs
        where gs.store_id = v_order.store_id
          and gs.business_id = v_order.business_id
          and gs.is_live
          and gs.accept_cash_on_delivery
      )
    ))
  ) then
    raise exception 'Your availability or cash-on-delivery eligibility changed. The store must reassign this delivery.' using errcode='P0001';
  end if;

  if p_accept and exists(
    select 1 from public.goodies_delivery_assignments a
    where a.courier_id = v_uid and a.order_id <> p_order_id
      and a.status in ('accepted','picked_up')
  ) then
    raise exception 'You already have an active delivery' using errcode='P0001';
  end if;

  update public.goodies_delivery_assignments
    set status = case when p_accept then 'accepted' else 'declined' end,
        accepted_at = case when p_accept then now() else null end,
        expires_at = null,
        updated_at = now()
    where id = v_assignment.id;

  if p_accept then
    update public.goodies_orders set updated_at = now() where id = p_order_id;
    perform public.goodies_order_notify(
      v_order.customer_id,
      'Courier accepted your order',
      'Your courier accepted order ' || v_order.order_code || ' and will head to the store.',
      v_order.id,v_order.order_code,'courier_assigned',null
    );
  else
    update public.goodies_orders
      set courier_id = null, courier_assigned_at = null, status = 'ready', updated_at = now()
      where id = p_order_id and courier_id = v_uid;

    perform public.goodies_order_notify(
      v_order.customer_id,
      'Courier declined the offer',
      'The courier could not take order ' || v_order.order_code || '. The store is finding another courier.',
      v_order.id,v_order.order_code,'ready',null
    );

    insert into public.notifications(user_id,title,body,feature_name,notification_type,destination,metadata)
    select bm.user_id,'Courier declined delivery offer',
      'Courier declined order ' || v_order.order_code || '. Please assign another available courier.',
      'Goodies','order','business_goodies_orders',jsonb_build_object('order_id',v_order.id,'order_code',v_order.order_code)
    from public.business_members bm where bm.business_id = v_order.business_id;
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.goodies_courier_update_delivery_status(p_order_id uuid, p_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_uid uuid:=auth.uid(); v_assignment public.goodies_delivery_assignments%rowtype;
begin
  if v_uid is null then raise exception 'Sign in required' using errcode='28000'; end if;
  select * into v_assignment from public.goodies_delivery_assignments where order_id=p_order_id and courier_id=v_uid for update;
  if not found then raise exception 'No delivery assigned to you' using errcode='42501'; end if;
  if p_status='picked_up' and v_assignment.status='accepted' then
    update public.goodies_delivery_assignments set status='picked_up',picked_up_at=now(),updated_at=now() where id=v_assignment.id;
    update public.goodies_orders set status='picked_up',picked_up_at=now(),updated_at=now() where id=p_order_id;
  elsif p_status='delivered' and v_assignment.status='picked_up' then
    update public.goodies_delivery_assignments set status='delivered',delivered_at=now(),updated_at=now() where id=v_assignment.id;
    update public.goodies_orders set status='completed',delivered_at=now(),updated_at=now() where id=p_order_id;
    update public.goodies_courier_presence set is_available=false,updated_at=now() where courier_id=v_uid;
  else raise exception 'Invalid delivery status transition' using errcode='P0001'; end if;
end $function$;

CREATE OR REPLACE FUNCTION public.goodies_courier_update_location(p_order_id uuid, p_latitude double precision, p_longitude double precision, p_accuracy_m double precision DEFAULT NULL::double precision, p_heading double precision DEFAULT NULL::double precision, p_speed_mps double precision DEFAULT NULL::double precision)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_uid uuid:=auth.uid(); v_assignment public.goodies_delivery_assignments%rowtype;
begin
  if v_uid is null then raise exception 'Sign in required' using errcode='28000'; end if;
  if p_latitude is null or p_longitude is null or p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then
    raise exception 'Invalid GPS coordinates' using errcode='22023';
  end if;
  select * into v_assignment from public.goodies_delivery_assignments
   where order_id=p_order_id and courier_id=v_uid and status in ('accepted','picked_up') for update;
  if not found then raise exception 'No active delivery assigned to you' using errcode='42501'; end if;
  update public.goodies_delivery_assignments set latitude=p_latitude,longitude=p_longitude,
    accuracy_m=greatest(0,least(coalesce(p_accuracy_m,0),10000)),heading=p_heading,speed_mps=p_speed_mps,
    location_updated_at=now(),updated_at=now() where id=v_assignment.id;
  insert into public.goodies_courier_presence(courier_id,is_available,accepts_cash_on_delivery,latitude,longitude,accuracy_m,heading,speed_mps,last_location_at,updated_at)
  values(v_uid,true,false,p_latitude,p_longitude,p_accuracy_m,p_heading,p_speed_mps,now(),now())
  on conflict(courier_id) do update set latitude=excluded.latitude,longitude=excluded.longitude,
    accuracy_m=excluded.accuracy_m,heading=excluded.heading,speed_mps=excluded.speed_mps,last_location_at=now(),updated_at=now();
end $function$;

CREATE OR REPLACE FUNCTION public.goodies_customer_confirm_received(p_order_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_o public.goodies_orders%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='28000'; end if;
  select * into v_o from public.goodies_orders where id = p_order_id for update;
  if not found or v_o.customer_id <> auth.uid() or not v_o.self_delivery then raise exception 'Order not found' using errcode='P0002'; end if;
  if v_o.status <> 'picked_up' or v_o.vendor_delivered_at is null then raise exception 'This order cannot be confirmed yet' using errcode='P0001'; end if;
  if v_o.delivery_dispute_status = 'open' then raise exception 'This order has an open report' using errcode='P0001'; end if;
  update public.goodies_orders set status = 'completed', delivered_at = now(), customer_confirmed_at = now(), updated_at = now() where id = p_order_id;
end $function$;

CREATE OR REPLACE FUNCTION public.goodies_customer_dispute_delivery(p_order_id uuid, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_o public.goodies_orders%rowtype; r record;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='28000'; end if;
  select * into v_o from public.goodies_orders where id = p_order_id for update;
  if not found or v_o.customer_id <> auth.uid() or not v_o.self_delivery then raise exception 'Order not found' using errcode='P0002'; end if;
  if v_o.status <> 'picked_up' or v_o.vendor_delivered_at is null then raise exception 'This order cannot be reported now' using errcode='P0001'; end if;
  if v_o.receipt_deadline_at is null or now() >= v_o.receipt_deadline_at then raise exception 'The 24-hour window to report a problem has closed' using errcode='P0001'; end if;
  if v_o.delivery_dispute_status is not null then raise exception 'A report was already sent for this order' using errcode='P0001'; end if;
  if length(trim(coalesce(p_reason,''))) < 3 then raise exception 'Tell us what went wrong' using errcode='P0001'; end if;
  update public.goodies_orders set delivery_dispute_status = 'open', delivery_dispute_reason = left(trim(p_reason), 500),
    delivery_dispute_opened_at = now(), updated_at = now() where id = p_order_id;
  for r in select bm.user_id from public.business_members bm where bm.business_id = v_o.business_id loop
    perform public.goodies_order_notify(r.user_id, 'Delivery reported', 'The customer reported a problem with order ' || v_o.order_code || '. Our team will review it.', v_o.id, v_o.order_code, 'picked_up', null);
  end loop;
end $function$;

CREATE OR REPLACE FUNCTION public.goodies_enforce_store_opening_hours()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_hours jsonb;
  v_timezone text;
  v_live boolean;
  v_order_at timestamptz;
begin
  if new.order_type not in ('delivery', 'pickup') then
    return new;
  end if;

  select s.hours,
         coalesce(nullif(pg_catalog.btrim(s.scheduled_order_timezone), ''), 'UTC'),
         s.is_live
    into v_hours, v_timezone, v_live
  from public.goodies_store_schedules s
  where s.store_id = new.store_id;

  if not found or v_live is distinct from true then
    raise exception 'This store is not accepting online orders.' using errcode = 'P0001';
  end if;

  v_order_at := coalesce(new.scheduled_for, pg_catalog.now());
  if not public.goodies_hours_allow_order(v_hours, v_timezone, v_order_at) then
    if new.scheduled_for is null then
      raise exception 'This store is currently closed. Please try again during its opening hours.' using errcode = 'P0001';
    else
      raise exception 'The selected order time is outside this store''s opening hours. Choose a time during opening hours.' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.goodies_get_ingredient_rules()
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v text;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode = '28000'; end if;
  select rules into v from public.goodies_ingredient_rules where id;
  return coalesce(v, '');
end $function$;

CREATE OR REPLACE FUNCTION public.goodies_group_add_item(p_group_id uuid, p_product_id uuid, p_line_key text, p_quantity integer, p_options jsonb DEFAULT '{}'::jsonb, p_note text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_group public.goodies_group_orders%rowtype;
  v_product public.goodies_products%rowtype;
  v_id uuid;
begin
  if v_uid is null then raise exception 'Sign in to add items' using errcode='28000'; end if;
  if p_quantity is null or p_quantity < 1 or p_quantity > 99 then raise exception 'Choose a quantity from 1 to 99' using errcode='22023'; end if;
  if p_line_key is null or length(p_line_key) < 1 or length(p_line_key) > 200 then raise exception 'Invalid item option key' using errcode='22023'; end if;
  if p_options is null or jsonb_typeof(p_options) <> 'object' then raise exception 'Invalid item options' using errcode='22023'; end if;
  select * into v_group from public.goodies_group_orders g where g.id=p_group_id for update;
  if not found or v_group.status <> 'open' or v_group.expires_at <= now() then raise exception 'This group order is no longer open' using errcode='P0001'; end if;
  if not exists(select 1 from public.goodies_group_order_members m where m.group_id=p_group_id and m.user_id=v_uid) then raise exception 'Join this group before adding items' using errcode='42501'; end if;
  select * into v_product from public.goodies_products p
   where p.id=p_product_id and p.business_id=(select s.business_id from public.goodies_store_schedules s where s.store_id=v_group.store_id)
     and p.is_available=true and p.review_status='approved' and p.stock >= p_quantity
     and coalesce(p.restriction,'') <> 'alcohol'
     and not (concat_ws(' ',p.name,p.description) ~* '(alcohol|alcool|liquor|rhum|clairin|barbancourt|whisk|vodka|tequila|cognac|brandy|beer|bi[èe]re|wine|champagne|cocktail)');
  if not found then raise exception 'This item is unavailable or does not have enough stock' using errcode='P0001'; end if;
  insert into public.goodies_group_order_items(group_id,user_id,line_key,product_id,quantity,options,note)
  values(p_group_id,v_uid,p_line_key,p_product_id,p_quantity,p_options,left(nullif(trim(p_note),''),500))
  on conflict(group_id,user_id,line_key) do update
    set quantity=excluded.quantity, options=excluded.options, note=excluded.note, updated_at=now()
  returning id into v_id;
  update public.goodies_group_orders set updated_at=now() where id=p_group_id;
  return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.goodies_group_close(p_group_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Sign in to close a group order' using errcode='28000'; end if;
  update public.goodies_group_orders set status='closed',updated_at=now()
   where id=p_group_id and host_user_id=v_uid and status='open';
  return found;
end;
$function$;

CREATE OR REPLACE FUNCTION public.goodies_group_create(p_store_id text)
 RETURNS TABLE(group_id uuid, invite_code text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions', 'pg_temp'
AS $function$
declare
  v_uid uuid:=auth.uid();
  v_store public.goodies_store_schedules%rowtype;
  v_id uuid;
  v_code text;
  v_try integer:=0;
begin
  if v_uid is null then raise exception 'Sign in to start a group order' using errcode='28000'; end if;
  if not private.goodies_customer_can_access() then raise exception 'Your access to Goodies is restricted' using errcode='42501'; end if;
  select * into v_store from public.goodies_store_schedules s where s.store_id=p_store_id and s.is_live=true;
  if not found then raise exception 'This store is not accepting orders' using errcode='P0001'; end if;
  loop
    v_code:=upper(substr(encode(extensions.gen_random_bytes(8),'hex'),1,10));
    begin
      insert into public.goodies_group_orders(invite_code,store_id,host_user_id)
      values(v_code,p_store_id,v_uid) returning id into v_id;
      exit;
    exception when unique_violation then
      v_try:=v_try+1;
      if v_try>=5 then raise exception 'Could not create a unique group code. Please retry'; end if;
    end;
  end loop;
  insert into public.goodies_group_order_members(group_id,user_id,role) values(v_id,v_uid,'host');
  return query select v_id,v_code;
end;
$function$;

CREATE OR REPLACE FUNCTION public.goodies_group_join(p_invite_code text)
 RETURNS TABLE(group_id uuid, invite_code text, store_id text, status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_group public.goodies_group_orders%rowtype;
  v_count integer;
begin
  if v_uid is null then raise exception 'Sign in to join a group order' using errcode='28000'; end if;
  if not private.goodies_customer_can_access() then raise exception 'Your access to Goodies is restricted' using errcode='42501'; end if;
  select * into v_group from public.goodies_group_orders g
   where g.invite_code=upper(trim(coalesce(p_invite_code,'')))
   for update;
  if not found then raise exception 'That group code is invalid' using errcode='P0001'; end if;
  if v_group.status <> 'open' or v_group.expires_at <= now() then raise exception 'This group order is no longer open' using errcode='P0001'; end if;
  select count(*) into v_count from public.goodies_group_order_members m where m.group_id=v_group.id;
  if not exists(select 1 from public.goodies_group_order_members m where m.group_id=v_group.id and m.user_id=v_uid) then
    if v_count >= v_group.max_members then raise exception 'This group order is full' using errcode='P0001'; end if;
    insert into public.goodies_group_order_members(group_id,user_id,role) values(v_group.id,v_uid,'member');
  end if;
  return query select v_group.id,v_group.invite_code,v_group.store_id,v_group.status;
end;
$function$;

CREATE OR REPLACE FUNCTION public.goodies_group_order_checkout(p_idempotency_key text, p_group_id uuid, p_order_type text, p_scheduled_for timestamp with time zone, p_address jsonb, p_contact_phone text, p_tip numeric DEFAULT 0, p_notes text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, order_code text, status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_group public.goodies_group_orders%rowtype;
  v_store public.goodies_store_schedules%rowtype;
  v_preview jsonb;
  v_items jsonb := '[]'::jsonb;
  v_item jsonb;
  v_options jsonb;
  v_address jsonb;
  v_delivery_fee numeric := 0;
  v_service_fee numeric := 0;
  v_discount numeric := 0;
  v_total numeric := 0;
  v_subtotal numeric := 0;
  v_fee_settings jsonb := '{}'::jsonb;
  v_quote public.goodies_delivery_quotes%rowtype;
  v_first_order boolean := false;
  v_created record;
begin
  if v_uid is null then
    raise exception 'Sign in to check out this group order' using errcode='28000';
  end if;
  if not private.goodies_customer_can_access() then
    raise exception 'Your access to Goodies is restricted' using errcode='42501';
  end if;
  if p_idempotency_key is null or length(p_idempotency_key)<8 or length(p_idempotency_key)>200 then
    raise exception 'A valid checkout idempotency key is required' using errcode='22023';
  end if;

  select * into v_group from public.goodies_group_orders
   where id=p_group_id for update;
  if not found then raise exception 'Group order not found' using errcode='P0002'; end if;
  if v_group.host_user_id<>v_uid then
    raise exception 'Only the group host can check out this order' using errcode='42501';
  end if;
  if v_group.order_id is not null then
    return query select o.id,o.order_code,o.status from public.goodies_orders o
      where o.id=v_group.order_id and o.customer_id=v_uid;
    return;
  end if;
  if v_group.status<>'open' or v_group.expires_at<=now() then
    raise exception 'This group order is closed or expired' using errcode='P0001';
  end if;
  if p_order_type not in ('delivery','pickup') then
    raise exception 'Invalid order type' using errcode='22023';
  end if;

  v_preview:=public.goodies_group_order_checkout_preview(p_group_id);
  v_subtotal:=coalesce((v_preview->>'subtotal')::numeric,0);
  if v_subtotal<=0 then raise exception 'The shared cart is empty' using errcode='P0001'; end if;
  select * into v_store from public.goodies_store_schedules s
    where s.store_id=v_group.store_id and s.is_live=true;
  if not found then raise exception 'This store is not accepting online orders' using errcode='P0001'; end if;

  for v_item in select value from jsonb_array_elements(v_preview->'items')
  loop
    v_options:=nullif(v_item->'options','{}'::jsonb);
    v_items:=v_items||jsonb_build_array(
      jsonb_strip_nulls(jsonb_build_object(
        'id',v_item->>'product_id',
        'k',v_item->>'line_key',
        'n',v_item->>'name',
        'p',(v_item->>'unit_price')::numeric,
        'q',(v_item->>'quantity')::integer,
        'nt',v_item->>'note',
        'options',v_options
      ))
    );
  end loop;

  select coalesce(c.payload->'fees','{}'::jsonb) into v_fee_settings
    from public.wantiss_cms_content c
   where c.content_key in ('goodies.content','goodies') and c.status='published'
   order by case when c.content_key='goodies.content' then 0 else 1 end,
            case when c.locale='en' then 0 else 1 end,
            c.published_at desc nulls last,c.version desc limit 1;
  v_service_fee:=coalesce(nullif(v_fee_settings->>'svc','')::numeric,0);
  select not exists(select 1 from public.goodies_orders o where o.customer_id=v_uid)
    into v_first_order;

  v_address:=coalesce(p_address,'{}'::jsonb);
  if p_order_type='delivery' then
    if jsonb_typeof(v_address)<>'object' then
      raise exception 'A delivery address is required' using errcode='22023';
    end if;
    if v_store.delivery_pricing_mode='distance' then
      begin
        select * into v_quote from public.goodies_delivery_quotes q
         where q.id=(v_address->>'delivery_quote_id')::uuid
           and q.customer_id=v_uid and q.store_id=v_group.store_id
           and q.address_payload=(v_address-'delivery_quote_id')
           and q.expires_at>now() and q.consumed_at is null
         for update;
      exception when invalid_text_representation then
        raise exception 'Refresh the delivery quote before checkout' using errcode='P0001';
      end;
      if not found then raise exception 'The delivery quote expired or does not match this address' using errcode='P0001'; end if;
      v_delivery_fee:=v_quote.fee;
    else
      v_delivery_fee:=v_store.delivery_fee;
    end if;
    if v_first_order and coalesce((v_fee_settings->>'first')::boolean,false) then
      v_delivery_fee:=0;
    end if;
  else
    v_delivery_fee:=0;
    v_address:=null;
    if coalesce(p_tip,0)<>0 then raise exception 'Pickup orders cannot include a courier tip' using errcode='22023'; end if;
  end if;

  v_total:=v_subtotal+v_delivery_fee+v_service_fee-v_discount+coalesce(p_tip,0);
  select * into v_created from public.place_goodies_order_with_payment_once(
    p_idempotency_key,'wallet',v_group.store_id,p_order_type,p_scheduled_for,
    case when p_order_type='delivery' then v_address else null end,
    p_contact_phone,v_items,v_subtotal,v_delivery_fee,v_service_fee,v_discount,
    coalesce(p_tip,0),v_total,p_notes,null
  ) limit 1;

  if v_created.id is null then raise exception 'The group order could not be placed' using errcode='P0001'; end if;
  update public.goodies_group_orders
     set status='checked_out',order_id=v_created.id,updated_at=now()
   where id=v_group.id and host_user_id=v_uid and order_id is null;
  return query select v_created.id,v_created.order_code,v_created.status;
end;
$function$;

CREATE OR REPLACE FUNCTION public.goodies_group_order_checkout_estimate(p_group_id uuid, p_order_type text, p_address jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_group public.goodies_group_orders%rowtype;
  v_store public.goodies_store_schedules%rowtype;
  v_preview jsonb;
  v_fee_settings jsonb := '{}'::jsonb;
  v_first_order boolean := false;
  v_delivery_fee numeric := 0;
  v_service_fee numeric := 0;
  v_subtotal numeric := 0;
  v_total numeric := 0;
  v_quote public.goodies_delivery_quotes%rowtype;
  v_address jsonb := coalesce(p_address, '{}'::jsonb);
begin
  if v_uid is null then
    raise exception 'Sign in to estimate this group order' using errcode='28000';
  end if;
  if not private.goodies_customer_can_access() then
    raise exception 'Your access to Goodies is restricted' using errcode='42501';
  end if;
  if p_order_type not in ('delivery','pickup') then
    raise exception 'Invalid order type' using errcode='22023';
  end if;

  select * into v_group
  from public.goodies_group_orders
  where id=p_group_id and host_user_id=v_uid
  for update;
  if not found or v_group.status<>'open' or v_group.expires_at<=now() then
    raise exception 'This group order is closed or expired' using errcode='P0001';
  end if;

  v_preview := public.goodies_group_order_checkout_preview(p_group_id);
  v_subtotal := coalesce((v_preview->>'subtotal')::numeric,0);
  if v_subtotal<=0 then
    raise exception 'The shared cart is empty' using errcode='P0001';
  end if;

  select * into v_store
  from public.goodies_store_schedules
  where store_id=v_group.store_id and is_live=true;
  if not found then
    raise exception 'This store is not accepting online orders' using errcode='P0001';
  end if;

  select coalesce(c.payload->'fees','{}'::jsonb)
    into v_fee_settings
  from public.wantiss_cms_content c
  where c.content_key in ('goodies.content','goodies') and c.status='published'
  order by case when c.content_key='goodies.content' then 0 else 1 end,
           case when c.locale='en' then 0 else 1 end,
           c.published_at desc nulls last,c.version desc
  limit 1;
  v_service_fee := coalesce(nullif(v_fee_settings->>'svc','')::numeric,0);
  select not exists(select 1 from public.goodies_orders o where o.customer_id=v_uid)
    into v_first_order;

  if p_order_type='delivery' then
    if jsonb_typeof(v_address)<>'object' then
      raise exception 'A delivery address is required' using errcode='22023';
    end if;
    if v_store.delivery_pricing_mode='distance' then
      begin
        select * into v_quote
        from public.goodies_delivery_quotes q
        where q.id=(v_address->>'delivery_quote_id')::uuid
          and q.customer_id=v_uid
          and q.store_id=v_group.store_id
          and q.address_payload=(v_address-'delivery_quote_id')
          and q.expires_at>now()
          and q.consumed_at is null;
      exception when invalid_text_representation then
        raise exception 'Refresh the delivery quote before estimating' using errcode='P0001';
      end;
      if not found then
        raise exception 'The delivery quote expired or does not match this address' using errcode='P0001';
      end if;
      v_delivery_fee := v_quote.fee;
    else
      v_delivery_fee := v_store.delivery_fee;
    end if;
    if v_first_order and coalesce((v_fee_settings->>'first')::boolean,false) then
      v_delivery_fee := 0;
    end if;
  end if;

  v_total := v_subtotal + v_delivery_fee + v_service_fee;
  return jsonb_build_object(
    'group_id',v_group.id,
    'order_type',p_order_type,
    'subtotal',round(v_subtotal,2),
    'delivery_fee',round(v_delivery_fee,2),
    'service_fee',round(v_service_fee,2),
    'first_order_delivery_waiver',v_first_order and p_order_type='delivery'
      and coalesce((v_fee_settings->>'first')::boolean,false),
    'estimated_total',round(v_total,2),
    'currency','PHP'
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.goodies_group_order_checkout_preview(p_group_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid uuid:=auth.uid();
  v_group public.goodies_group_orders%rowtype;
  v_store public.goodies_store_schedules%rowtype;
  v_deals jsonb:='[]'::jsonb;
  v_item record;
  v_options jsonb;
  v_parts text[];
  v_size text;
  v_drink boolean;
  v_discount numeric;
  v_base numeric;
  v_unit numeric;
  v_line jsonb;
  v_priced_items jsonb:='[]'::jsonb;
  v_subtotal numeric:=0;
  v_count integer:=0;
begin
  if v_uid is null then raise exception 'Sign in to review this group order' using errcode='28000'; end if;
  if not private.goodies_customer_can_access() then raise exception 'Your access to Goodies is restricted' using errcode='42501'; end if;
  select * into v_group from public.goodies_group_orders where id=p_group_id for update;
  if not found or v_group.status<>'open' or v_group.expires_at<=now() then raise exception 'This group order is closed or expired' using errcode='P0001'; end if;
  if v_group.host_user_id <> v_uid then raise exception 'Only the group host can review checkout' using errcode='42501'; end if;
  select * into v_store from public.goodies_store_schedules s where s.store_id=v_group.store_id and s.is_live=true;
  if not found then raise exception 'This store is not accepting online orders' using errcode='P0001'; end if;
  if not exists(select 1 from public.goodies_group_order_items i where i.group_id=v_group.id) then raise exception 'Add items before reviewing checkout' using errcode='P0001'; end if;
  select coalesce(c.payload->'deals','[]'::jsonb) into v_deals from public.wantiss_cms_content c
   where c.content_key='goodies.content' and c.locale='en' and c.status='published' order by c.version desc limit 1;
  v_deals:=coalesce(v_deals,'[]'::jsonb);
  for v_item in
    select i.id,i.line_key,i.product_id,i.quantity,i.options,i.note,i.user_id,p.name,p.price,p.photo_url,p.stock,p.is_available,p.review_status,p.restriction,b.store_id as goodies_store_id,b.is_live
    from public.goodies_group_order_items i join public.goodies_products p on p.id=i.product_id join public.goodies_store_schedules b on b.business_id=p.business_id
    where i.group_id=v_group.id order by i.created_at
  loop
    if v_item.goodies_store_id<>v_group.store_id or not v_item.is_live or not v_item.is_available or v_item.review_status<>'approved' or v_item.restriction='alcohol' then
      raise exception 'One or more shared items are no longer available' using errcode='P0001';
    end if;
    if v_item.quantity<1 or v_item.quantity>99 then raise exception 'A shared item has an invalid quantity' using errcode='22023'; end if;
    v_options:=nullif(v_item.options,'{}'::jsonb);
    v_parts:=string_to_array(coalesce(v_item.line_key,''),'|');
    v_size:=null; v_drink:=false; v_discount:=0;
    if v_options is not null then
      if jsonb_typeof(v_options)<>'object' then raise exception 'Invalid shared item options' using errcode='22023'; end if;
      v_size:=nullif(v_options->>'size','');
      if v_options ? 'drink' then
        if jsonb_typeof(v_options->'drink')<>'boolean' then raise exception 'Invalid drink option' using errcode='22023'; end if;
        v_drink:=(v_options->>'drink')::boolean;
      end if;
      begin v_discount:=coalesce(nullif(v_options->>'discount_pct','')::numeric,0);
      exception when others then raise exception 'Invalid product discount' using errcode='22023'; end;
    elsif coalesce(array_length(v_parts,1),0)>=4 then
      if v_store.category in ('restaurants','bakery','beverages') then v_size:=case v_parts[2] when '0' then 'regular' when '1' then 'large' else null end;
      elsif v_parts[2] in ('','0') then v_size:=null;
      else raise exception 'This product does not offer size options' using errcode='22023'; end if;
      if v_parts[3] not in ('0','1') then raise exception 'Invalid drink option' using errcode='22023'; end if;
      v_drink:=v_parts[3]='1';
      begin v_discount:=coalesce(nullif(v_parts[4],'')::numeric,0);
      exception when others then raise exception 'Invalid product discount' using errcode='22023'; end;
    elsif v_store.category in ('restaurants','bakery','beverages') then v_size:='regular';
    end if;
    if v_store.category in ('restaurants','bakery','beverages') then
      if v_size not in ('regular','large') then raise exception 'Choose a valid product size for every shared item' using errcode='22023'; end if;
    elsif v_size is not null then raise exception 'This product does not offer size options' using errcode='22023'; end if;
    if v_drink and v_store.category not in ('restaurants','bakery') then raise exception 'A drink add-on is not available for this product' using errcode='22023'; end if;
    if v_discount<0 or v_discount>100 then raise exception 'Invalid product discount' using errcode='22023'; end if;
    if v_discount>0 then
      if not exists(select 1 from jsonb_array_elements(v_deals) as deal(d)
        where d->>'item'=v_item.product_id::text and d->>'st'='Live' and coalesce(d->>'rs','')<>'alcohol'
          and case when coalesce(d->>'pct','') ~ '^(0|[1-9][0-9]{0,2})([.][0-9]{1,2})?$' then (d->>'pct')::numeric=v_discount else false end) then
        raise exception 'This product discount is no longer available' using errcode='P0001';
      end if;
      v_base:=round(v_item.price*(100-v_discount)/100,2);
    else v_base:=v_item.price; end if;
    v_unit:=v_base+case when v_size='large' then 1.50 else 0 end+case when v_drink then 1.00 else 0 end;
    v_line:=jsonb_strip_nulls(jsonb_build_object('id',v_item.product_id::text,'k',v_item.line_key,'p',v_unit,'options',v_options));
    perform public.validate_goodies_standard_product_line(v_store.category,v_item.price,v_line,v_deals);
    v_subtotal:=v_subtotal+v_unit*v_item.quantity; v_count:=v_count+1;
    v_priced_items:=v_priced_items||jsonb_build_array(jsonb_build_object('item_id',v_item.id,'line_key',v_item.line_key,'product_id',v_item.product_id,'name',v_item.name,'photo_url',v_item.photo_url,'unit_price',round(v_unit,2),'quantity',v_item.quantity,'line_total',round(v_unit*v_item.quantity,2),'options',coalesce(v_options,'{}'::jsonb),'note',v_item.note,'contributor_id',v_item.user_id));
  end loop;
  if exists(select 1 from (select i.product_id,sum(i.quantity) qty,max(p.stock) stock from public.goodies_group_order_items i join public.goodies_products p on p.id=i.product_id where i.group_id=v_group.id group by i.product_id) s where s.qty>s.stock) then
    raise exception 'The shared cart contains quantities above current stock. Update the cart and retry.' using errcode='P0001';
  end if;
  return jsonb_build_object('group_id',v_group.id,'store_id',v_group.store_id,'store_name',v_store.store_name,'status',v_group.status,'expires_at',v_group.expires_at,'item_count',v_count,'subtotal',round(v_subtotal,2),'items',v_priced_items);
end;
$function$;

CREATE OR REPLACE FUNCTION public.goodies_group_order_create(p_store_id text)
 RETURNS TABLE(group_id uuid, invite_code text, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions', 'pg_temp'
AS $function$
declare
  v_uid uuid:=auth.uid();
  v_id uuid;
  v_code text;
  v_try integer:=0;
begin
  if v_uid is null then raise exception 'Sign in to start a group order' using errcode='28000'; end if;
  if not private.goodies_customer_can_access() then raise exception 'Your access to Goodies is restricted' using errcode='42501'; end if;
  if not exists(select 1 from public.goodies_store_schedules where store_id=p_store_id and is_live=true) then
    raise exception 'This store is not accepting orders' using errcode='P0001';
  end if;
  loop
    v_code:=upper(substr(encode(extensions.gen_random_bytes(6),'hex'),1,8));
    exit when not exists(select 1 from public.goodies_group_orders g where g.invite_code=v_code and g.status='open' and g.expires_at>now());
    v_try:=v_try+1;
    if v_try>10 then raise exception 'Could not create an invite code' using errcode='P0001'; end if;
  end loop;
  insert into public.goodies_group_orders(invite_code,store_id,host_user_id,status,max_members,expires_at)
  values(v_code,p_store_id,v_uid,'open',20,now()+interval '24 hours')
  returning id into v_id;
  insert into public.goodies_group_order_members(group_id,user_id,role) values(v_id,v_uid,'host');
  return query select g.id,g.invite_code,g.expires_at from public.goodies_group_orders g where g.id=v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.goodies_group_order_decline_invite(p_group_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  update public.goodies_group_order_invites i
  set status = 'declined'
  where i.group_id = p_group_id
    and i.invited_user_id = v_uid
    and i.status = 'pending';
end;
$function$;

CREATE OR REPLACE FUNCTION public.goodies_group_order_end(p_group_id uuid)
 RETURNS TABLE(group_id uuid, status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_group public.goodies_group_orders%rowtype;
begin
  if v_uid is null then
    raise exception 'Sign in to end this group order' using errcode = '28000';
  end if;
  if not private.goodies_customer_can_access() then
    raise exception 'Your access to Goodies is currently suspended or banned' using errcode = '42501';
  end if;
  select * into v_group
    from public.goodies_group_orders
   where id = p_group_id
   for update;
  if not found then
    raise exception 'Group order not found' using errcode = 'P0002';
  end if;
  if v_group.host_user_id <> v_uid then
    raise exception 'Only the group host can end this group order' using errcode = '42501';
  end if;
  if v_group.status <> 'open' then
    raise exception 'This group order is no longer open' using errcode = 'P0001';
  end if;
  update public.goodies_group_orders
     set status = 'cancelled', updated_at = now()
   where id = p_group_id;
  return query select p_group_id, 'cancelled'::text;
end;
$function$;

CREATE OR REPLACE FUNCTION public.goodies_group_order_get_status(p_group_id uuid)
 RETURNS TABLE(group_id uuid, status text, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_uid uuid:=auth.uid();
begin
  if v_uid is null then raise exception 'Sign in to view this group order' using errcode='28000'; end if;
  if not private.goodies_customer_can_access() then raise exception 'Your access to Goodies is restricted' using errcode='42501'; end if;
  if not exists(select 1 from public.goodies_group_order_members m where m.group_id=p_group_id and m.user_id=v_uid) then
    raise exception 'You are not a member of this group order' using errcode='42501';
  end if;
  return query select g.id,g.status,g.expires_at from public.goodies_group_orders g where g.id=p_group_id;
  if not found then raise exception 'Group order not found' using errcode='P0002'; end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.goodies_group_order_invite_friends(p_group_id uuid, p_user_ids uuid[])
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_group public.goodies_group_orders%rowtype;
  v_target uuid;
  v_invite_id uuid;
  v_existing_status text;
  v_reserved integer;
  v_sent integer := 0;
  v_name text;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select g.* into v_group
  from public.goodies_group_orders g
  where g.id = p_group_id
  for update;

  if not found then
    raise exception 'Group order not found' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.goodies_group_order_members m
    where m.group_id = p_group_id and m.user_id = v_uid
  ) then
    raise exception 'Only group members can invite friends' using errcode = '42501';
  end if;
  if v_group.status <> 'open' or v_group.expires_at <= pg_catalog.now() then
    raise exception 'This group order has closed' using errcode = 'P0001';
  end if;

  select coalesce(nullif(pg_catalog.btrim(p.full_name), ''), 'A friend')
    into v_name
  from public.profiles p
  where p.id = v_uid;

  for v_target in
    select distinct target_id
    from pg_catalog.unnest(coalesce(p_user_ids, '{}'::uuid[])) as requested(target_id)
    where target_id is not null
    order by target_id
  loop
    continue when v_target = v_uid;
    continue when not exists (
      select 1
      from public.user_friendships f
      where f.status = 'accepted'
        and (
          (f.requester_id = v_uid and f.recipient_id = v_target)
          or (f.requester_id = v_target and f.recipient_id = v_uid)
        )
    );
    continue when exists (
      select 1
      from public.goodies_group_order_members m
      where m.group_id = p_group_id and m.user_id = v_target
    );

    select i.status into v_existing_status
    from public.goodies_group_order_invites i
    where i.group_id = p_group_id and i.invited_user_id = v_target;

    -- Repeated sends to an already-pending recipient are a no-op.
    if v_existing_status = 'pending' then
      continue;
    end if;

    -- Count members and outstanding invitations as reserved places.
    select pg_catalog.count(*)::integer into v_reserved
    from (
      select m.user_id
      from public.goodies_group_order_members m
      where m.group_id = p_group_id
      union
      select i.invited_user_id
      from public.goodies_group_order_invites i
      where i.group_id = p_group_id and i.status = 'pending'
    ) reserved_places;

    if v_reserved >= v_group.max_members then
      raise exception 'This group order has reached its member limit' using errcode = 'P0001';
    end if;

    v_invite_id := null;
    if v_existing_status = 'declined' then
      update public.goodies_group_order_invites i
      set status = 'pending',
          invited_by = v_uid,
          created_at = pg_catalog.now()
      where i.group_id = p_group_id
        and i.invited_user_id = v_target
        and i.status = 'declined'
      returning i.id into v_invite_id;
    else
      insert into public.goodies_group_order_invites(group_id, invited_user_id, invited_by)
      values (p_group_id, v_target, v_uid)
      on conflict (group_id, invited_user_id) do nothing
      returning id into v_invite_id;
    end if;

    if v_invite_id is not null then
      v_sent := v_sent + 1;
      begin
        insert into public.notifications(user_id, title, body, feature_name, notification_type, metadata)
        values (
          v_target,
          'Group order invite',
          coalesce(v_name, 'A friend') || ' invited you to a group order.',
          'goodies',
          'goodies_group_invite',
          pg_catalog.jsonb_build_object('group_id', p_group_id, 'invite_code', v_group.invite_code)
        );
      exception when others then
        null;
      end;
    end if;
  end loop;

  return v_sent;
end;
$function$;

CREATE OR REPLACE FUNCTION public.goodies_group_order_join(p_invite_code text)
 RETURNS TABLE(group_id uuid, invite_code text, store_id text, expires_at timestamp with time zone, member_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_uid uuid:=auth.uid(); v_group public.goodies_group_orders%rowtype; v_count int;
begin
 if v_uid is null then raise exception 'Sign in to join a group order' using errcode='28000'; end if;
 if not private.goodies_customer_can_access() then raise exception 'Your access to Goodies is restricted' using errcode='42501'; end if;
 select * into v_group from public.goodies_group_orders where invite_code=upper(trim(p_invite_code)) for update;
 if not found or v_group.status<>'open' or v_group.expires_at<=now() then raise exception 'This group invite code is invalid or expired' using errcode='P0001'; end if;
 select count(*) into v_count from public.goodies_group_order_members where group_id=v_group.id;
 if exists(select 1 from public.goodies_group_order_members where group_id=v_group.id and user_id=v_uid) then
  return query select v_group.id,v_group.invite_code,v_group.store_id,v_group.expires_at,v_count; return;
 end if;
 if v_count>=v_group.max_members then raise exception 'This group order is full' using errcode='P0001'; end if;
 insert into public.goodies_group_order_members(group_id,user_id,role) values(v_group.id,v_uid,'member');
 return query select v_group.id,v_group.invite_code,v_group.store_id,v_group.expires_at,v_count+1;
end $function$;

CREATE OR REPLACE FUNCTION public.goodies_group_order_list_friends(p_group_id uuid)
 RETURNS TABLE(user_id uuid, display_name text, avatar_url text, already_member boolean, already_invited boolean, invite_status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_group_status text;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select g.status into v_group_status
  from public.goodies_group_orders g
  where g.id = p_group_id
    and g.expires_at > pg_catalog.now();

  if v_group_status is null or v_group_status <> 'open' then
    raise exception 'This group order has closed or expired' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.goodies_group_order_members m
    where m.group_id = p_group_id and m.user_id = v_uid
  ) then
    raise exception 'You are not a member of this group' using errcode = '42501';
  end if;

  return query
    select
      p.id,
      coalesce(nullif(pg_catalog.btrim(p.full_name), ''), 'Wantiss member'),
      p.avatar_url,
      exists (
        select 1 from public.goodies_group_order_members m
        where m.group_id = p_group_id and m.user_id = p.id
      ),
      exists (
        select 1 from public.goodies_group_order_invites i
        where i.group_id = p_group_id
          and i.invited_user_id = p.id
          and i.status = 'pending'
      ),
      case
        when exists (
          select 1 from public.goodies_group_order_members m
          where m.group_id = p_group_id and m.user_id = p.id
        ) then 'joined'
        when exists (
          select 1 from public.goodies_group_order_invites i
          where i.group_id = p_group_id
            and i.invited_user_id = p.id
            and i.status = 'pending'
        ) then 'invited'
        when exists (
          select 1 from public.goodies_group_order_invites i
          where i.group_id = p_group_id
            and i.invited_user_id = p.id
            and i.status = 'declined'
        ) then 'declined'
        else null
      end
    from public.user_friendships f
    join public.profiles p
      on p.id = case
        when f.requester_id = v_uid then f.recipient_id
        else f.requester_id
      end
    where f.status = 'accepted'
      and v_uid in (f.requester_id, f.recipient_id)
    order by 2;
end;
$function$;

CREATE OR REPLACE FUNCTION public.goodies_group_order_list_members(p_group_id uuid)
 RETURNS TABLE(user_id uuid, display_name text, role text, is_host boolean, joined_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if not private.goodies_customer_can_access() then
    raise exception 'Customer access required';
  end if;
  if not private.goodies_group_is_member(p_group_id) then
    raise exception 'You are not a member of this group';
  end if;
  return query
    select m.user_id,
           coalesce(nullif(trim(p.full_name), ''), 'Wantiss member') as display_name,
           m.role,
           (m.user_id = g.host_user_id) as is_host,
           m.joined_at
    from public.goodies_group_order_members m
    join public.goodies_group_orders g on g.id = m.group_id
    left join public.profiles p on p.id = m.user_id
    where m.group_id = p_group_id
    order by m.joined_at asc;
end;
$function$;

CREATE OR REPLACE FUNCTION public.goodies_group_order_my_invites()
 RETURNS TABLE(group_id uuid, invite_code text, store_id text, host_name text, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  return query
    select
      g.id,
      g.invite_code,
      g.store_id,
      coalesce(nullif(pg_catalog.btrim(p.full_name), ''), 'A friend'),
      g.expires_at
    from public.goodies_group_order_invites i
    join public.goodies_group_orders g on g.id = i.group_id
    left join public.profiles p on p.id = g.host_user_id
    where i.invited_user_id = v_uid
      and i.status = 'pending'
      and g.status = 'open'
      and g.expires_at > pg_catalog.now()
      and not exists (
        select 1
        from public.goodies_group_order_members m
        where m.group_id = g.id and m.user_id = v_uid
      )
    order by i.created_at desc;
end;
$function$;

CREATE OR REPLACE FUNCTION public.goodies_group_order_remove_item(p_group_id uuid, p_line_key text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not private.goodies_customer_can_access() then raise exception 'Customer access required'; end if;
  if not private.goodies_group_is_member(p_group_id) then raise exception 'You are not a member of this group'; end if;
  delete from public.goodies_group_order_items
   where group_id=p_group_id and user_id=auth.uid() and line_key=p_line_key;
  if not found then raise exception 'Item not found or you cannot remove another member''s item'; end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.goodies_group_order_upsert_item(p_group_id uuid, p_product_id uuid, p_line_key text, p_quantity integer, p_options jsonb DEFAULT '{}'::jsonb, p_note text DEFAULT NULL::text)
 RETURNS TABLE(item_id uuid, product_name text, quantity integer, unit_price numeric, photo_url text, contributed_by uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_uid uuid:=auth.uid(); v_group public.goodies_group_orders%rowtype; v_product public.goodies_products%rowtype; v_existing integer:=0; v_existing_product uuid; v_total integer:=0;
begin
 if v_uid is null then raise exception 'Sign in to add items to a group order' using errcode='28000'; end if;
 if not private.goodies_customer_can_access() then raise exception 'Your access to Goodies is restricted' using errcode='42501'; end if;
 if p_quantity<1 or p_quantity>99 then raise exception 'Quantity must be between 1 and 99' using errcode='22023'; end if;
 if length(coalesce(p_line_key,''))<1 or length(p_line_key)>180 then raise exception 'Invalid item key' using errcode='22023'; end if;
 if p_options is null or jsonb_typeof(p_options)<>'object' then raise exception 'Invalid item options' using errcode='22023'; end if;
 select * into v_group from public.goodies_group_orders where id=p_group_id for update;
 if not found or v_group.status<>'open' or v_group.expires_at<=now() then raise exception 'This group order is closed or expired' using errcode='P0001'; end if;
 if not exists(select 1 from public.goodies_group_order_members m where m.group_id=v_group.id and m.user_id=v_uid) then raise exception 'Join this group before adding items' using errcode='42501'; end if;
 select p.* into v_product from public.goodies_products p join public.goodies_store_schedules b on b.business_id=p.business_id
 where p.id=p_product_id and b.store_id=v_group.store_id and b.is_live=true and p.is_available=true for update of p;
 if not found then raise exception 'This product is unavailable in the group store' using errcode='P0001'; end if;
 select quantity,product_id into v_existing,v_existing_product from public.goodies_group_order_items where group_id=v_group.id and user_id=v_uid and line_key=p_line_key;
 if v_existing_product is not null and v_existing_product<>p_product_id then raise exception 'Item key does not match the selected product' using errcode='22023'; end if;
 select coalesce(sum(quantity),0) into v_total from public.goodies_group_order_items where group_id=v_group.id and product_id=p_product_id;
 if v_total-coalesce(v_existing,0)+p_quantity>v_product.stock then raise exception 'The requested quantity exceeds available stock' using errcode='P0001'; end if;
 return query insert into public.goodies_group_order_items as item(group_id,user_id,line_key,product_id,quantity,options,note)
 values(v_group.id,v_uid,p_line_key,p_product_id,p_quantity,p_options,nullif(left(coalesce(p_note,''),500),''))
 on conflict(group_id,user_id,line_key) do update set product_id=excluded.product_id,quantity=excluded.quantity,options=excluded.options,note=excluded.note,updated_at=now()
 returning item.id,v_product.name,item.quantity,v_product.price,v_product.photo_url,item.user_id;
end $function$;

CREATE OR REPLACE FUNCTION public.goodies_group_remove_item(p_item_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Sign in to remove items' using errcode='28000'; end if;
  delete from public.goodies_group_order_items i
   where i.id=p_item_id and (i.user_id=v_uid or exists(
     select 1 from public.goodies_group_order_members m where m.group_id=i.group_id and m.user_id=v_uid and m.role='host'
   ))
   and exists(select 1 from public.goodies_group_orders g where g.id=i.group_id and g.status='open' and g.expires_at>now());
  return found;
end;
$function$;

CREATE OR REPLACE FUNCTION public.goodies_hours_allow_order(p_hours jsonb, p_timezone text, p_at timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare
  v_days text[] := array['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  v_local timestamp without time zone;
  v_day_index integer;
  v_today jsonb;
  v_yesterday jsonb;
  v_open time without time zone;
  v_close time without time zone;
  v_prev_open time without time zone;
  v_prev_close time without time zone;
  v_local_time time without time zone;
begin
  if p_at is null or p_hours is null or pg_catalog.jsonb_typeof(p_hours) <> 'object'
     or p_hours = '{}'::jsonb then
    return false;
  end if;

  begin
    v_local := p_at at time zone coalesce(nullif(pg_catalog.btrim(p_timezone), ''), 'UTC');
  exception when others then
    return false;
  end;

  v_day_index := extract(dow from v_local)::integer;
  v_local_time := v_local::time;
  v_today := p_hours -> v_days[v_day_index + 1];
  v_yesterday := p_hours -> v_days[((v_day_index + 6) % 7) + 1];

  if v_today is not null
     and pg_catalog.jsonb_typeof(v_today) = 'object'
     and coalesce(v_today ->> 'closed', 'false') <> 'true'
     and coalesce(v_today ->> 'open', '') ~ '^([0-9]|[01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$'
     and coalesce(v_today ->> 'close', '') ~ '^([0-9]|[01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$' then
    v_open := (v_today ->> 'open')::time;
    v_close := (v_today ->> 'close')::time;

    if v_open < v_close and v_local_time >= v_open and v_local_time < v_close then
      return true;
    elsif v_open >= v_close and v_local_time >= v_open then
      return true;
    end if;
  end if;

  -- A previous day's overnight opening window may still be active after midnight.
  if v_yesterday is not null
     and pg_catalog.jsonb_typeof(v_yesterday) = 'object'
     and coalesce(v_yesterday ->> 'closed', 'false') <> 'true'
     and coalesce(v_yesterday ->> 'open', '') ~ '^([0-9]|[01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$'
     and coalesce(v_yesterday ->> 'close', '') ~ '^([0-9]|[01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$' then
    v_prev_open := (v_yesterday ->> 'open')::time;
    v_prev_close := (v_yesterday ->> 'close')::time;

    if v_prev_open >= v_prev_close and v_local_time < v_prev_close then
      return true;
    end if;
  end if;

  return false;
end;
$function$;

CREATE OR REPLACE FUNCTION public.goodies_ingredient_request_notifications()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_business_name text;
declare v_title text;
declare v_body text;
declare v_type text;
begin
  select b.name into v_business_name from public.businesses b where b.id = new.business_id;
  if tg_op = 'INSERT' then
    v_title := 'New Goodies ingredient request';
    v_body := coalesce(v_business_name, 'A merchant') || ' requested ' || new.name || ' for ' || new.builder || '.';
    insert into public.notifications (user_id, title, body, feature_name, notification_type, destination, metadata, read)
    select s.user_id, v_title, v_body, 'goodies', 'goodies_ingredient_request', 'goodiesIngredientRequests',
      jsonb_build_object('request_id', new.id, 'business_id', new.business_id, 'ingredient', new.name), false
    from public.wantiss_admin_staff s
    where s.status = 'active'
      and (
        s.role = 'super_admin'
        or exists (select 1 from public.wantiss_admin_permission_grants g where g.staff_user_id = s.user_id and g.permission_key = 'goodies.requests' and g.access_level in ('view','edit') and g.revoked_at is null and (g.expires_at is null or g.expires_at > now()))
      );
  elsif new.status is distinct from old.status then
    v_title := case new.status when 'approved' then 'Ingredient request approved' when 'denied' then 'Ingredient request declined' when 'needs_info' then 'More information needed' else 'Ingredient request updated' end;
    v_body := case new.status when 'approved' then 'Your ingredient ' || new.name || ' was approved and added to the builder library.' when 'denied' then 'Your ingredient ' || new.name || ' was declined. ' || coalesce(new.review_note, '') when 'needs_info' then 'More information is needed for ' || new.name || '. ' || coalesce(new.review_note, '') else 'Your ingredient request was updated.' end;
    insert into public.notifications (user_id, title, body, feature_name, notification_type, destination, metadata, read)
    values (new.requested_by, v_title, v_body, 'goodies', 'goodies_ingredient_' || new.status, 'goodiesRequests',
      jsonb_build_object('request_id', new.id, 'business_id', new.business_id, 'ingredient', new.name, 'status', new.status, 'review_note', new.review_note), false);
  end if;
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.goodies_list_dispatch_couriers(p_order_id uuid)
 RETURNS TABLE(courier_id uuid, full_name text, phone_number text, accepts_cash_on_delivery boolean, last_seen timestamp with time zone, distance_km numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_uid uuid:=auth.uid(); v_order public.goodies_orders%rowtype;
begin
 if v_uid is null then raise exception 'Sign in required' using errcode='28000'; end if;
 select * into v_order from public.goodies_orders where id=p_order_id;
 if not found then raise exception 'Order not found' using errcode='P0002'; end if;
 if not (exists(select 1 from public.business_members bm where bm.business_id=v_order.business_id and bm.user_id=v_uid and bm.role in ('owner','admin'))
  or exists(select 1 from public.profiles p where p.id=v_uid and lower(coalesce(p.role,'')) in ('admin','super_admin'))) then raise exception 'Not allowed to view couriers' using errcode='42501'; end if;
 return query
 select p.id,p.full_name,p.phone_number,cp.accepts_cash_on_delivery,cp.updated_at,
  case when cp.last_location_at is null or cp.last_location_at<now()-interval '3 minutes'
      or cp.latitude is null or cp.longitude is null or v_order.store_latitude is null or v_order.store_longitude is null then null::numeric
   else round((6371.0*2.0*asin(sqrt(least(1.0,greatest(0.0,
    power(sin(radians(cp.latitude-v_order.store_latitude)/2.0),2)
    +cos(radians(v_order.store_latitude))*cos(radians(cp.latitude))*power(sin(radians(cp.longitude-v_order.store_longitude)/2.0),2)
   )))))::numeric,1) end
 from public.goodies_courier_presence cp
 join public.goodies_courier_roster cr on cr.courier_id=cp.courier_id and cr.is_approved
 join public.profiles p on p.id=cp.courier_id
 where cp.is_available and cp.updated_at>now()-interval '3 minutes'
  and not exists(select 1 from public.goodies_delivery_assignments busy where busy.courier_id=cp.courier_id and busy.order_id<>p_order_id and busy.status in ('offered','accepted','picked_up'))
  and (coalesce(v_order.payment_method,'wallet')<>'cash' or (
    public.goodies_cash_global_enabled() and cp.accepts_cash_on_delivery and exists(select 1 from public.goodies_store_schedules gs
      where gs.store_id=v_order.store_id and gs.business_id=v_order.business_id and gs.is_live and gs.accept_cash_on_delivery)
  ))
 order by
  case when cp.last_location_at is null or cp.last_location_at<now()-interval '3 minutes'
       or cp.latitude is null or cp.longitude is null or v_order.store_latitude is null or v_order.store_longitude is null then 1 else 0 end,
  case when cp.last_location_at is null or cp.last_location_at<now()-interval '3 minutes'
       or cp.latitude is null or cp.longitude is null or v_order.store_latitude is null or v_order.store_longitude is null then null
   else 6371.0*2.0*asin(sqrt(least(1.0,greatest(0.0,
    power(sin(radians(cp.latitude-v_order.store_latitude)/2.0),2)
    +cos(radians(v_order.store_latitude))*cos(radians(cp.latitude))*power(sin(radians(cp.longitude-v_order.store_longitude)/2.0),2)
   )))) end,
  cp.updated_at desc;
end $function$;

CREATE OR REPLACE FUNCTION public.goodies_list_ingredient_requests(p_business uuid)
 RETURNS TABLE(id uuid, name text, builder text, role text, note text, status text, review_note text, created_at timestamp with time zone, image_path text, library_id text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Sign in required' using errcode = '28000'; end if;
  if not exists (select 1 from public.business_members bm where bm.business_id = p_business and bm.user_id = v_uid and bm.role in ('owner','admin')) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  return query select r.id, r.name, r.builder, r.role, r.note, r.status, r.review_note, r.created_at, r.image_path, r.library_id
    from public.goodies_ingredient_requests r where r.business_id = p_business order by r.created_at desc limit 200;
end $function$;

CREATE OR REPLACE FUNCTION public.goodies_list_library_ingredients()
 RETURNS TABLE(id text, builder text, role text, name text, asset_key text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode = '28000'; end if;
  return query select l.id, l.builder, l.role, l.name, l.asset_key from public.goodies_library_ingredients l where l.active order by l.builder, l.name;
end $function$;

CREATE OR REPLACE FUNCTION public.goodies_notify_store_on_payment_confirmed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_member record;
begin
  if new.status = 'placed'
     and new.payment_method = 'card'
     and new.payment_status = 'paid'
     and (old.status is distinct from 'placed' or old.payment_status is distinct from 'paid') then
    for v_member in
      select bm.user_id
      from public.business_members bm
      where bm.business_id = new.business_id
    loop
      perform public.goodies_order_notify(
        v_member.user_id, 'New Goodies order',
        'Order ' || new.order_code || ' needs a response within 15 minutes.',
        new.id, new.order_code, 'placed', null
      );
    end loop;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.goodies_order_after_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_member record;
begin
  if new.status = 'placed' then
    update public.goodies_orders
      set acceptance_deadline_at = coalesce(new.acceptance_deadline_at, now() + interval '15 minutes')
      where id = new.id;
    perform public.goodies_order_notify(
      new.customer_id, 'Goodies order placed',
      'Your order ' || new.order_code || ' was sent to the store. The store has 15 minutes to respond.',
      new.id, new.order_code, 'placed', null
    );
    if new.payment_method <> 'card' or new.payment_status = 'paid' then
      for v_member in select bm.user_id from public.business_members bm where bm.business_id = new.business_id loop
        perform public.goodies_order_notify(v_member.user_id, 'New Goodies order',
          'Order ' || new.order_code || ' needs a response within 15 minutes.',
          new.id, new.order_code, 'placed', null);
      end loop;
    end if;
  elsif new.status = 'scheduled' then
    perform public.goodies_order_notify(
      new.customer_id, 'Goodies order scheduled',
      'Your order ' || new.order_code || ' is scheduled. The store will be asked to respond when the scheduled time arrives.',
      new.id, new.order_code, 'scheduled', null
    );
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.goodies_order_notify(p_user_id uuid, p_title text, p_body text, p_order_id uuid, p_order_code text, p_status text, p_reason_code text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_method text; v_payment_status text; v_customer uuid;
begin
  if p_user_id is null then return; end if;
  if p_status in ('declined','expired','cancelled') then
    select payment_method,payment_status,customer_id into v_method,v_payment_status,v_customer from public.goodies_orders where id=p_order_id;
    if p_user_id=v_customer and v_method='card' then
      if v_payment_status='refund_pending' then
        p_body:=regexp_replace(p_body,' You were not charged for this order\.?$','')||' Your card refund is being processed.';
      elsif v_payment_status='refund_manual_review' then
        p_body:=regexp_replace(p_body,' You were not charged for this order\.?$','')||' We are reviewing your card refund and will update you.';
      end if;
    end if;
  end if;
  insert into public.notifications (
    user_id, vendor_id, title, body, notification_type, feature_name, destination, metadata
  ) values (
    p_user_id, null, left(p_title, 120), left(p_body, 1000), 'goodies_order',
    'Goodies', 'goodies/orders',
    jsonb_strip_nulls(jsonb_build_object(
      'order_id', p_order_id, 'order_code', p_order_code, 'status', p_status,
      'reason_code', p_reason_code
    ))
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.goodies_orders_capture_delivery_coordinates()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_quote public.goodies_delivery_quotes%rowtype; v_quote_id uuid;
begin
 if new.order_type='delivery' and new.address is not null then
  if nullif(new.address->>'delivery_quote_id','') is not null then
   begin
    v_quote_id:=(new.address->>'delivery_quote_id')::uuid;
   exception when invalid_text_representation then
    raise exception 'Invalid delivery location quote' using errcode='22023';
   end;
   select * into v_quote from public.goodies_delivery_quotes q
    where q.id=v_quote_id and q.customer_id=new.customer_id and q.store_id=new.store_id;
  else
   select * into v_quote from public.goodies_delivery_quotes q
    where q.customer_id=new.customer_id and q.store_id=new.store_id
      and q.address_payload=(new.address-'delivery_quote_id')
      and q.created_at>now()-interval '6 minutes'
    order by q.created_at desc limit 1;
  end if;
  if found then
   new.store_latitude:=v_quote.origin_latitude;
   new.store_longitude:=v_quote.origin_longitude;
   new.delivery_latitude:=v_quote.destination_latitude;
   new.delivery_longitude:=v_quote.destination_longitude;
  end if;
 end if;
 return new;
end $function$;

CREATE OR REPLACE FUNCTION public.goodies_place_multi_order(p_idempotency_key text, p_payment_method text, p_order_type text, p_scheduled_for timestamp with time zone, p_address jsonb, p_contact_phone text, p_stops jsonb, p_service_fee numeric, p_tip numeric, p_notes text)
 RETURNS TABLE(group_id uuid, order_id uuid, order_code text, status text, stop_index integer, store_id text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid(); v_content jsonb; v_max int := 3; v_n int; v_i int := 0; v_stop jsonb;
  v_group uuid; v_existing_group uuid; v_existing_fingerprint text; v_fingerprint text;
  v_fingerprint_stops jsonb; v_existing_count integer; v_first boolean;
  v_seen text[] := '{}'; v_sid text; v_sub numeric; v_fee numeric;
  v_svc numeric; v_tip numeric; v_total numeric; v_addr jsonb; v_created record;
  v_sum_sub numeric := 0; v_sum_fee numeric := 0; v_sum_total numeric := 0;
begin
  if v_uid is null then raise exception 'Sign in to place an order' using errcode='28000'; end if;
  if p_payment_method is null or p_payment_method not in ('wallet','cash') then
    raise exception 'Multi-store orders can be paid with your Wantiss Wallet or cash' using errcode='22023';
  end if;
  if p_idempotency_key is null or length(btrim(p_idempotency_key)) < 8 or length(p_idempotency_key) > 200 then
    raise exception 'A valid multi-store checkout idempotency key is required' using errcode='22023';
  end if;
  if p_order_type is null or p_order_type not in ('delivery','pickup') then
    raise exception 'Invalid order type' using errcode='22023';
  end if;
  if p_stops is null or jsonb_typeof(p_stops) <> 'array' then raise exception 'No stores in this order' using errcode='22023'; end if;
  v_n := jsonb_array_length(p_stops);
  if v_n < 1 or v_n > 8 then raise exception 'Choose between one and eight stores' using errcode='22023'; end if;

  -- Fingerprint the parent request, excluding expiring quote IDs so a safe retry
  -- after a network timeout can return the original group and its original stops.
  select coalesce(jsonb_agg(s.stop - 'delivery_quote_id' order by s.ordinality), '[]'::jsonb)
    into v_fingerprint_stops
    from jsonb_array_elements(p_stops) with ordinality as s(stop, ordinality);
  v_fingerprint := md5(jsonb_build_object(
    'payment_method', p_payment_method,
    'order_type', p_order_type,
    'scheduled_for', p_scheduled_for,
    'address', case when p_address is null then null else p_address - 'delivery_quote_id' end,
    'contact_phone', p_contact_phone,
    'stops', v_fingerprint_stops,
    'service_fee', p_service_fee,
    'tip', p_tip,
    'notes', p_notes
  )::text);

  -- Serialize requests sharing a customer/key. The unique constraint is the
  -- final guard; the lock makes identical concurrent retries deterministic.
  perform pg_advisory_xact_lock(hashtextextended('goodies.multi:' || v_uid::text || ':' || p_idempotency_key, 0));
  select g.id, g.request_fingerprint
    into v_existing_group, v_existing_fingerprint
    from public.goodies_order_groups g
   where g.customer_id = v_uid and g.idempotency_key = p_idempotency_key
   for update;
  if found then
    if v_existing_fingerprint is distinct from v_fingerprint then
      raise exception 'This checkout key was already used for different multi-store order details. Start a new checkout.' using errcode='22023';
    end if;
    select count(*) into v_existing_count
      from public.goodies_orders o
     where o.parent_id = v_existing_group and o.customer_id = v_uid;
    if v_existing_count <> v_n then
      raise exception 'The original multi-store checkout is incomplete. Please contact support before retrying.' using errcode='P0001';
    end if;
    return query
      select v_existing_group, o.id, o.order_code, o.status, o.stop_index, o.store_id
        from public.goodies_orders o
       where o.parent_id = v_existing_group and o.customer_id = v_uid
       order by o.stop_index;
    return;
  end if;

  select c.payload into v_content from public.wantiss_cms_content c
   where c.content_key = 'goodies.content' and c.status = 'published' and c.locale = 'en' order by c.version desc limit 1;
  begin v_max := greatest(1, least(8, coalesce(nullif(v_content->'fees'->>'maxStops','')::int, 3))); exception when others then v_max := 3; end;
  if v_n > v_max then raise exception 'You can order from up to % stores at once', v_max using errcode='P0001'; end if;
  if v_n > 1 and p_order_type <> 'delivery' then raise exception 'Ordering from several stores is available for delivery only' using errcode='22023'; end if;

  select not exists(select 1 from public.goodies_orders o where o.customer_id = v_uid) into v_first;
  perform set_config('app.goodies_group_first_order', v_first::text, true);

  insert into public.goodies_order_groups(customer_id, order_type, stop_count, payment_method, idempotency_key, request_fingerprint)
    values (v_uid, p_order_type, v_n, p_payment_method, p_idempotency_key, v_fingerprint)
    returning id into v_group;

  for v_stop in select * from jsonb_array_elements(p_stops) loop
    v_i := v_i + 1;
    v_sid := nullif(trim(v_stop->>'store_id'), '');
    if v_sid is null or v_sid = any(v_seen) then raise exception 'Each store can appear once in an order' using errcode='22023'; end if;
    v_seen := v_seen || v_sid;
    v_sub := coalesce(nullif(v_stop->>'subtotal','')::numeric, 0);
    v_fee := coalesce(nullif(v_stop->>'delivery_fee','')::numeric, 0);
    v_svc := case when v_i = 1 then coalesce(p_service_fee, 0) else 0 end;
    v_tip := case when v_i = 1 then coalesce(p_tip, 0) else 0 end;
    v_total := v_sub + v_fee + v_svc + v_tip;
    perform set_config('app.goodies_group_waive_service_fee', case when v_i = 1 then 'off' else 'on' end, true);
    v_addr := case when p_order_type = 'delivery' then (coalesce(p_address, '{}'::jsonb) || jsonb_build_object('delivery_quote_id', v_stop->>'delivery_quote_id')) else null end;
    select o.* into v_created from public.place_goodies_order_with_payment_once(
      md5(v_uid::text || ':' || p_idempotency_key || ':' || v_i::text), p_payment_method, v_sid, p_order_type, p_scheduled_for, v_addr, p_contact_phone,
      v_stop->'items', v_sub, v_fee, v_svc, 0, v_tip, v_total, p_notes, null) o limit 1;
    if v_created.id is null then raise exception 'A store order could not be created' using errcode='P0001'; end if;
    update public.goodies_orders as go set parent_id = v_group, stop_index = v_i where go.id = v_created.id and go.customer_id = v_uid;
    if not found then raise exception 'A store order could not be attached to its parent order' using errcode='P0001'; end if;
    v_sum_sub := v_sum_sub + v_sub; v_sum_fee := v_sum_fee + v_fee; v_sum_total := v_sum_total + v_total;
    group_id := v_group; order_id := v_created.id; order_code := v_created.order_code; status := v_created.status; stop_index := v_i; store_id := v_sid;
    return next;
  end loop;
  update public.goodies_order_groups as g set subtotal = v_sum_sub, delivery_fee = v_sum_fee, service_fee = coalesce(p_service_fee, 0),
    tip = coalesce(p_tip, 0), total = v_sum_total where g.id = v_group;
  perform set_config('app.goodies_group_waive_service_fee', 'off', true);
  perform set_config('app.goodies_group_first_order', '', true);
end $function$;

CREATE OR REPLACE FUNCTION public.goodies_products_default_pending_review()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if auth.uid() is not null and (
    coalesce(new.restriction, 'none') = 'alcohol'
    or concat_ws(' ', new.name, new.description) ~*
      '(alcohol|alcool|liquor|rhum|clairin|barbancourt|whisk|vodka|tequila|cognac|brandy|\mbeer|bi[èe]re|\mwine|champagne|cocktail)'
  ) then
    raise exception 'Alcohol products are prohibited on Wantiss' using errcode = 'P0001';
  end if;
  new.review_status := 'approved';
  new.review_note := null;
  new.reviewed_by := null;
  new.reviewed_at := null;
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.goodies_products_enforce_update_moderation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare v_is_admin boolean := false;
begin
  if auth.uid() is null then return new; end if;
  if coalesce(new.restriction, 'none') = 'alcohol'
     or concat_ws(' ', new.name, new.description) ~*
       '(alcohol|alcool|liquor|rhum|clairin|barbancourt|whisk|vodka|tequila|cognac|brandy|\mbeer|bi[èe]re|\mwine|champagne|cocktail)' then
    raise exception 'Alcohol products are prohibited on Wantiss' using errcode = 'P0001';
  end if;
  begin
    perform public.goodies_admin_assert();
    v_is_admin := true;
  exception when insufficient_privilege then
    v_is_admin := false;
  end;
  if new.review_status is distinct from old.review_status
     or new.review_note is distinct from old.review_note
     or new.reviewed_by is distinct from old.reviewed_by
     or new.reviewed_at is distinct from old.reviewed_at then
    if not v_is_admin then raise exception 'Only Wantiss administrators can change product review metadata' using errcode = '42501'; end if;
  end if;
  new.review_status := 'approved';
  new.review_note := null;
  new.reviewed_by := null;
  new.reviewed_at := null;
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.goodies_products_validate_photo_url()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare v_base text; v_prefix text; v_url text;
begin
 if new.photo_url is null then return new; end if;
 if tg_op='UPDATE' and new.photo_url is not distinct from old.photo_url then return new; end if;
 if auth.uid() is null then return new; end if;
 v_url:=lower(new.photo_url);
 v_base:=regexp_replace(coalesce(auth.jwt()->>'iss',''),'/auth/v1/?$','');
 v_prefix:=v_base||'/storage/v1/object/public/listing-photos/'||new.business_id::text||'/goodies/products/';
 if v_base='' or left(new.photo_url,length(v_prefix))<>v_prefix or not (v_url like any(array['%.jpg','%.jpeg','%.png','%.webp'])) then
  raise exception 'Product photos must be uploaded to this business Goodies product folder' using errcode='42501';
 end if;
 return new;
end $function$;

CREATE OR REPLACE FUNCTION public.goodies_require_cash_policy()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_store_accepts boolean;
  v_courier_available boolean;
  v_payment_context text;
  v_global_method_enabled boolean;
  v_method_key text;
begin
  v_payment_context := coalesce(current_setting('app.goodies_payment_context', true), '');

  -- The shared order creator inserts a temporary cash placeholder. Wallet and
  -- Card wrappers set this transaction-local context before calling it.
  if v_payment_context in ('wallet', 'card')
     and lower(coalesce(new.payment_method, '')) = 'cash' then
    v_method_key := case when v_payment_context = 'wallet' then 'Wallet' else 'Card' end;
    select exists (
      select 1
        from public.wantiss_cms_content c
       where c.content_key = 'goodies.content'
         and c.locale = 'en'
         and c.status = 'published'
         and coalesce(c.payload #>> array['fees', 'pay', v_method_key], '0') in ('1', 'true', 'TRUE')
    ) into v_global_method_enabled;
    if not coalesce(v_global_method_enabled, false) then
      raise exception '% payments are disabled for Goodies.', v_method_key
        using errcode = 'P0001';
    end if;
    new.payment_method := v_payment_context;
    return new;
  end if;

  if v_payment_context = lower(coalesce(new.payment_method, ''))
     and v_payment_context in ('wallet', 'card') then
    return new;
  end if;

  if lower(coalesce(new.payment_method, '')) <> 'cash' then
    return new;
  end if;

  select coalesce(s.accept_cash_on_delivery, false)
    into v_store_accepts
    from public.goodies_store_schedules s
   where s.store_id = new.store_id
     and s.business_id = new.business_id
     and s.is_live;

  select exists (
    select 1
      from public.goodies_courier_presence cp
      join public.goodies_courier_roster cr
        on cr.courier_id = cp.courier_id
       and cr.is_approved
     where cp.is_available
       and cp.accepts_cash_on_delivery
       and cp.updated_at > now() - interval '3 minutes'
       and not exists (
         select 1
           from public.goodies_delivery_assignments a
          where a.courier_id = cp.courier_id
            and a.status in ('offered', 'accepted', 'picked_up')
       )
  ) into v_courier_available;

  if not public.goodies_cash_global_enabled()
     or not coalesce(v_store_accepts, false)
     or not coalesce(v_courier_available, false) then
    raise exception 'Cash on delivery is unavailable. The global policy, store, and an available courier must all permit it.'
      using errcode = 'P0001';
  end if;

  return new;
end
$function$;

CREATE OR REPLACE FUNCTION public.goodies_save_builder_configs(p_business uuid, p_configs jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_config jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  if p_configs is null or jsonb_typeof(p_configs) <> 'array' then
    raise exception 'Builder configurations must be an array' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.business_members bm
    where bm.business_id = p_business and bm.user_id = (select auth.uid())
  ) then
    raise exception 'Not authorized for this business' using errcode = '42501';
  end if;

  for v_config in
    select cfg.value
    from jsonb_array_elements(p_configs) as cfg(value)
  loop
    if nullif(v_config->>'id', '') is null then
      raise exception 'Every builder needs an id' using errcode = '22023';
    end if;

    insert into public.goodies_builder_configs
      (business_id, builder_id, config, enabled, updated_at)
    values
      (p_business, v_config->>'id', v_config,
       coalesce((v_config->>'enabled')::boolean, false)
       and coalesce((v_config->>'available')::boolean, false), now())
    on conflict (business_id, builder_id)
    do update set
      config = excluded.config,
      enabled = excluded.enabled,
      updated_at = now();
  end loop;

  delete from public.goodies_builder_configs gbc
  where gbc.business_id = p_business
    and not exists (
      select 1
      from jsonb_array_elements(p_configs) as cfg(value)
      where cfg.value->>'id' = gbc.builder_id
    );
end;
$function$;

CREATE OR REPLACE FUNCTION public.goodies_save_store_cover(p_business uuid, p_cover_url text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode = '28000'; end if;
  if not exists (select 1 from public.business_members bm where bm.business_id = p_business and bm.user_id = auth.uid() and bm.role in ('owner','admin')) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if p_cover_url is not null and (length(p_cover_url) > 2048 or p_cover_url !~ '^https://') then raise exception 'Invalid store cover photo URL'; end if;
  update public.goodies_store_schedules set cover_url = p_cover_url, updated_at = now() where business_id = p_business;
  if not found then raise exception 'Save your store setup before adding a cover photo'; end if;
  return true;
end $function$;

CREATE OR REPLACE FUNCTION public.goodies_save_store_location(p_business uuid, p_latitude double precision, p_longitude double precision)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if auth.uid() is null then
    raise exception 'Sign in required' using errcode = '28000';
  end if;

  if not exists (
    select 1
    from public.business_members bm
    where bm.business_id = p_business
      and bm.user_id = auth.uid()
      and bm.role in ('owner', 'admin')
  ) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  if p_latitude is null or p_longitude is null
     or p_latitude::text in ('NaN', 'Infinity', '-Infinity')
     or p_longitude::text in ('NaN', 'Infinity', '-Infinity')
     or p_latitude < -90 or p_latitude > 90
     or p_longitude < -180 or p_longitude > 180 then
    raise exception 'Invalid store coordinates' using errcode = '22023';
  end if;

  update public.goodies_store_schedules
  set store_latitude = p_latitude,
      store_longitude = p_longitude,
      updated_at = now()
  where business_id = p_business;

  if not found then
    raise exception 'Save your store setup before setting its location';
  end if;

  return true;
end;
$function$;

CREATE OR REPLACE FUNCTION public.goodies_save_store_setup(p_business uuid, p_category text, p_kind text, p_min_order numeric, p_delivery_fee numeric, p_eta_min integer, p_eta_max integer, p_promo text, p_names jsonb, p_delivery boolean, p_pickup boolean, p_delivery_pricing_mode text, p_delivery_base_fee numeric, p_delivery_per_km_fee numeric, p_delivery_min_fee numeric, p_delivery_max_fee numeric, p_delivery_max_distance_km numeric, p_address text, p_city text, p_country text, p_accept_scheduled_orders boolean, p_scheduled_order_start_time text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_start_time time;
begin
  if p_accept_scheduled_orders then
    if coalesce(p_scheduled_order_start_time, '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
      raise exception 'Choose a valid earliest order time' using errcode = '22023';
    end if;
    v_start_time := p_scheduled_order_start_time::time;
  else
    v_start_time := coalesce(nullif(p_scheduled_order_start_time, '')::time, time '10:00');
  end if;

  perform public.goodies_save_store_setup(
    p_business, p_category, p_kind, p_min_order, p_delivery_fee,
    p_eta_min, p_eta_max, p_promo, p_names, p_delivery, p_pickup,
    p_delivery_pricing_mode, p_delivery_base_fee, p_delivery_per_km_fee,
    p_delivery_min_fee, p_delivery_max_fee, p_delivery_max_distance_km,
    p_address, p_city, p_country
  );

  update public.goodies_store_schedules
  set accept_scheduled_orders = coalesce(p_accept_scheduled_orders, false),
      scheduled_order_start_time = v_start_time,
      updated_at = now()
  where business_id = p_business;
end;
$function$;

CREATE OR REPLACE FUNCTION public.goodies_save_store_setup(p_business uuid, p_category text, p_kind text, p_min_order numeric, p_delivery_fee numeric, p_eta_min integer, p_eta_max integer, p_promo text, p_names jsonb, p_delivery boolean, p_pickup boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Sign in required' using errcode='28000'; end if;
  if not private.goodies_merchant_can_operate(p_business) then raise exception 'Goodies merchant access is restricted' using errcode='42501'; end if;
  if p_category is null or p_category not in ('restaurants','produce','beverages','bakery','meat','groceries','haitian','care','drugstore') then raise exception 'Choose a store category' using errcode='22023'; end if;
  if p_min_order is null or p_min_order < 0 or p_min_order > 100000 or p_delivery_fee is null or p_delivery_fee < 0 or p_delivery_fee > 10000 then raise exception 'Invalid minimum order or delivery fee' using errcode='22023'; end if;
  if p_eta_min is null or p_eta_max is null or p_eta_min < 1 or p_eta_max < p_eta_min or p_eta_max > 1440 then raise exception 'Invalid delivery time range' using errcode='22023'; end if;
  if not (coalesce(p_delivery, false) or coalesce(p_pickup, false)) then raise exception 'Keep delivery or pickup on' using errcode='22023'; end if;
  if p_promo is not null and p_promo ~* '(alcohol|alcool|liquor|rhum|clairin|barbancourt|whisk|vodka|tequila|cognac|brandy|\\mbeer|bi[èe]re|\\mwine|champagne|cocktail)' then raise exception 'Alcohol ads and promotions are prohibited on Wantiss' using errcode='P0001'; end if;
  if p_names is null or jsonb_typeof(p_names) <> 'object' then p_names := '{}'::jsonb; end if;
  update public.businesses b set delivery_modes = array_remove(array[case when coalesce(p_delivery, false) then 'Delivery' end, case when coalesce(p_pickup, false) then 'Pickup' end], null) where b.id = p_business;
  insert into public.goodies_store_schedules (business_id, store_id, category, kind, min_order, delivery_fee, eta_min, eta_max, promo, names, is_live)
  values (p_business, p_business::text, p_category, left(nullif(trim(p_kind), ''), 80), p_min_order, p_delivery_fee, p_eta_min, p_eta_max, left(nullif(trim(p_promo), ''), 120), p_names, false)
  on conflict (business_id) do update set category=excluded.category, kind=excluded.kind, min_order=excluded.min_order, delivery_fee=excluded.delivery_fee, eta_min=excluded.eta_min, eta_max=excluded.eta_max, promo=excluded.promo, names=excluded.names, updated_at=now();
  perform public.goodies_sync_store_from_business(p_business);
end;
$function$;

CREATE OR REPLACE FUNCTION public.goodies_save_store_setup(p_business uuid, p_category text, p_kind text, p_min_order numeric, p_delivery_fee numeric, p_eta_min integer, p_eta_max integer, p_promo text, p_names jsonb, p_delivery boolean, p_pickup boolean, p_delivery_pricing_mode text, p_delivery_base_fee numeric, p_delivery_per_km_fee numeric, p_delivery_min_fee numeric, p_delivery_max_fee numeric, p_delivery_max_distance_km numeric, p_address text, p_city text, p_country text, p_accept_scheduled_orders boolean, p_scheduled_order_start_minutes integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if nullif(trim(coalesce(p_address, '')), '') is null
     or nullif(trim(coalesce(p_city, '')), '') is null
     or nullif(trim(coalesce(p_country, '')), '') is null then
    raise exception 'Enter the full store address, city and country' using errcode = '22023';
  end if;

  if p_accept_scheduled_orders and (p_scheduled_order_start_minutes is null
      or p_scheduled_order_start_minutes < 15
      or p_scheduled_order_start_minutes > 10080) then
    raise exception 'Scheduled orders must be at least 15 minutes and no more than 7 days ahead' using errcode = '22023';
  end if;

  perform public.goodies_save_store_setup(
    p_business, p_category, p_kind, p_min_order, p_delivery_fee,
    p_eta_min, p_eta_max, p_promo, p_names, p_delivery, p_pickup,
    p_delivery_pricing_mode, p_delivery_base_fee, p_delivery_per_km_fee,
    p_delivery_min_fee, p_delivery_max_fee, p_delivery_max_distance_km,
    p_address, p_city, p_country
  );

  update public.goodies_store_schedules
  set accept_scheduled_orders = coalesce(p_accept_scheduled_orders, false),
      scheduled_order_start_minutes = case
        when coalesce(p_accept_scheduled_orders, false) then coalesce(p_scheduled_order_start_minutes, 60)
        else scheduled_order_start_minutes
      end,
      updated_at = now()
  where business_id = p_business;
end;
$function$;

CREATE OR REPLACE FUNCTION public.goodies_save_store_setup(p_business uuid, p_category text, p_kind text, p_min_order numeric, p_delivery_fee numeric, p_eta_min integer, p_eta_max integer, p_promo text, p_names jsonb, p_delivery boolean, p_pickup boolean, p_delivery_pricing_mode text, p_delivery_base_fee numeric, p_delivery_per_km_fee numeric, p_delivery_min_fee numeric, p_delivery_max_fee numeric, p_delivery_max_distance_km numeric, p_address text, p_city text, p_country text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if nullif(trim(coalesce(p_address, '')), '') is null
     or nullif(trim(coalesce(p_city, '')), '') is null
     or nullif(trim(coalesce(p_country, '')), '') is null then
    raise exception 'Enter the full store address, city and country' using errcode = '22023';
  end if;

  perform public.goodies_save_store_setup(
    p_business, p_category, p_kind, p_min_order, p_delivery_fee,
    p_eta_min, p_eta_max, p_promo, p_names, p_delivery, p_pickup,
    p_delivery_pricing_mode, p_delivery_base_fee, p_delivery_per_km_fee,
    p_delivery_min_fee, p_delivery_max_fee, p_delivery_max_distance_km
  );

  update public.businesses
  set address = left(trim(p_address), 300),
      city = left(trim(p_city), 120),
      country = left(trim(p_country), 120)
  where id = p_business;

  update public.goodies_store_schedules
  set store_latitude = case
        when address is distinct from left(trim(p_address), 300)
          or city is distinct from left(trim(p_city), 120)
          or country is distinct from left(trim(p_country), 120)
        then null else store_latitude end,
      store_longitude = case
        when address is distinct from left(trim(p_address), 300)
          or city is distinct from left(trim(p_city), 120)
          or country is distinct from left(trim(p_country), 120)
        then null else store_longitude end,
      address = left(trim(p_address), 300),
      city = left(trim(p_city), 120),
      country = left(trim(p_country), 120),
      updated_at = now()
  where business_id = p_business;
end;
$function$;

CREATE OR REPLACE FUNCTION public.goodies_save_store_setup(p_business uuid, p_category text, p_kind text, p_min_order numeric, p_delivery_fee numeric, p_eta_min integer, p_eta_max integer, p_promo text, p_names jsonb, p_delivery boolean, p_pickup boolean, p_delivery_pricing_mode text, p_delivery_base_fee numeric, p_delivery_per_km_fee numeric, p_delivery_min_fee numeric, p_delivery_max_fee numeric, p_delivery_max_distance_km numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Sign in required' using errcode='28000'; end if;
  if not exists(select 1 from public.business_members bm where bm.business_id=p_business and bm.user_id=v_uid and bm.role in ('owner','admin')) then
    raise exception 'Not allowed' using errcode='42501';
  end if;
  if p_delivery_pricing_mode not in ('fixed','distance') then raise exception 'Invalid delivery pricing mode' using errcode='22023'; end if;
  if p_delivery_base_fee is null or p_delivery_base_fee<0 or p_delivery_base_fee>10000
     or p_delivery_per_km_fee is null or p_delivery_per_km_fee<0 or p_delivery_per_km_fee>10000
     or p_delivery_min_fee is null or p_delivery_min_fee<0 or p_delivery_min_fee>10000
     or (p_delivery_max_fee is not null and (p_delivery_max_fee<0 or p_delivery_max_fee>10000))
     or (p_delivery_max_distance_km is not null and (p_delivery_max_distance_km<=0 or p_delivery_max_distance_km>500)) then
    raise exception 'Invalid distance delivery pricing values' using errcode='22023';
  end if;
  perform public.goodies_save_store_setup(
    p_business,p_category,p_kind,p_min_order,p_delivery_fee,p_eta_min,p_eta_max,p_promo,p_names,p_delivery,p_pickup
  );
  update public.goodies_store_schedules set
    delivery_pricing_mode=p_delivery_pricing_mode,
    delivery_base_fee=p_delivery_base_fee,
    delivery_per_km_fee=p_delivery_per_km_fee,
    delivery_min_fee=p_delivery_min_fee,
    delivery_max_fee=p_delivery_max_fee,
    delivery_max_distance_km=p_delivery_max_distance_km,
    updated_at=now()
  where business_id=p_business;
end $function$;

CREATE OR REPLACE FUNCTION public.goodies_save_store_setup(p_business uuid, p_category text, p_kind text, p_min_order numeric, p_delivery_fee numeric, p_eta_min integer, p_eta_max integer, p_promo text, p_names jsonb, p_delivery boolean, p_pickup boolean, p_delivery_pricing_mode text, p_delivery_base_fee numeric, p_delivery_per_km_fee numeric, p_delivery_min_fee numeric, p_delivery_max_fee numeric, p_delivery_max_distance_km numeric, p_address text, p_city text, p_country text, p_accept_scheduled_orders boolean, p_scheduled_order_start_time text, p_scheduled_order_timezone text, p_store_name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_start_time time; v_timezone text; v_store_name text;
begin
  v_store_name := left(trim(coalesce(p_store_name, '')), 120);
  if v_store_name = '' then raise exception 'Enter a store name' using errcode = '22023'; end if;
  if p_accept_scheduled_orders then
    if coalesce(p_scheduled_order_start_time, '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'Choose a valid earliest order time' using errcode = '22023'; end if;
    v_start_time := p_scheduled_order_start_time::time;
  else
    v_start_time := coalesce(nullif(p_scheduled_order_start_time, '')::time, time '10:00');
  end if;
  v_timezone := coalesce(nullif(trim(p_scheduled_order_timezone), ''), 'UTC');
  if not exists (select 1 from pg_catalog.pg_timezone_names z where z.name = v_timezone) then raise exception 'Invalid store time zone' using errcode = '22023'; end if;
  perform public.goodies_save_store_setup(
    p_business, p_category, p_kind, p_min_order, p_delivery_fee, p_eta_min, p_eta_max,
    p_promo, p_names, p_delivery, p_pickup, p_delivery_pricing_mode, p_delivery_base_fee,
    p_delivery_per_km_fee, p_delivery_min_fee, p_delivery_max_fee, p_delivery_max_distance_km,
    p_address, p_city, p_country
  );
  update public.goodies_store_schedules
  set store_name = v_store_name, accept_scheduled_orders = coalesce(p_accept_scheduled_orders, false),
      scheduled_order_start_time = v_start_time, scheduled_order_timezone = v_timezone,
      scheduled_order_start_minutes = 0, updated_at = now()
  where business_id = p_business;
end;
$function$;

CREATE OR REPLACE FUNCTION public.goodies_save_store_setup(p_business uuid, p_category text, p_kind text, p_min_order numeric, p_delivery_fee numeric, p_eta_min integer, p_eta_max integer, p_promo text, p_names jsonb, p_delivery boolean, p_pickup boolean, p_delivery_pricing_mode text, p_delivery_base_fee numeric, p_delivery_per_km_fee numeric, p_delivery_min_fee numeric, p_delivery_max_fee numeric, p_delivery_max_distance_km numeric, p_address text, p_city text, p_country text, p_accept_scheduled_orders boolean, p_scheduled_order_start_time text, p_scheduled_order_timezone text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_start_time time;
  v_timezone text;
begin
  if p_accept_scheduled_orders then
    if coalesce(p_scheduled_order_start_time, '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
      raise exception 'Choose a valid earliest order time' using errcode = '22023';
    end if;
    v_start_time := p_scheduled_order_start_time::time;
  else
    v_start_time := coalesce(nullif(p_scheduled_order_start_time, '')::time, time '10:00');
  end if;

  v_timezone := coalesce(nullif(trim(p_scheduled_order_timezone), ''), 'UTC');
  if not exists (select 1 from pg_catalog.pg_timezone_names z where z.name = v_timezone) then
    raise exception 'Invalid store time zone' using errcode = '22023';
  end if;

  perform public.goodies_save_store_setup(
    p_business, p_category, p_kind, p_min_order, p_delivery_fee, p_eta_min, p_eta_max,
    p_promo, p_names, p_delivery, p_pickup, p_delivery_pricing_mode, p_delivery_base_fee,
    p_delivery_per_km_fee, p_delivery_min_fee, p_delivery_max_fee, p_delivery_max_distance_km,
    p_address, p_city, p_country
  );

  update public.goodies_store_schedules
  set accept_scheduled_orders = coalesce(p_accept_scheduled_orders, false),
      scheduled_order_start_time = v_start_time,
      scheduled_order_timezone = v_timezone,
      scheduled_order_start_minutes = 0,
      updated_at = now()
  where business_id = p_business;
end;
$function$;

CREATE OR REPLACE FUNCTION public.goodies_save_store_thumbnail(p_business uuid, p_thumbnail_url text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode = '28000'; end if;
  if not exists (select 1 from public.business_members bm where bm.business_id = p_business and bm.user_id = auth.uid() and bm.role in ('owner','admin')) then raise exception 'Not allowed' using errcode = '42501'; end if;
  if p_thumbnail_url is not null and (length(p_thumbnail_url) > 2048 or p_thumbnail_url !~ '^https://') then raise exception 'Invalid store thumbnail URL'; end if;
  update public.goodies_store_schedules set thumbnail_url = p_thumbnail_url, updated_at = now() where business_id = p_business;
  if not found then raise exception 'Save your store setup before adding a thumbnail'; end if;
  return true;
end;
$function$;

CREATE OR REPLACE FUNCTION public.goodies_self_delivery_mark_delivered(p_order_id uuid, p_proof_url text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_uid uuid := auth.uid(); v_o public.goodies_orders%rowtype;
begin
  if v_uid is null then raise exception 'Sign in required' using errcode='28000'; end if;
  select * into v_o from public.goodies_orders where id = p_order_id for update;
  if not found or not v_o.self_delivery then raise exception 'Order not found' using errcode='P0002'; end if;
  if not exists(select 1 from public.business_members bm where bm.business_id = v_o.business_id and bm.user_id = v_uid and bm.role in ('owner','admin')) then
    raise exception 'Not allowed' using errcode='42501'; end if;
  if v_o.status <> 'picked_up' or v_o.vendor_delivered_at is not null then raise exception 'This order cannot be marked delivered now' using errcode='P0001'; end if;
  if nullif(trim(coalesce(p_proof_url,'')), '') is null
    or position('/storage/v1/object/public/listing-photos/' || v_o.business_id::text || '/delivery-proofs/' in p_proof_url) = 0
    or not (right(lower(split_part(p_proof_url, '?', 1)), 4) in ('.jpg','.png')
      or right(lower(split_part(p_proof_url, '?', 1)), 5) in ('.jpeg','.webp')) then
    raise exception 'Upload a valid delivery photo for this store first' using errcode='P0001';
  end if;
  update public.goodies_orders set delivery_proof_url = trim(p_proof_url), vendor_delivered_at = now(),
    receipt_deadline_at = now() + interval '24 hours', updated_at = now() where id = p_order_id;
  perform public.goodies_order_notify(v_o.customer_id, 'Did you receive your order?',
    'The store says order ' || v_o.order_code || ' was delivered. Please confirm, or report a problem within 24 hours.', v_o.id, v_o.order_code, 'picked_up', null);
end $function$;

CREATE OR REPLACE FUNCTION public.goodies_send_store_message(p_conversation_id uuid, p_body text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := auth.uid();
  v_conversation public.conversations%rowtype;
  v_body text := nullif(pg_catalog.btrim(coalesce(p_body, '')), '');
  v_message_id uuid;
begin
  if v_user is null then
    raise exception 'Sign in to send a message.' using errcode = '28000';
  end if;
  if p_conversation_id is null then
    raise exception 'A conversation is required.' using errcode = '22023';
  end if;
  if v_body is null or pg_catalog.char_length(v_body) > 4000 then
    raise exception 'Messages must contain between 1 and 4000 characters.' using errcode = '22023';
  end if;

  select c.* into v_conversation
  from public.conversations c
  where c.id = p_conversation_id
  for update;

  if not found then
    raise exception 'Conversation not found.' using errcode = 'P0002';
  end if;
  if v_conversation.feature is distinct from 'goodies'
     or v_conversation.customer_id is distinct from v_user then
    raise exception 'You cannot send messages in this conversation.' using errcode = '42501';
  end if;
  if v_conversation.status = 'closed' then
    raise exception 'This conversation is closed.' using errcode = '55000';
  end if;

  insert into public.messages (conversation_id, sender_id, body)
  values (p_conversation_id, v_user, v_body)
  returning id into v_message_id;

  return v_message_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.goodies_set_courier_availability(p_is_available boolean, p_accepts_cash_on_delivery boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'Sign in required' using errcode='28000'; end if;
 if not exists(select 1 from public.goodies_courier_roster r where r.courier_id=v_uid and r.is_approved) then
  raise exception 'Your account is not approved for Goodies courier deliveries yet.' using errcode='42501';
 end if;
 if exists(select 1 from public.goodies_delivery_assignments a where a.courier_id=v_uid and a.status in ('accepted','picked_up')) then
  if not coalesce(p_is_available,false) then raise exception 'Complete your active delivery before going offline' using errcode='P0001'; end if;
  if exists(select 1 from public.goodies_courier_presence cp where cp.courier_id=v_uid and cp.accepts_cash_on_delivery is distinct from coalesce(p_accepts_cash_on_delivery,false)) then
   raise exception 'You cannot change COD consent during an active delivery' using errcode='P0001';
  end if;
 end if;
 if not coalesce(p_is_available,false) and exists(select 1 from public.goodies_delivery_assignments a where a.courier_id=v_uid and a.status='offered') then
  raise exception 'Respond to your pending delivery offer before going offline' using errcode='P0001';
 end if;
 insert into public.goodies_courier_presence(courier_id,is_available,accepts_cash_on_delivery,updated_at)
 values(v_uid,coalesce(p_is_available,false),coalesce(p_accepts_cash_on_delivery,false),now())
 on conflict(courier_id) do update set is_available=excluded.is_available,accepts_cash_on_delivery=excluded.accepts_cash_on_delivery,updated_at=now();
end $function$;

CREATE OR REPLACE FUNCTION public.goodies_set_delivery_offer_expiry()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if new.status = 'offered' then
    if tg_op = 'INSERT' or old.status is distinct from 'offered'
       or new.offered_at is distinct from old.offered_at then
      new.expires_at := coalesce(new.offered_at, now()) + interval '2 minutes';
    elsif new.expires_at is null then
      new.expires_at := coalesce(new.offered_at, now()) + interval '2 minutes';
    end if;
  elsif new.status is distinct from 'offered' then
    new.expires_at := null;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.goodies_set_order_commission_snapshot()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
begin
  if tg_op = 'INSERT' then
    -- Product commission: 10% of discounted product subtotal.
    new.platform_commission_rate := 0.10;
    new.commissionable_subtotal := round(
      greatest(coalesce(new.subtotal, 0) - coalesce(new.discount, 0), 0),
      2
    );
    new.platform_commission_amount := round(
      new.commissionable_subtotal * new.platform_commission_rate,
      2
    );
    new.vendor_net_amount := round(
      new.commissionable_subtotal - new.platform_commission_amount,
      2
    );

    -- Delivery commission: 7% of delivery fee only.
    new.delivery_commission_rate := 0.07;
    new.delivery_commission_amount := round(
      greatest(coalesce(new.delivery_fee, 0), 0) * new.delivery_commission_rate,
      2
    );
    new.courier_net_delivery_amount := round(
      greatest(coalesce(new.delivery_fee, 0), 0) - new.delivery_commission_amount,
      2
    );
  else
    -- Financial amounts and commission snapshots are immutable after checkout.
    -- Status, fulfilment, courier assignment and payment-state updates remain allowed.
    if new.subtotal is distinct from old.subtotal
       or new.discount is distinct from old.discount
       or new.delivery_fee is distinct from old.delivery_fee
       or new.service_fee is distinct from old.service_fee
       or new.tip is distinct from old.tip
       or new.total is distinct from old.total
       or new.commissionable_subtotal is distinct from old.commissionable_subtotal
       or new.platform_commission_rate is distinct from old.platform_commission_rate
       or new.platform_commission_amount is distinct from old.platform_commission_amount
       or new.vendor_net_amount is distinct from old.vendor_net_amount
       or new.delivery_commission_rate is distinct from old.delivery_commission_rate
       or new.delivery_commission_amount is distinct from old.delivery_commission_amount
       or new.courier_net_delivery_amount is distinct from old.courier_net_delivery_amount then
      raise exception 'Goodies order financial amounts and commission are immutable after checkout'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.goodies_set_store_cash_policy(p_store_id text, p_enabled boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_uid uuid:=auth.uid(); v_business uuid;
begin
  if v_uid is null then raise exception 'Sign in required' using errcode='28000'; end if;
  select business_id into v_business from public.goodies_store_schedules where store_id=p_store_id for update;
  if not found then raise exception 'Store not found' using errcode='P0002'; end if;
  if not exists(select 1 from public.business_members where business_id=v_business and user_id=v_uid and role in ('owner','admin')) then
    raise exception 'Only the store owner or administrator can change cash-on-delivery availability' using errcode='42501';
  end if;
  update public.goodies_store_schedules set accept_cash_on_delivery=coalesce(p_enabled,false),updated_at=now() where store_id=p_store_id;
end $function$;

CREATE OR REPLACE FUNCTION public.goodies_set_store_live(p_business uuid, p_live boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_uid uuid := auth.uid(); b public.businesses%rowtype; s public.goodies_store_schedules%rowtype;
begin
  if v_uid is null then raise exception 'Sign in required' using errcode='28000'; end if;
  if not private.goodies_merchant_can_operate(p_business) then raise exception 'Goodies merchant access is restricted' using errcode='42501'; end if;
  select * into s from public.goodies_store_schedules where business_id=p_business for update;
  if not found then raise exception 'Save your store setup first' using errcode='P0001'; end if;
  if not coalesce(p_live,false) then update public.goodies_store_schedules set is_live=false,updated_at=now() where business_id=p_business; return false; end if;
  select * into b from public.businesses where id=p_business;
  if not found then raise exception 'Business not found' using errcode='P0002'; end if;
  if s.category is null then raise exception 'Choose a store category first' using errcode='P0001'; end if;
  if b.hours is null or jsonb_typeof(b.hours) <> 'object' or b.hours='{}'::jsonb then raise exception 'Set your opening hours in Business information first' using errcode='P0001'; end if;
  if not exists (select 1 from public.goodies_products p where p.business_id=p_business and p.is_available and p.stock>0 and p.restriction<>'alcohol' and not (concat_ws(' ',p.name,p.description) ~* '(alcohol|alcool|liquor|rhum|clairin|barbancourt|whisk|vodka|tequila|cognac|brandy|\\mbeer|bi[èe]re|\\mwine|champagne|cocktail)')) then raise exception 'Add at least one available product with stock first' using errcode='P0001'; end if;
  perform public.goodies_sync_store_from_business(p_business);
  update public.goodies_store_schedules set is_live=true,updated_at=now() where business_id=p_business;
  return true;
end;
$function$;

CREATE OR REPLACE FUNCTION public.goodies_start_store_conversation(p_store_id text, p_customer_name text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_customer uuid := auth.uid();
  v_business_id uuid;
  v_store_name text;
  v_conversation_id uuid;
begin
  if v_customer is null then
    raise exception 'Sign in to message this store.' using errcode = '28000';
  end if;
  if nullif(pg_catalog.btrim(coalesce(p_store_id, '')), '') is null then
    raise exception 'A valid store is required.' using errcode = '22023';
  end if;

  select gs.business_id,
         coalesce(
           nullif(pg_catalog.btrim(gs.store_name), ''),
           nullif(pg_catalog.btrim(gs.business_name), ''),
           'Goodies store'
         )
    into v_business_id, v_store_name
  from public.goodies_store_schedules gs
  where gs.store_id = p_store_id
    and gs.is_live = true;

  if v_business_id is null then
    raise exception 'This store is not currently available for messaging.' using errcode = 'P0002';
  end if;

  if exists (
    select 1
    from public.business_members bm
    where bm.business_id = v_business_id
      and bm.user_id = v_customer
  ) then
    raise exception 'You manage this store, so you cannot message it as a customer.' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_store_id || ':' || v_customer::text, 0)
  );

  select c.id
    into v_conversation_id
  from public.conversations c
  where c.business_id = v_business_id
    and c.feature = 'goodies'
    and c.ref_id = p_store_id
    and c.customer_id = v_customer
    and c.status <> 'closed'
  order by c.updated_at desc
  limit 1;

  if v_conversation_id is not null then
    return v_conversation_id;
  end if;

  insert into public.conversations (
    business_id, participant_ids, customer_id, customer_name, feature,
    ref_id, ref_label, title, last_body, unread_business, unread_customer, status
  ) values (
    v_business_id, array[v_customer]::uuid[], v_customer,
    coalesce(nullif(pg_catalog.btrim(p_customer_name), ''), 'Customer'),
    'goodies', p_store_id, v_store_name, v_store_name, '', 0, 0, 'pending_vendor'
  )
  returning id into v_conversation_id;

  return v_conversation_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.goodies_submit_ingredient_request(p_business uuid, p_name text, p_builder text, p_role text DEFAULT NULL::text, p_note text DEFAULT NULL::text, p_image_path text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid := auth.uid(); v_id uuid; v_name text := btrim(coalesce(p_name,'')); v_builder text := lower(btrim(coalesce(p_builder,'')));
begin
  if v_uid is null then raise exception 'Sign in required' using errcode = '28000'; end if;
  if not exists (select 1 from public.business_members bm where bm.business_id = p_business and bm.user_id = v_uid and bm.role in ('owner','admin')) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if char_length(v_name) < 2 or char_length(v_name) > 80 then raise exception 'Enter an ingredient name (2 to 80 characters)' using errcode = 'P0001'; end if;
  if v_builder !~ '^[a-z0-9_-]{1,40}$' then raise exception 'Choose a builder' using errcode = 'P0001'; end if;
  if p_image_path is not null and p_image_path not like p_business::text || '/%' then raise exception 'Invalid photo' using errcode = 'P0001'; end if;
  if (select count(*) from public.goodies_ingredient_requests r where r.business_id = p_business and r.status in ('submitted','needs_info')) >= 20 then
    raise exception 'You have too many open requests. Wait for a review first.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.goodies_ingredient_requests r where r.business_id = p_business and r.status in ('submitted','needs_info') and lower(r.name) = lower(v_name) and r.builder = v_builder) then
    raise exception 'You already requested this ingredient' using errcode = 'P0001';
  end if;
  insert into public.goodies_ingredient_requests (business_id, requested_by, name, builder, role, note, image_path)
  values (p_business, v_uid, v_name, v_builder, nullif(left(btrim(coalesce(p_role,'')),80),''), nullif(left(btrim(coalesce(p_note,'')),500),''), nullif(btrim(coalesce(p_image_path,'')),''))
  returning id into v_id;
  return v_id;
end $function$;

CREATE OR REPLACE FUNCTION public.goodies_sync_store_from_business(p_business uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  update public.goodies_store_schedules s set
    hours = b.hours,
    accept_scheduled_orders = b.accept_scheduled_orders,
    scheduled_order_start_minutes = b.scheduled_order_start_minutes,
    business_name = b.name,
    description = b.description,
    phone = b.phone,
    email = b.email,
    website = b.website,
    address = b.address,
    city = b.city,
    country = b.country,
    delivery_modes = coalesce(b.delivery_modes, '{}'::text[]),
    logo_url = b.logo_url,
    updated_at = now()
  from public.businesses b
  where b.id = s.business_id and s.business_id = p_business;
$function$;

CREATE OR REPLACE FUNCTION public.goodies_tip_is_allowed(p_tip numeric, p_choices text)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_choice text;
  v_choices text[] := string_to_array(coalesce(nullif(trim(p_choices), ''), '0'), ',');
BEGIN
  IF p_tip IS NULL OR p_tip < 0 OR p_tip > 1000 THEN
    RETURN false;
  END IF;
  FOREACH v_choice IN ARRAY v_choices LOOP
    v_choice := trim(v_choice);
    IF v_choice ~ '^(0|[1-9][0-9]{0,3})([.][0-9]{1,2})?$' THEN
      IF v_choice::numeric <= 1000 AND v_choice::numeric = p_tip THEN
        RETURN true;
      END IF;
    END IF;
  END LOOP;
  RETURN false;
END;
$function$;

CREATE OR REPLACE FUNCTION public.goodies_update_conversation_summary()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  c public.conversations%rowtype;
  v_name text;
  m record;
begin
  select * into c from public.conversations where id = new.conversation_id;
  if c.id is null then return new; end if;

  if c.customer_id = new.sender_id then
    update public.conversations
    set last_body = new.body,
        updated_at = pg_catalog.now(),
        unread_business = unread_business + 1,
        status = case when c.feature = 'goodies' then 'pending_vendor' else status end
    where id = c.id;

    if c.feature = 'goodies' then
      v_name := coalesce(nullif(c.customer_name, ''), 'A customer');
      for m in
        select distinct bm.user_id from public.business_members bm
        where bm.business_id = c.business_id
      loop
        begin
          insert into public.notifications (
            user_id, title, body, feature_name, notification_type, destination, metadata
          ) values (
            m.user_id, 'New message from ' || v_name, pg_catalog.left(new.body, 140),
            'goodies', 'store_message', 'messages',
            pg_catalog.jsonb_build_object('conversation_id', c.id, 'business_id', c.business_id)
          );
        exception when others then
          raise warning 'Goodies store-message notification failed for conversation %: %', c.id, sqlerrm;
        end;
      end loop;
    end if;
  else
    update public.conversations
    set last_body = new.body,
        updated_at = pg_catalog.now(),
        unread_customer = unread_customer + 1,
        status = case when status = 'pending_vendor' then 'active' else status end,
        vendor_replied_at = coalesce(vendor_replied_at, pg_catalog.now()),
        participant_ids = case
          when c.feature = 'goodies' then participant_ids
          when new.sender_id = any(participant_ids) then participant_ids
          else pg_catalog.array_append(participant_ids, new.sender_id)
        end
    where id = c.id;

    if c.feature = 'goodies' and c.customer_id is not null then
      begin
        insert into public.notifications (
          user_id, title, body, feature_name, notification_type, destination, metadata
        ) values (
          c.customer_id, coalesce(c.ref_label, 'Store') || ' replied',
          pg_catalog.left(new.body, 140), 'goodies', 'store_message', 'storechat',
          pg_catalog.jsonb_build_object('conversation_id', c.id, 'store_id', c.ref_id)
        );
      exception when others then
        raise warning 'Goodies customer reply notification failed for conversation %: %', c.id, sqlerrm;
      end;
    end if;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.goodies_validate_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  c public.conversations%rowtype;
  v_len integer;
  v_last_vendor_reply timestamptz;
  v_customer_messages bigint;
begin
  select * into c
  from public.conversations
  where id = new.conversation_id
  for update;

  if c.id is null or c.feature is distinct from 'goodies' then
    return new;
  end if;

  v_len := pg_catalog.char_length(pg_catalog.btrim(coalesce(new.body, '')));
  if v_len < 1 or v_len > 2000 then
    raise exception 'Messages must be between 1 and 2000 characters.';
  end if;
  if c.status = 'closed' then
    raise exception 'This conversation is closed.';
  end if;

  if (
    select count(*)
    from public.messages m
    where m.sender_id = new.sender_id
      and m.created_at > pg_catalog.now() - interval '1 minute'
  ) >= 10 then
    raise exception 'You are sending messages too quickly. Please wait a moment.';
  end if;

  if c.status = 'pending_vendor' and c.customer_id = new.sender_id then
    select pg_catalog.max(m.created_at)
      into v_last_vendor_reply
    from public.messages m
    where m.conversation_id = c.id
      and m.sender_id <> c.customer_id;

    select pg_catalog.count(*)
      into v_customer_messages
    from public.messages m
    where m.conversation_id = c.id
      and m.sender_id = c.customer_id
      and (v_last_vendor_reply is null or m.created_at > v_last_vendor_reply);

    if v_customer_messages >= 3 then
      raise exception 'The store has not replied yet. You can send more once they respond.';
    end if;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.goodies_vendor_reply(p_conversation_id uuid, p_body text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := auth.uid();
  v_conversation public.conversations%rowtype;
  v_body text := nullif(pg_catalog.btrim(coalesce(p_body, '')), '');
  v_message_id uuid;
begin
  if v_user is null then
    raise exception 'Sign in to reply.' using errcode = '28000';
  end if;
  if p_conversation_id is null then
    raise exception 'A conversation is required.' using errcode = '22023';
  end if;
  if v_body is null or pg_catalog.char_length(v_body) > 4000 then
    raise exception 'Messages must contain between 1 and 4000 characters.' using errcode = '22023';
  end if;

  select c.* into v_conversation
  from public.conversations c
  where c.id = p_conversation_id
  for update;

  if not found then
    raise exception 'Conversation not found.' using errcode = 'P0002';
  end if;
  if v_conversation.feature is distinct from 'goodies'
     or v_conversation.customer_id is null
     or not exists (
       select 1
       from public.business_members bm
       where bm.business_id = v_conversation.business_id
         and bm.user_id = v_user
     ) then
    raise exception 'You are not authorized to reply to this store conversation.' using errcode = '42501';
  end if;
  if v_conversation.status = 'closed' then
    raise exception 'This conversation is closed.' using errcode = '55000';
  end if;

  insert into public.messages (conversation_id, sender_id, body)
  values (p_conversation_id, v_user, v_body)
  returning id into v_message_id;

  return v_message_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.monitor_goodies_card_auth_expiry_worker()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_response record;
  v_failed integer := 0;
  v_issue text;
  v_alert_key text;
  v_stale_count integer := 0;
begin
  select r.status_code,r.timed_out,r.error_msg,r.content,r.created
    into v_response
    from net._http_response r
   where r.content like '%"expired"%'
   order by r.created desc
   limit 1;

  if not found or v_response.created < now()-interval '10 minutes' then
    v_issue := 'No successful abandoned 3DS expiry worker heartbeat was recorded in the last 10 minutes.';
    v_alert_key := 'goodies_3ds_expiry_worker_missing_heartbeat';
  else
    begin
      v_failed := coalesce((v_response.content::jsonb->>'failed')::integer,0);
    exception when others then
      v_failed := 1;
    end;
    if v_response.timed_out or v_response.error_msg is not null
       or v_response.status_code < 200 or v_response.status_code >= 300 or v_failed > 0 then
      v_issue := 'The abandoned 3DS expiry worker returned an error. HTTP status: '
        ||coalesce(v_response.status_code::text,'unknown')
        ||'; failed orders: '||v_failed
        ||'; details: '||left(coalesce(v_response.error_msg,v_response.content,'No response body'),500);
      v_alert_key := 'goodies_3ds_expiry_worker_failure';
    end if;
  end if;

  select count(*) into v_stale_count
    from public.goodies_orders o
   where o.payment_method='card'
     and o.payment_status='requires_action'
     and o.payment_provider_ref is not null
     and o.created_at < now()-interval '60 minutes'
     and o.status in ('scheduled','placed','cancelled','declined','expired');

  if v_issue is null and v_stale_count > 0 then
    v_issue := v_stale_count||' Goodies card authentication attempts remain unresolved more than 60 minutes after checkout.';
    v_alert_key := 'goodies_3ds_expiry_backlog';
  end if;

  if v_issue is not null then
    insert into public.notifications(user_id,vendor_id,title,body,notification_type,feature_name,destination,metadata)
    select s.user_id,null,'Goodies card verification operations alert',v_issue,
      'goodies_refund_attention','Goodies','goodies/refunds',
      jsonb_build_object('alert_key',v_alert_key,'observed_at',now())
    from public.wantiss_admin_staff s
    join auth.users u on u.id=s.user_id
    where s.status='active' and s.role='super_admin'
      and u.email_confirmed_at is not null
      and not exists (
        select 1 from public.notifications n
        where n.user_id=s.user_id
          and n.metadata->>'alert_key'=v_alert_key
          and n.created_at > now()-interval '1 hour'
      );
  end if;

  return v_issue is null;
end;
$function$;

CREATE OR REPLACE FUNCTION public.monitor_goodies_card_refund_worker()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_response record;
  v_failed integer := 0;
  v_issue text;
  v_alert_key text;
begin
  select r.status_code,r.timed_out,r.error_msg,r.content,r.created
    into v_response
    from net._http_response r
   where r.content like '%"scanned"%'
   order by r.created desc
   limit 1;

  if not found or v_response.created < now()-interval '10 minutes' then
    v_issue := 'No successful refund worker heartbeat was recorded in the last 10 minutes.';
    v_alert_key := 'refund_worker_missing_heartbeat';
  else
    begin
      v_failed := coalesce((v_response.content::jsonb->>'failed')::integer,0);
    exception when others then
      v_failed := 1;
    end;
    if v_response.timed_out or v_response.error_msg is not null or v_response.status_code < 200
       or v_response.status_code >= 300 or v_failed > 0 then
      v_issue := 'Refund worker returned an error. HTTP status: '||coalesce(v_response.status_code::text,'unknown')
        ||'; failed queue items: '||v_failed||'; details: '||left(coalesce(v_response.error_msg,v_response.content,'No response body'),500);
      v_alert_key := 'refund_worker_execution_failure';
    end if;
  end if;

  if v_issue is null and exists (
    select 1 from public.goodies_card_refund_queue q
    where q.status='pending' and q.created_at < now()-interval '24 hours'
  ) then
    v_issue := 'One or more Goodies card refunds have remained pending for more than 24 hours.';
    v_alert_key := 'refund_worker_old_pending';
  end if;

  if v_issue is not null then
    insert into public.notifications(user_id,vendor_id,title,body,notification_type,feature_name,destination,metadata)
    select s.user_id,null,'Goodies refund operations alert',v_issue,
      'goodies_refund_attention','Goodies','goodies/refunds',
      jsonb_build_object('alert_key',v_alert_key,'observed_at',now())
    from public.wantiss_admin_staff s
    join auth.users u on u.id=s.user_id
    where s.status='active' and s.role='super_admin'
      and u.email_confirmed_at is not null
      and not exists (
        select 1 from public.notifications n
        where n.user_id=s.user_id
          and n.metadata->>'alert_key'=v_alert_key
          and n.created_at > now()-interval '1 hour'
      );
  end if;

  return v_issue is null;
end;
$function$;

CREATE OR REPLACE FUNCTION public.pause_goodies_card_refund_for_dispute(p_queue_id uuid, p_lease_token uuid, p_error text DEFAULT 'Paused because the Stripe dispute is open'::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_order_id uuid;
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'Service role required' using errcode='42501';
  end if;

  select order_id into v_order_id
    from public.goodies_card_refund_queue
   where id=p_queue_id
     and lease_token=p_lease_token
     and status='processing'
   for update;

  if v_order_id is null then
    return false;
  end if;

  update public.goodies_orders
     set payment_dispute_status='open',
         payment_status='disputed',
         updated_at=now()
   where id=v_order_id;

  update public.goodies_card_refund_queue
     set status='cancelled',
         lease_token=null,
         last_error=left(coalesce(nullif(trim(p_error),''),'Paused because the Stripe dispute is open'),1000),
         updated_at=now()
   where id=p_queue_id
     and lease_token=p_lease_token;

  return true;
end;
$function$;

CREATE OR REPLACE FUNCTION public.place_goodies_card_order_once(p_idempotency_key text, p_store_id text, p_order_type text, p_scheduled_for timestamp with time zone, p_address jsonb, p_contact_phone text, p_items jsonb, p_subtotal numeric, p_delivery_fee numeric, p_service_fee numeric, p_discount numeric, p_tip numeric, p_total numeric, p_notes text, p_promo_code text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, order_code text, status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_uid uuid:=auth.uid(); v_attempt_id uuid; v_existing_order uuid; v_existing_fingerprint text; v_fingerprint text; v_created record;
begin
 if v_uid is null then raise exception 'Sign in to place an order' using errcode='28000'; end if;
 if p_idempotency_key is null or length(p_idempotency_key)<8 or length(p_idempotency_key)>200 then raise exception 'A valid checkout idempotency key is required' using errcode='22023'; end if;
 v_fingerprint:=md5(jsonb_build_object('payment_method','card','store_id',p_store_id,'order_type',p_order_type,'scheduled_for',p_scheduled_for,'address',case when p_address is null then null else p_address-'delivery_quote_id' end,'contact_phone',p_contact_phone,'items',p_items,'subtotal',p_subtotal,'delivery_fee',p_delivery_fee,'service_fee',p_service_fee,'discount',p_discount,'tip',p_tip,'total',p_total,'notes',p_notes,'promo_code',p_promo_code)::text);
 perform pg_advisory_xact_lock(hashtextextended(v_uid::text||':'||v_fingerprint,0));
 select a.order_id,a.request_fingerprint into v_existing_order,v_existing_fingerprint from public.goodies_card_checkout_attempts a join public.goodies_orders o on o.id=a.order_id where a.user_id=v_uid and a.request_fingerprint=v_fingerprint and o.customer_id=v_uid and o.status not in ('cancelled','declined','expired','completed') and o.payment_status in ('pending','requires_action') order by a.created_at desc limit 1 for update of a;
 if v_existing_order is not null then return query select o.id,o.order_code,o.status from public.goodies_orders o where o.id=v_existing_order and o.customer_id=v_uid; return; end if;
 insert into public.goodies_card_checkout_attempts as attempt(user_id,idempotency_key,request_fingerprint) values(v_uid,p_idempotency_key,v_fingerprint) on conflict(user_id,idempotency_key) do nothing returning attempt.id into v_attempt_id;
 if v_attempt_id is null then
  select a.order_id,a.request_fingerprint into v_existing_order,v_existing_fingerprint from public.goodies_card_checkout_attempts a where a.user_id=v_uid and a.idempotency_key=p_idempotency_key for update;
  if v_existing_fingerprint is not null and v_existing_fingerprint is distinct from v_fingerprint then raise exception 'This checkout key was already used for different order details. Start a new checkout.' using errcode='22023'; end if;
  if v_existing_order is null then raise exception 'This card checkout is already being processed. Please retry shortly' using errcode='55P03'; end if;
  return query select o.id,o.order_code,o.status from public.goodies_orders o where o.id=v_existing_order and o.customer_id=v_uid; return;
 end if;
 perform set_config('app.goodies_payment_context','card',true);
 select * into v_created from public.place_goodies_order(p_store_id,p_order_type,p_scheduled_for,p_address,p_contact_phone,p_items,p_subtotal,p_delivery_fee,p_service_fee,p_discount,p_tip,p_total,p_notes,p_promo_code) limit 1;
 if v_created.id is null then raise exception 'The order could not be created' using errcode='P0001'; end if;
 update public.goodies_card_checkout_attempts set order_id=v_created.id where id=v_attempt_id;
 return query select v_created.id,v_created.order_code,v_created.status;
end; $function$;

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

CREATE OR REPLACE FUNCTION public.place_goodies_order_with_payment_once(p_idempotency_key text, p_payment_method text, p_store_id text, p_order_type text, p_scheduled_for timestamp with time zone, p_address jsonb, p_contact_phone text, p_items jsonb, p_subtotal numeric, p_delivery_fee numeric, p_service_fee numeric, p_discount numeric, p_tip numeric, p_total numeric, p_notes text, p_promo_code text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, order_code text, status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
  if v_uid is null then raise exception 'Sign in to place an order' using errcode='28000'; end if;
  if p_payment_method not in ('wallet','cash') then
    raise exception 'Unsupported payment method for this checkout' using errcode='22023';
  end if;
  if p_idempotency_key is null or length(p_idempotency_key) < 8 or length(p_idempotency_key) > 200 then
    raise exception 'A valid checkout idempotency key is required' using errcode='22023';
  end if;

  v_fingerprint := md5(jsonb_build_object(
    'payment_method',p_payment_method,'store_id',p_store_id,'order_type',p_order_type,
    'scheduled_for',p_scheduled_for,
    'address',case when p_address is null then null else p_address - 'delivery_quote_id' end,
    'contact_phone',p_contact_phone,'items',p_items,'subtotal',p_subtotal,'delivery_fee',p_delivery_fee,
    'service_fee',p_service_fee,'discount',p_discount,'tip',p_tip,'total',p_total,'notes',p_notes,
    'promo_code',p_promo_code
  )::text);

  insert into public.goodies_checkout_attempts as attempt(user_id,idempotency_key,payment_method,request_fingerprint)
  values(v_uid,p_idempotency_key,p_payment_method,v_fingerprint)
  on conflict(user_id,idempotency_key) do nothing
  returning attempt.id into v_attempt_id;

  if v_attempt_id is null then
    select a.order_id,a.request_fingerprint into v_existing_order,v_existing_fingerprint
      from public.goodies_checkout_attempts a
     where a.user_id=v_uid and a.idempotency_key=p_idempotency_key for update;
    if v_existing_fingerprint is distinct from v_fingerprint then
      raise exception 'This checkout key was already used for different order details. Start a new checkout.' using errcode='22023';
    end if;
    if v_existing_order is null then
      raise exception 'This checkout is still being processed. Please retry shortly.' using errcode='55P03';
    end if;
    return query select o.id,o.order_code,o.status from public.goodies_orders o
     where o.id=v_existing_order and o.customer_id=v_uid;
    return;
  end if;

  if p_payment_method='wallet' then
    if p_total is null or p_total<=0 then raise exception 'Invalid order total' using errcode='22023'; end if;
    select w.id,w.balance into v_wallet_id,v_balance from public.wallets w where w.user_id=v_uid for update;
    if not found then
      raise exception 'No Wantiss wallet found. Create your wallet to pay with it.' using errcode='P0002';
    end if;
    if v_balance<p_total then
      raise exception 'Insufficient Wantiss wallet balance. Add funds or choose another payment method.' using errcode='P0001';
    end if;
  end if;

  perform set_config('app.goodies_payment_context',p_payment_method,true);
  select o.* into v_created from public.place_goodies_order(
    p_store_id,p_order_type,p_scheduled_for,p_address,p_contact_phone,p_items,
    p_subtotal,p_delivery_fee,p_service_fee,p_discount,p_tip,p_total,p_notes,p_promo_code
  ) o limit 1;
  if v_created.id is null then raise exception 'The order could not be created' using errcode='P0001'; end if;

  if p_payment_method='wallet' then
    update public.wallets as w set balance=w.balance-p_total,updated_at=now() where w.id=v_wallet_id;
    insert into public.wallet_transactions(
      user_id,amount,description,status,wallet_amount,wallet_currency,
      feature_name,activity_type,direction,reference_id,metadata
    ) values(
      v_uid,p_total,'Goodies order '||v_created.order_code,'completed',p_total,'USD',
      'Goodies','goodies_order_payment','debit',v_created.id::text,
      jsonb_build_object('order_id',v_created.id,'order_code',v_created.order_code)
    );
    update public.goodies_orders as go set payment_method='wallet',payment_status='paid',updated_at=now()
     where go.id=v_created.id and go.customer_id=v_uid;
  end if;

  update public.goodies_checkout_attempts as ca set order_id=v_created.id where ca.id=v_attempt_id;
  return query select v_created.id,v_created.order_code,v_created.status;
end;
$function$;

CREATE OR REPLACE FUNCTION public.place_goodies_order_with_wallet(p_store_id text, p_order_type text, p_scheduled_for timestamp with time zone, p_address jsonb, p_contact_phone text, p_items jsonb, p_subtotal numeric, p_delivery_fee numeric, p_service_fee numeric, p_discount numeric, p_tip numeric, p_total numeric, p_notes text, p_promo_code text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, order_code text, status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_uid uuid:=auth.uid(); v_wallet_id uuid; v_balance numeric; v_id uuid; v_code text; v_status text;
begin
  if v_uid is null then raise exception 'Sign in to place an order' using errcode='28000'; end if;
  if p_total is null or p_total<=0 then raise exception 'Invalid order total' using errcode='22023'; end if;
  select w.id,w.balance into v_wallet_id,v_balance from public.wallets w where w.user_id=v_uid for update;
  if not found then raise exception 'No Wantiss wallet found. Create your wallet to pay with it.' using errcode='P0002'; end if;
  if v_balance<p_total then raise exception 'Insufficient Wantiss wallet balance. Add funds or choose another payment method.' using errcode='P0001'; end if;
  perform set_config('app.goodies_payment_context','wallet',true);
  select o.id,o.order_code,o.status into v_id,v_code,v_status from public.place_goodies_order(
    p_store_id,p_order_type,p_scheduled_for,p_address,p_contact_phone,p_items,p_subtotal,p_delivery_fee,p_service_fee,p_discount,p_tip,p_total,p_notes,p_promo_code
  ) o;
  update public.wallets set balance=balance-p_total,updated_at=now() where id=v_wallet_id;
  insert into public.wallet_transactions(user_id,amount,description,status,wallet_amount,wallet_currency,feature_name,activity_type,direction,reference_id,metadata)
  values(v_uid,p_total,'Goodies order '||v_code,'completed',p_total,'USD','Goodies','goodies_order_payment','debit',v_id::text,jsonb_build_object('order_id',v_id,'order_code',v_code));
  update public.goodies_orders set payment_method='wallet',payment_status='paid',updated_at=now() where id=v_id;
  return query select v_id,v_code,v_status;
end $function$;

CREATE OR REPLACE FUNCTION public.process_goodies_card_payment_event(p_order_id uuid, p_payment_intent_id text, p_event_state text, p_amount_cents bigint, p_currency text, p_refunded_amount_cents bigint, p_event_created bigint)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_order public.goodies_orders%rowtype;
  v_line record;
  v_refunded numeric(12,2);
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'Service role required' using errcode='42501';
  end if;
  if p_event_state not in ('succeeded','failed','cancelled','refund_updated','disputed','dispute_won','dispute_lost') then
    raise exception 'Unsupported payment event state' using errcode='22023';
  end if;

  select * into v_order
    from public.goodies_orders
   where id=p_order_id and payment_provider_ref=p_payment_intent_id
   for update;
  if not found then return 'ignored'; end if;

  if lower(coalesce(p_currency,'')) <> 'usd'
     or p_amount_cents <> round(v_order.total*100)::bigint then
    raise exception 'Stripe amount or currency does not match the Goodies order' using errcode='22023';
  end if;
  if p_event_created is null or p_event_created <= 0 then
    raise exception 'Stripe event creation time is required' using errcode='22023';
  end if;
  if p_event_created < coalesce(v_order.payment_last_event_created,0) then
    return 'stale';
  end if;

  update public.goodies_orders
     set payment_last_event_created=p_event_created,updated_at=now()
   where id=v_order.id;

  if p_event_state='refund_updated' then
    if p_refunded_amount_cents is null or p_refunded_amount_cents < 0
       or p_refunded_amount_cents > p_amount_cents then
      raise exception 'Stripe refunded amount is invalid' using errcode='22023';
    end if;
    v_refunded := greatest(v_order.payment_refunded_amount,round(p_refunded_amount_cents::numeric/100,2));
    update public.goodies_orders set
      payment_refunded_amount=v_refunded,
      payment_status=case
        when v_order.payment_dispute_status='open' then 'disputed'
        when v_order.payment_status in ('disputed','dispute_won','disputed_lost') then v_order.payment_status
        when v_refunded>=v_order.total then 'refunded'
        when v_refunded>0 then 'partially_refunded'
        when v_order.status in ('cancelled','declined','expired') then 'refund_pending'
        else v_order.payment_status
      end,
      payment_refunded_at=case when v_refunded>=v_order.total then coalesce(payment_refunded_at,now()) else payment_refunded_at end,
      updated_at=now()
     where id=v_order.id;
    return case
      when v_order.payment_status in ('disputed','dispute_won','disputed_lost') then v_order.payment_status
      when v_refunded>=v_order.total then 'refunded'
      when v_refunded>0 then 'partially_refunded'
      else v_order.payment_status
    end;
  end if;

  if p_event_state in ('failed','cancelled') then
    if v_order.payment_dispute_status is not null or v_order.payment_status in ('paid','refund_pending','partially_refunded','refunded','disputed','dispute_won','disputed_lost') then
      return v_order.payment_status;
    end if;
    if v_order.status in ('scheduled','placed') then
      for v_line in
        select (e->>'id')::uuid as product_id,sum((e->>'q')::integer) as qty
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
         set status='cancelled',payment_status='failed',updated_at=now()
       where id=v_order.id;
      perform public.goodies_order_notify(
        v_order.customer_id,'Goodies payment failed',
        'Payment for order '||v_order.order_code||' did not complete. The order was cancelled.',
        v_order.id,v_order.order_code,'cancelled',null
      );
      return 'cancelled';
    end if;
    update public.goodies_orders
       set payment_status='failed',updated_at=now()
     where id=v_order.id
       and payment_dispute_status is null
       and payment_status not in ('paid','refund_pending','partially_refunded','refunded','disputed','dispute_won','disputed_lost');
    return 'failed';
  elsif p_event_state='succeeded' then
    if v_order.status in ('cancelled','declined','expired') then
      if v_order.payment_status in ('refunded','disputed','dispute_won','disputed_lost') or v_order.payment_dispute_status is not null then
        return v_order.payment_status;
      end if;
      update public.goodies_orders
         set payment_status='refund_pending',updated_at=now()
       where id=v_order.id;
      return 'refund_required';
    end if;
    update public.goodies_orders
       set payment_status=case when payment_refunded_amount>0 then 'partially_refunded' else 'paid' end,
           updated_at=now()
     where id=v_order.id
       and payment_dispute_status is null
       and payment_status not in ('refunded','disputed','dispute_won','disputed_lost');
    return case when v_order.payment_refunded_amount>0 then 'partially_refunded' else 'paid' end;
  elsif p_event_state='disputed' then
    if v_order.payment_dispute_status in ('won','lost') then
      return v_order.payment_status;
    end if;
    update public.goodies_orders
       set payment_status='disputed',
           payment_dispute_status='open',
           updated_at=now()
     where id=v_order.id;
    return 'disputed';
  elsif p_event_state='dispute_won' then
    if v_order.payment_dispute_status='lost' then
      return v_order.payment_status;
    end if;
    update public.goodies_orders
       set payment_dispute_status='won',
           payment_status=case
             when payment_status='refunded' or payment_refunded_amount>=total then 'refunded'
             when payment_refunded_amount>0 then 'partially_refunded'
             when status in ('cancelled','declined','expired') then 'refund_pending'
             else 'paid'
           end,
           updated_at=now()
     where id=v_order.id;
    return case
      when v_order.payment_status='refunded' or v_order.payment_refunded_amount>=v_order.total then 'refunded'
      when v_order.payment_refunded_amount>0 then 'partially_refunded'
      when v_order.status in ('cancelled','declined','expired') then 'refund_pending'
      else 'paid'
    end;
  else
    if v_order.payment_dispute_status='won' then
      return v_order.payment_status;
    end if;
    update public.goodies_orders
       set payment_status='disputed_lost',
           payment_dispute_status='lost',
           updated_at=now()
     where id=v_order.id;
    return 'disputed_lost';
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.queue_goodies_card_refund_on_terminal_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if new.status in ('declined','expired','cancelled')
     and old.status is distinct from new.status
     and new.payment_method='card'
     and new.payment_status='paid'
     and new.payment_dispute_status is distinct from 'open'
     and new.payment_dispute_status is distinct from 'lost' then
    if nullif(new.payment_provider_ref,'') is null then
      update public.goodies_orders
         set payment_status='refund_manual_review',updated_at=now()
       where id=new.id;
    else
      update public.goodies_orders
         set payment_status='refund_pending',updated_at=now()
       where id=new.id;
    end if;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.refund_goodies_wallet_order(p_order_id uuid, p_reason text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.set_goodies_order_status(p_order_id uuid, p_status text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_o public.goodies_orders%rowtype;
  v_member boolean;
  v_agg record;
  v_title text;
  v_body text;
  v_refunded boolean := false;
begin
  if v_uid is null then raise exception 'Sign in required' using errcode = '28000'; end if;
  select * into v_o from public.goodies_orders where id = p_order_id for update;
  if not found then raise exception 'Order not found' using errcode = 'P0002'; end if;
  select exists (
    select 1 from public.business_members bm
    where bm.business_id = v_o.business_id and bm.user_id = v_uid
  ) into v_member;

  if p_status = 'cancelled' then
    if v_o.customer_id = v_uid and v_o.status in ('scheduled', 'placed') then
      null;
    elsif v_member and v_o.status in ('scheduled', 'placed', 'accepted', 'preparing') then
      raise exception 'Restaurant cancellations must include a reason' using errcode = 'P0001';
    else
      raise exception 'This order can no longer be cancelled' using errcode = 'P0001';
    end if;
    for v_agg in
      select (e ->> 'id')::uuid as pid, sum((e ->> 'q')::int) as qty
      from jsonb_array_elements(v_o.items) e
      where (e ->> 'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        and (e ->> 'q') ~ '^[0-9]+$'
      group by 1
    loop
      update public.goodies_products gp
      set stock = least(gp.stock + v_agg.qty, 100000), updated_at = now()
      where gp.id = v_agg.pid and gp.business_id = v_o.business_id;
    end loop;
    v_refunded := public.refund_goodies_wallet_order(v_o.id, 'order_cancelled');
    v_title := 'Goodies order cancelled';
    v_body := 'Order ' || v_o.order_code || ' was cancelled.' ||
      case when v_refunded then ' Your payment was refunded to your Wantiss wallet.'
           when v_o.payment_method = 'wallet' and v_o.payment_status = 'paid'
             then ' We could not automatically restore your wallet payment; support will need to review it.'
           else ' No wallet refund was needed.' end;
  else
    if not v_member then raise exception 'Not allowed' using errcode = '42501'; end if;
    if not (
      (v_o.status = 'accepted' and p_status = 'preparing')
      or (v_o.status = 'preparing' and p_status = 'ready')
      or (v_o.status = 'ready' and p_status = 'completed')
    ) then
      raise exception 'Invalid status change from % to %', v_o.status, p_status using errcode = 'P0001';
    end if;
    if v_o.status = 'accepted' then
      v_title := 'Store is preparing your Goodies order';
      v_body := 'The store has started preparing order ' || v_o.order_code || '.';
    elsif p_status = 'ready' then
      v_title := 'Goodies order is ready';
      v_body := 'Order ' || v_o.order_code || ' is ready for pickup or its next delivery step.';
    else
      v_title := 'Goodies order completed';
      v_body := 'Order ' || v_o.order_code || ' has been marked completed.';
    end if;
  end if;

  update public.goodies_orders set status = p_status, updated_at = now() where id = p_order_id;
  perform public.goodies_order_notify(v_o.customer_id, v_title, v_body, v_o.id, v_o.order_code, p_status, null);
  if p_status = 'cancelled' then
    for v_agg in
      select bm.user_id from public.business_members bm where bm.business_id = v_o.business_id
    loop
      perform public.goodies_order_notify(
        v_agg.user_id, 'Goodies order cancelled',
        'Order ' || v_o.order_code || ' was cancelled by the customer or store.',
        v_o.id, v_o.order_code, 'cancelled', null
      );
    end loop;
  end if;
  return p_status;
end;
$function$;

CREATE OR REPLACE FUNCTION public.sync_goodies_card_refund_queue_dispute()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if new.payment_dispute_status is not distinct from old.payment_dispute_status then
    return new;
  end if;

  if new.payment_dispute_status in ('open','lost') then
    update public.goodies_card_refund_queue
       set status='cancelled',
           lease_token=null,
           last_error=case
             when new.payment_dispute_status='open'
               then 'Paused because the Stripe dispute is open'
             else 'Cancelled because the Stripe dispute was lost'
           end,
           updated_at=now()
     where order_id=new.id
       and status in ('pending','processing','failed');
  elsif new.payment_dispute_status='won' then
    if new.payment_refunded_amount >= new.total then
      -- A refund may complete while the dispute is open. Preserve the
      -- cumulative full-refund result when the dispute later closes as won.
      update public.goodies_orders
         set payment_status='refunded',updated_at=now()
       where id=new.id and payment_status is distinct from 'refunded';
      update public.goodies_card_refund_queue
         set status='completed',lease_token=null,last_error=null,updated_at=now()
       where order_id=new.id
         and status in ('cancelled','pending','processing','failed');
    elsif new.status in ('declined','expired','cancelled')
          and new.payment_method='card'
          and new.payment_provider_ref is not null
          and new.payment_status in ('paid','refund_pending','partially_refunded') then
      insert into public.goodies_card_refund_queue(order_id,status,next_attempt_at)
      values(new.id,'pending',now())
      on conflict(order_id) do update set
        status=case
          when public.goodies_card_refund_queue.status='completed' then 'completed'
          else 'pending'
        end,
        next_attempt_at=now(),
        lease_token=null,
        last_error=null,
        updated_at=now();
    end if;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.validate_goodies_builder_line(p_business_id uuid, p_store_id text, p_line jsonb)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_byo jsonb:=p_line->'byo'; v_builder jsonb; v_size jsonb; v_group jsonb; v_item jsonb;
  v_sel jsonb; v_selected jsonb; v_choice record; v_group_id text; v_builder_id text; v_selected_id text;
  v_price numeric; v_line_price numeric; v_q numeric; v_group_count integer; v_live_count integer;
  v_min integer; v_max integer; v_item_limit integer; v_same_count integer;
begin
  if jsonb_typeof(v_byo)<>'object' or v_byo->>'sid' is distinct from p_store_id then
    raise exception 'Invalid custom builder reference' using errcode='22023';
  end if;
  v_builder_id:=v_byo->>'bid';
  if p_line->>'id' is distinct from 'byo:'||v_builder_id then raise exception 'Invalid custom item reference' using errcode='22023'; end if;
  select config into v_builder from public.goodies_builder_configs
    where business_id=p_business_id and builder_id=v_builder_id and enabled=true;
  if not found or v_builder is null or coalesce((v_builder->>'enabled')::boolean,true)=false
     or coalesce((v_builder->>'available')::boolean,true)=false then
    raise exception 'This custom builder is no longer available' using errcode='P0001';
  end if;
  v_price:=coalesce(nullif(v_builder->>'base','')::numeric,0);
  if jsonb_array_length(coalesce(v_builder->'sizes','[]'::jsonb))>0 then
    v_size:=null;
    select value into v_size from jsonb_array_elements(coalesce(v_builder->'sizes','[]'::jsonb)) as sz(value)
      where value->>'id'=v_byo->>'size' limit 1;
    if v_size is null or coalesce((v_size->>'avail')::boolean,true)=false then raise exception 'Choose an available builder size' using errcode='P0001'; end if;
    v_price:=v_price+coalesce(nullif(v_size->>'add','')::numeric,0);
  end if;
  v_sel:=coalesce(v_byo->'sel','{}'::jsonb);
  for v_group in select value from jsonb_array_elements(coalesce(v_builder->'groups','[]'::jsonb)) as gr(value) loop
    v_group_id:=v_group->>'id';
    v_selected:=coalesce(v_sel->v_group_id,'[]'::jsonb);
    if jsonb_typeof(v_selected)<>'array' then raise exception 'Invalid custom builder choices' using errcode='22023'; end if;
    v_group_count:=jsonb_array_length(v_selected);
    v_min:=coalesce(nullif(v_group->>'min','')::integer,0);
    if coalesce((v_group->>'req')::boolean,false) or v_min>0 then v_min:=greatest(1,v_min); end if;
    v_max:=greatest(1,coalesce(nullif(v_group->>'max','')::integer,1));
    if v_group_count<v_min then raise exception 'Required custom choices are missing' using errcode='P0001'; end if;
    if v_group_count>v_max then raise exception 'Too many items in custom group' using errcode='P0001'; end if;
    v_live_count:=0;
    for v_choice in select value,ordinality from jsonb_array_elements(v_selected) with ordinality as ch(value,ordinality) loop
      v_selected_id:=v_choice.value #>> '{}';
      v_item:=null;
      select value into v_item from jsonb_array_elements(coalesce(v_group->'items','[]'::jsonb)) as bi(value)
        where value->>'id'=v_selected_id limit 1;
      if v_item is null or coalesce((v_item->>'avail')::boolean,true)=false then raise exception 'A selected custom ingredient is no longer available' using errcode='P0001'; end if;
      v_live_count:=v_live_count+1;
      select count(*) into v_same_count from jsonb_array_elements(v_selected) as selected(value) where selected.value #>> '{}'=v_selected_id;
      v_item_limit:=least(coalesce(nullif(v_group->>'me','')::integer,v_max),coalesce(nullif(v_item->>'max','')::integer,coalesce(nullif(v_group->>'me','')::integer,v_max)));
      if v_same_count>v_item_limit then raise exception 'Too many of one ingredient in this custom group' using errcode='P0001'; end if;
      if not coalesce((v_item->>'free')::boolean,false)
        and not (coalesce(v_group->>'kind','one')<>'one' and v_choice.ordinality<=coalesce(nullif(v_group->>'inc','')::integer,0)) then
        v_price:=v_price+coalesce(nullif(v_item->>'price','')::numeric,0);
      end if;
    end loop;
    if v_live_count<v_min then raise exception 'Required custom choices are missing' using errcode='P0001'; end if;
  end loop;
  v_line_price:=round(v_price,2);
  begin v_q:=(p_line->>'q')::numeric; exception when others then raise exception 'Invalid custom item quantity' using errcode='22023'; end;
  if v_q is null or v_q<1 or v_q>99 or v_q<>trunc(v_q) then raise exception 'Invalid custom item quantity' using errcode='22023'; end if;
  begin v_price:=(p_line->>'p')::numeric; exception when others then raise exception 'Invalid custom item price' using errcode='22023'; end;
  if abs(v_price-v_line_price)>0.01 then raise exception 'The custom item price changed. Rebuild it and review your cart.' using errcode='P0001'; end if;
  return v_line_price;
end; $function$;

CREATE OR REPLACE FUNCTION public.validate_goodies_refund_worker_token(p_token text)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce(exists(
    select 1 from vault.decrypted_secrets
    where name='goodies_refund_worker_token' and decrypted_secret=p_token
  ),false);
$function$;

CREATE OR REPLACE FUNCTION public.validate_goodies_standard_product_line(p_category text, p_base_price numeric, p_line jsonb, p_deals jsonb)
 RETURNS numeric
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_options jsonb := p_line->'options';
  v_parts text[];
  v_size text;
  v_drink boolean := false;
  v_discount_pct numeric := 0;
  v_base numeric;
  v_expected numeric;
  v_supplies_size boolean := p_category IN ('restaurants', 'bakery', 'beverages');
  v_deal jsonb;
  v_line_price numeric;
BEGIN
  IF p_line IS NULL OR jsonb_typeof(p_line) <> 'object'
     OR p_base_price IS NULL OR p_base_price < 0 THEN
    RAISE EXCEPTION 'Invalid product line' USING ERRCODE = '22023';
  END IF;

  IF v_options IS NOT NULL THEN
    IF jsonb_typeof(v_options) <> 'object' THEN
      RAISE EXCEPTION 'Invalid product options' USING ERRCODE = '22023';
    END IF;
    v_size := nullif(v_options->>'size', '');
    IF v_options ? 'drink' THEN
      IF jsonb_typeof(v_options->'drink') <> 'boolean' THEN
        RAISE EXCEPTION 'Invalid drink option' USING ERRCODE = '22023';
      END IF;
      v_drink := (v_options->>'drink')::boolean;
    END IF;
    BEGIN
      v_discount_pct := coalesce(nullif(v_options->>'discount_pct', '')::numeric, 0);
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Invalid product discount' USING ERRCODE = '22023';
    END;
  ELSE
    v_parts := string_to_array(coalesce(p_line->>'k', ''), '|');
    IF coalesce(array_length(v_parts, 1), 0) >= 4 THEN
      IF v_supplies_size THEN
        v_size := CASE v_parts[2] WHEN '0' THEN 'regular' WHEN '1' THEN 'large' ELSE NULL END;
      ELSIF v_parts[2] IN ('', '0') THEN
        v_size := NULL;
      ELSE
        RAISE EXCEPTION 'This product does not offer size options' USING ERRCODE = '22023';
      END IF;
      IF v_parts[3] NOT IN ('0', '1') THEN
        RAISE EXCEPTION 'Invalid drink option' USING ERRCODE = '22023';
      END IF;
      v_drink := v_parts[3] = '1';
      BEGIN
        v_discount_pct := coalesce(nullif(v_parts[4], '')::numeric, 0);
      EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Invalid product discount' USING ERRCODE = '22023';
      END;
    ELSE
      v_size := CASE WHEN v_supplies_size THEN 'regular' ELSE NULL END;
    END IF;
  END IF;

  IF v_supplies_size THEN
    IF v_size IS NULL OR v_size NOT IN ('regular', 'large') THEN
      RAISE EXCEPTION 'Choose a valid product size' USING ERRCODE = '22023';
    END IF;
  ELSIF v_size IS NOT NULL THEN
    RAISE EXCEPTION 'This product does not offer size options' USING ERRCODE = '22023';
  END IF;

  IF v_drink AND p_category NOT IN ('restaurants', 'bakery') THEN
    RAISE EXCEPTION 'A drink add-on is not available for this product' USING ERRCODE = '22023';
  END IF;
  IF v_discount_pct < 0 OR v_discount_pct > 100 THEN
    RAISE EXCEPTION 'Invalid product discount' USING ERRCODE = '22023';
  END IF;

  IF v_discount_pct > 0 THEN
    IF jsonb_typeof(coalesce(p_deals, '[]'::jsonb)) <> 'array' THEN
      RAISE EXCEPTION 'Product discount configuration is invalid' USING ERRCODE = '22023';
    END IF;
    SELECT d INTO v_deal
      FROM jsonb_array_elements(coalesce(p_deals, '[]'::jsonb)) AS deal(d)
     WHERE d->>'item' = p_line->>'id'
       AND d->>'st' = 'Live'
       AND coalesce(d->>'rs', '') <> 'alcohol'
       AND CASE
         WHEN coalesce(d->>'pct', '') ~ '^(0|[1-9][0-9]{0,2})([.][0-9]{1,2})?$'
         THEN (d->>'pct')::numeric = v_discount_pct
         ELSE false
       END
     LIMIT 1;
    IF v_deal IS NULL THEN
      RAISE EXCEPTION 'This product discount is no longer available' USING ERRCODE = 'P0001';
    END IF;
    v_base := round(p_base_price * (100 - v_discount_pct) / 100, 2);
  ELSE
    v_base := p_base_price;
  END IF;

  v_expected := v_base
    + CASE WHEN v_size = 'large' THEN 1.50 ELSE 0 END
    + CASE WHEN v_drink THEN 1.00 ELSE 0 END;

  BEGIN
    v_line_price := (p_line->>'p')::numeric;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Invalid product price' USING ERRCODE = '22023';
  END;
  IF v_line_price IS NULL OR abs(v_line_price - v_expected) > 0.005 THEN
    RAISE EXCEPTION 'The price or options for this product have changed. Please review your cart.' USING ERRCODE = 'P0001';
  END IF;
  RETURN v_expected;
END;
$function$;

CREATE OR REPLACE FUNCTION public.wantiss_admin_list_goodies_builder_businesses()
 RETURNS TABLE(business_id uuid, business_name text, goodies_store_id text, is_live boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if (select auth.uid()) is null or not public.wantiss_has_permission('operations', 'edit') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  return query
  select b.id, coalesce(b.name::text, 'Unnamed business'), gs.store_id, coalesce(gs.is_live, false)
  from public.businesses b
  left join public.goodies_store_schedules gs on gs.business_id = b.id
  order by b.name nulls last, b.created_at desc;
end;
$function$;

CREATE OR REPLACE FUNCTION public.wantiss_admin_list_goodies_builder_configs()
 RETURNS TABLE(business_id uuid, business_name text, builder_id text, config jsonb, enabled boolean, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if (select auth.uid()) is null or not public.wantiss_has_permission('operations', 'edit') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  return query
  select gbc.business_id, coalesce(b.name::text, 'Unknown business'), gbc.builder_id, gbc.config, gbc.enabled, gbc.updated_at
  from public.goodies_builder_configs gbc
  left join public.businesses b on b.id = gbc.business_id
  order by b.name nulls last, gbc.updated_at desc, gbc.builder_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.wantiss_admin_requeue_goodies_card_refund(p_queue_id uuid, p_reason text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_actor uuid := auth.uid();
  v_order_id uuid;
  v_before jsonb;
begin
  if v_actor is null or not public.wantiss_has_permission('finance.refund','manage') then
    raise exception 'Not authorized' using errcode='42501';
  end if;
  if length(trim(coalesce(p_reason,''))) < 5 then
    raise exception 'A reason of at least 5 characters is required' using errcode='22023';
  end if;

  select q.order_id,
         jsonb_build_object('status',q.status,'attempts',q.attempts,'last_error',q.last_error)
    into v_order_id,v_before
    from public.goodies_card_refund_queue q
    join public.goodies_orders o on o.id=q.order_id
   where q.id=p_queue_id
     and q.status='dead_letter'
     and o.status in ('declined','expired','cancelled')
     and o.payment_method='card'
     and o.payment_provider_ref is not null
     and o.payment_status in ('paid','refund_pending','partially_refunded')
     and o.payment_dispute_status is distinct from 'open'
     and o.payment_dispute_status is distinct from 'lost'
   for update of q,o;

  if v_order_id is null then
    raise exception 'Refund is not eligible for manual retry' using errcode='P0001';
  end if;

  update public.goodies_card_refund_queue
     set status='pending',attempts=0,next_attempt_at=now(),lease_token=null,
         last_error='Manually requeued: '||left(trim(p_reason),900),updated_at=now()
   where id=p_queue_id;

  insert into public.wantiss_admin_audit_log(actor_user_id,action,resource_type,resource_id,reason,before_state,after_state)
  values(v_actor,'goodies_card_refund_requeued','goodies_card_refund',p_queue_id::text,left(trim(p_reason),1000),
    v_before,jsonb_build_object('status','pending','attempts',0,'order_id',v_order_id));

  return true;
end;
$function$;

CREATE OR REPLACE FUNCTION public.wantiss_admin_save_goodies_builder_config(p_business_id uuid, p_builder_id text, p_config jsonb, p_enabled boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_enabled boolean;
  v_existing jsonb;
  v_saved_config jsonb;
  v_group jsonb;
  v_item jsonb;
  v_old_item jsonb;
  v_groups jsonb := '[]'::jsonb;
  v_items jsonb;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT public.wantiss_has_permission('operations', 'edit') THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  IF p_business_id IS NULL OR length(trim(coalesce(p_builder_id, ''))) NOT BETWEEN 1 AND 120 THEN
    RAISE EXCEPTION 'Invalid business or builder id' USING ERRCODE = '22023';
  END IF;
  IF p_config IS NULL OR jsonb_typeof(p_config) <> 'object' OR p_config->>'id' IS DISTINCT FROM trim(p_builder_id) THEN
    RAISE EXCEPTION 'Builder config must be an object whose id matches the selected builder' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(p_config->'groups') IS DISTINCT FROM 'array' OR jsonb_typeof(p_config->'sizes') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Builder sizes and ingredient groups must be arrays' USING ERRCODE = '22023';
  END IF;
  IF length(p_config::text) > 500000 THEN
    RAISE EXCEPTION 'Builder config is too large' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = p_business_id) THEN
    RAISE EXCEPTION 'Business not found' USING ERRCODE = 'P0001';
  END IF;

  SELECT gbc.config INTO v_existing
  FROM public.goodies_builder_configs gbc
  WHERE gbc.business_id = p_business_id AND gbc.builder_id = trim(p_builder_id)
  FOR UPDATE;

  FOR v_group IN
    SELECT value FROM jsonb_array_elements(COALESCE(p_config->'groups', '[]'::jsonb))
  LOOP
    v_items := '[]'::jsonb;
    FOR v_item IN
      SELECT value FROM jsonb_array_elements(COALESCE(v_group->'items', '[]'::jsonb))
    LOOP
      v_old_item := NULL;
      IF v_existing IS NOT NULL THEN
        SELECT old_item.value INTO v_old_item
        FROM jsonb_array_elements(COALESCE(v_existing->'groups', '[]'::jsonb)) AS old_group(value)
        CROSS JOIN LATERAL jsonb_array_elements(COALESCE(old_group.value->'items', '[]'::jsonb)) AS old_item(value)
        WHERE old_item.value->>'id' = v_item->>'id'
        LIMIT 1;
      END IF;

      IF v_old_item IS NOT NULL THEN
        v_item := jsonb_set(v_item, '{price}', COALESCE(v_old_item->'price', '0'::jsonb), true);
        v_item := jsonb_set(v_item, '{free}', COALESCE(v_old_item->'free', 'false'::jsonb), true);
        v_item := jsonb_set(v_item, '{avail}', COALESCE(v_old_item->'avail', 'false'::jsonb), true);
      ELSE
        v_item := jsonb_set(v_item, '{price}', '0'::jsonb, true);
        v_item := jsonb_set(v_item, '{free}', 'false'::jsonb, true);
        v_item := jsonb_set(v_item, '{avail}', 'false'::jsonb, true);
      END IF;
      v_items := v_items || jsonb_build_array(v_item);
    END LOOP;
    v_group := jsonb_set(v_group, '{items}', v_items, true);
    v_groups := v_groups || jsonb_build_array(v_group);
  END LOOP;

  v_saved_config := jsonb_set(p_config, '{groups}', v_groups, true);
  v_enabled := COALESCE(p_enabled, false)
    AND COALESCE((v_saved_config->>'enabled')::boolean, false)
    AND COALESCE((v_saved_config->>'available')::boolean, false);

  INSERT INTO public.goodies_builder_configs (business_id, builder_id, config, enabled, updated_at)
  VALUES (p_business_id, trim(p_builder_id), v_saved_config, v_enabled, now())
  ON CONFLICT (business_id, builder_id)
  DO UPDATE SET config = EXCLUDED.config, enabled = EXCLUDED.enabled, updated_at = now();

  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.wantiss_has_permission(p_permission text, p_min_level text DEFAULT 'view'::text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1 from public.wantiss_admin_staff s
    join auth.users u on u.id=s.user_id
    where s.user_id=(select auth.uid()) and s.status='active'
      and u.email_confirmed_at is not null
      and (s.invitation_expires_at is null or s.invitation_expires_at>now())
      and (s.invited_at is null or u.raw_user_meta_data->>'wantiss_invite_accepted'='true')
      and (s.role='super_admin' or exists (
        select 1 from public.wantiss_admin_permission_grants g
        where g.staff_user_id=s.user_id and g.permission_key=p_permission
          and g.revoked_at is null and (g.expires_at is null or g.expires_at>now())
          and case p_min_level when 'view' then g.access_level in ('view','edit','manage')
            when 'edit' then g.access_level in ('edit','manage') when 'manage' then g.access_level='manage' else false end
      ))
  );
$function$;

alter table public."business_members" alter column "id" set default gen_random_uuid();

alter table public."business_members" alter column "role" set default 'owner'::text;

alter table public."business_members" alter column "created_at" set default now();

alter table public."businesses" alter column "id" set default gen_random_uuid();

alter table public."businesses" alter column "verification" set default 'setup'::text;

alter table public."businesses" alter column "payout_ready" set default false;

alter table public."businesses" alter column "is_live" set default false;

alter table public."businesses" alter column "created_at" set default now();

alter table public."businesses" alter column "accept_scheduled_orders" set default false;

alter table public."businesses" alter column "scheduled_order_start_minutes" set default 60;

alter table public."businesses" alter column "phone_country" set default 'HT'::text;

alter table public."businesses" alter column "country" set default 'HT'::text;

alter table public."businesses" alter column "delivery_modes" set default '{}'::text[];

alter table public."businesses" alter column "hours" set default '{}'::jsonb;

alter table public."conversations" alter column "id" set default gen_random_uuid();

alter table public."conversations" alter column "created_at" set default now();

alter table public."conversations" alter column "updated_at" set default now();

alter table public."conversations" alter column "unread_business" set default 0;

alter table public."conversations" alter column "unread_customer" set default 0;

alter table public."conversations" alter column "status" set default 'active'::text;

alter table public."goodies_builder_configs" alter column "id" set default gen_random_uuid();

alter table public."goodies_builder_configs" alter column "enabled" set default true;

alter table public."goodies_builder_configs" alter column "created_at" set default now();

alter table public."goodies_builder_configs" alter column "updated_at" set default now();

alter table public."goodies_card_checkout_attempts" alter column "id" set default gen_random_uuid();

alter table public."goodies_card_checkout_attempts" alter column "created_at" set default now();

alter table public."goodies_card_refund_queue" alter column "id" set default gen_random_uuid();

alter table public."goodies_card_refund_queue" alter column "status" set default 'pending'::text;

alter table public."goodies_card_refund_queue" alter column "attempts" set default 0;

alter table public."goodies_card_refund_queue" alter column "next_attempt_at" set default now();

alter table public."goodies_card_refund_queue" alter column "created_at" set default now();

alter table public."goodies_card_refund_queue" alter column "updated_at" set default now();

alter table public."goodies_checkout_attempts" alter column "id" set default gen_random_uuid();

alter table public."goodies_checkout_attempts" alter column "created_at" set default now();

alter table public."goodies_courier_presence" alter column "is_available" set default false;

alter table public."goodies_courier_presence" alter column "accepts_cash_on_delivery" set default false;

alter table public."goodies_courier_presence" alter column "updated_at" set default now();

alter table public."goodies_courier_roster" alter column "is_approved" set default true;

alter table public."goodies_courier_roster" alter column "created_at" set default now();

alter table public."goodies_courier_roster" alter column "updated_at" set default now();

alter table public."goodies_delivery_assignments" alter column "id" set default gen_random_uuid();

alter table public."goodies_delivery_assignments" alter column "status" set default 'offered'::text;

alter table public."goodies_delivery_assignments" alter column "offered_at" set default now();

alter table public."goodies_delivery_assignments" alter column "created_at" set default now();

alter table public."goodies_delivery_assignments" alter column "updated_at" set default now();

alter table public."goodies_delivery_quotes" alter column "id" set default gen_random_uuid();

alter table public."goodies_delivery_quotes" alter column "created_at" set default now();

alter table public."goodies_delivery_quotes" alter column "expires_at" set default (now() + '00:05:00'::interval);

alter table public."goodies_geocode_cache" alter column "updated_at" set default now();

alter table public."goodies_geocode_cache" alter column "expires_at" set default (now() + '90 days'::interval);

alter table public."goodies_group_order_invites" alter column "id" set default gen_random_uuid();

alter table public."goodies_group_order_invites" alter column "status" set default 'pending'::text;

alter table public."goodies_group_order_invites" alter column "created_at" set default now();

alter table public."goodies_group_order_items" alter column "id" set default gen_random_uuid();

alter table public."goodies_group_order_items" alter column "options" set default '{}'::jsonb;

alter table public."goodies_group_order_items" alter column "created_at" set default now();

alter table public."goodies_group_order_items" alter column "updated_at" set default now();

alter table public."goodies_group_order_members" alter column "role" set default 'member'::text;

alter table public."goodies_group_order_members" alter column "joined_at" set default now();

alter table public."goodies_group_orders" alter column "id" set default gen_random_uuid();

alter table public."goodies_group_orders" alter column "status" set default 'open'::text;

alter table public."goodies_group_orders" alter column "max_members" set default 20;

alter table public."goodies_group_orders" alter column "expires_at" set default (now() + '24:00:00'::interval);

alter table public."goodies_group_orders" alter column "created_at" set default now();

alter table public."goodies_group_orders" alter column "updated_at" set default now();

alter table public."goodies_ingredient_requests" alter column "id" set default gen_random_uuid();

alter table public."goodies_ingredient_requests" alter column "status" set default 'submitted'::text;

alter table public."goodies_ingredient_requests" alter column "created_at" set default now();

alter table public."goodies_ingredient_requests" alter column "updated_at" set default now();

alter table public."goodies_ingredient_rules" alter column "id" set default true;

alter table public."goodies_ingredient_rules" alter column "updated_at" set default now();

alter table public."goodies_library_ingredients" alter column "active" set default true;

alter table public."goodies_library_ingredients" alter column "created_at" set default now();

alter table public."goodies_library_ingredients" alter column "updated_at" set default now();

alter table public."goodies_order_cancellation_private" alter column "created_at" set default now();

alter table public."goodies_order_groups" alter column "id" set default gen_random_uuid();

alter table public."goodies_order_groups" alter column "order_type" set default 'delivery'::text;

alter table public."goodies_order_groups" alter column "subtotal" set default 0;

alter table public."goodies_order_groups" alter column "delivery_fee" set default 0;

alter table public."goodies_order_groups" alter column "service_fee" set default 0;

alter table public."goodies_order_groups" alter column "tip" set default 0;

alter table public."goodies_order_groups" alter column "total" set default 0;

alter table public."goodies_order_groups" alter column "created_at" set default now();

alter table public."goodies_orders" alter column "id" set default gen_random_uuid();

alter table public."goodies_orders" alter column "status" set default 'placed'::text;

alter table public."goodies_orders" alter column "order_type" set default 'delivery'::text;

alter table public."goodies_orders" alter column "items" set default '[]'::jsonb;

alter table public."goodies_orders" alter column "subtotal" set default 0;

alter table public."goodies_orders" alter column "delivery_fee" set default 0;

alter table public."goodies_orders" alter column "service_fee" set default 0;

alter table public."goodies_orders" alter column "discount" set default 0;

alter table public."goodies_orders" alter column "tip" set default 0;

alter table public."goodies_orders" alter column "total" set default 0;

alter table public."goodies_orders" alter column "payment_method" set default 'demo'::text;

alter table public."goodies_orders" alter column "payment_status" set default 'demo'::text;

alter table public."goodies_orders" alter column "created_at" set default now();

alter table public."goodies_orders" alter column "updated_at" set default now();

alter table public."goodies_orders" alter column "commissionable_subtotal" set default 0;

alter table public."goodies_orders" alter column "platform_commission_rate" set default 0.10;

alter table public."goodies_orders" alter column "platform_commission_amount" set default 0;

alter table public."goodies_orders" alter column "vendor_net_amount" set default 0;

alter table public."goodies_orders" alter column "delivery_commission_rate" set default 0.07;

alter table public."goodies_orders" alter column "delivery_commission_amount" set default 0;

alter table public."goodies_orders" alter column "courier_net_delivery_amount" set default 0;

alter table public."goodies_orders" alter column "payment_refunded_amount" set default 0;

alter table public."goodies_orders" alter column "payment_last_event_created" set default 0;

alter table public."goodies_orders" alter column "self_delivery" set default false;

alter table public."goodies_products" alter column "id" set default gen_random_uuid();

alter table public."goodies_products" alter column "emoji" set default '🛍️'::text;

alter table public."goodies_products" alter column "stock" set default 0;

alter table public."goodies_products" alter column "is_available" set default true;

alter table public."goodies_products" alter column "restriction" set default 'none'::text;

alter table public."goodies_products" alter column "sort_order" set default 0;

alter table public."goodies_products" alter column "created_at" set default now();

alter table public."goodies_products" alter column "updated_at" set default now();

alter table public."goodies_products" alter column "review_status" set default 'approved'::text;

alter table public."goodies_products" alter column "photo_urls" set default '[]'::jsonb;

alter table public."goodies_promotions" alter column "id" set default gen_random_uuid();

alter table public."goodies_promotions" alter column "discount_value" set default 0;

alter table public."goodies_promotions" alter column "min_subtotal" set default 0;

alter table public."goodies_promotions" alter column "redemption_count" set default 0;

alter table public."goodies_promotions" alter column "is_active" set default true;

alter table public."goodies_promotions" alter column "created_at" set default now();

alter table public."goodies_promotions" alter column "updated_at" set default now();

alter table public."goodies_route_cache" alter column "updated_at" set default now();

alter table public."goodies_route_cache" alter column "expires_at" set default (now() + '7 days'::interval);

alter table public."goodies_store_schedules" alter column "id" set default gen_random_uuid();

alter table public."goodies_store_schedules" alter column "hours" set default '{}'::jsonb;

alter table public."goodies_store_schedules" alter column "accept_scheduled_orders" set default false;

alter table public."goodies_store_schedules" alter column "scheduled_order_start_minutes" set default 60;

alter table public."goodies_store_schedules" alter column "is_live" set default false;

alter table public."goodies_store_schedules" alter column "updated_at" set default now();

alter table public."goodies_store_schedules" alter column "delivery_modes" set default '{}'::text[];

alter table public."goodies_store_schedules" alter column "min_order" set default 0;

alter table public."goodies_store_schedules" alter column "delivery_fee" set default 0;

alter table public."goodies_store_schedules" alter column "eta_min" set default 20;

alter table public."goodies_store_schedules" alter column "eta_max" set default 35;

alter table public."goodies_store_schedules" alter column "names" set default '{}'::jsonb;

alter table public."goodies_store_schedules" alter column "delivery_pricing_mode" set default 'fixed'::text;

alter table public."goodies_store_schedules" alter column "delivery_base_fee" set default 0;

alter table public."goodies_store_schedules" alter column "delivery_per_km_fee" set default 0;

alter table public."goodies_store_schedules" alter column "delivery_min_fee" set default 0;

alter table public."goodies_store_schedules" alter column "accept_cash_on_delivery" set default false;

alter table public."goodies_store_schedules" alter column "scheduled_order_start_time" set default '10:00:00'::time without time zone;

alter table public."goodies_store_schedules" alter column "scheduled_order_timezone" set default 'UTC'::text;

alter table public."goodies_stripe_webhook_events" alter column "livemode" set default false;

alter table public."goodies_stripe_webhook_events" alter column "status" set default 'processing'::text;

alter table public."goodies_stripe_webhook_events" alter column "attempts" set default 1;

alter table public."goodies_stripe_webhook_events" alter column "locked_at" set default now();

alter table public."goodies_stripe_webhook_events" alter column "created_at" set default now();

alter table public."goodies_stripe_webhook_events" alter column "updated_at" set default now();

alter table public."messages" alter column "id" set default gen_random_uuid();

alter table public."messages" alter column "created_at" set default now();

alter table public."notifications" alter column "id" set default gen_random_uuid();

alter table public."notifications" alter column "created_at" set default now();

alter table public."notifications" alter column "vendor_id" set default gen_random_uuid();

alter table public."notifications" alter column "read" set default false;

alter table public."notifications" alter column "notification_type" set default 'general'::text;

alter table public."notifications" alter column "metadata" set default '{}'::jsonb;

alter table public."notifications" alter column "updated_at" set default now();

alter table public."profiles" alter column "id" set default gen_random_uuid();

alter table public."profiles" alter column "created_at" set default now();

alter table public."profiles" alter column "preferred_currency" set default 'USD'::text;

alter table public."wallet_transactions" alter column "id" set default gen_random_uuid();

alter table public."wallet_transactions" alter column "created_at" set default now();

alter table public."wallet_transactions" alter column "status" set default 'completed'::text;

alter table public."wallet_transactions" alter column "user_id" set default gen_random_uuid();

alter table public."wallet_transactions" alter column "wallet_currency" set default 'USD'::text;

alter table public."wallet_transactions" alter column "metadata" set default '{}'::jsonb;

alter table public."wallets" alter column "id" set default gen_random_uuid();

alter table public."wallets" alter column "created_at" set default now();

alter table public."wallets" alter column "balance" set default 0;

alter table public."wallets" alter column "user_id" set default gen_random_uuid();

alter table public."wantiss_admin_account_restrictions" alter column "id" set default gen_random_uuid();

alter table public."wantiss_admin_account_restrictions" alter column "notes" set default ''::text;

alter table public."wantiss_admin_account_restrictions" alter column "status" set default 'active'::text;

alter table public."wantiss_admin_account_restrictions" alter column "notify_user" set default false;

alter table public."wantiss_admin_account_restrictions" alter column "created_at" set default now();

alter table public."wantiss_admin_audit_log" alter column "created_at" set default now();

alter table public."wantiss_admin_permission_grants" alter column "id" set default gen_random_uuid();

alter table public."wantiss_admin_permission_grants" alter column "created_at" set default now();

alter table public."wantiss_admin_staff" alter column "status" set default 'active'::text;

alter table public."wantiss_admin_staff" alter column "role" set default 'staff'::text;

alter table public."wantiss_admin_staff" alter column "created_at" set default now();

alter table public."wantiss_admin_staff" alter column "updated_at" set default now();

alter table public."wantiss_cms_content" alter column "id" set default gen_random_uuid();

alter table public."wantiss_cms_content" alter column "locale" set default 'en'::text;

alter table public."wantiss_cms_content" alter column "version" set default 1;

alter table public."wantiss_cms_content" alter column "status" set default 'draft'::text;

alter table public."wantiss_cms_content" alter column "payload" set default '{}'::jsonb;

alter table public."wantiss_cms_content" alter column "created_at" set default now();

alter table public."wantiss_cms_content" alter column "updated_at" set default now();

alter table public."goodies_checkout_attempts" add constraint "goodies_checkout_attempts_idempotency_key_check" CHECK (((length(idempotency_key) >= 8) AND (length(idempotency_key) <= 200)));

alter table public."goodies_checkout_attempts" add constraint "goodies_checkout_attempts_payment_method_check" CHECK ((payment_method = ANY (ARRAY['wallet'::text, 'cash'::text])));

alter table public."goodies_checkout_attempts" add constraint "goodies_checkout_attempts_pkey" PRIMARY KEY (id);

alter table public."goodies_checkout_attempts" add constraint "goodies_checkout_attempts_request_fingerprint_check" CHECK ((length(request_fingerprint) = 32));

alter table public."goodies_checkout_attempts" add constraint "goodies_checkout_attempts_user_id_idempotency_key_key" UNIQUE (user_id, idempotency_key);

alter table public."goodies_stripe_webhook_events" add constraint "goodies_stripe_webhook_events_attempts_check" CHECK ((attempts > 0));

alter table public."goodies_stripe_webhook_events" add constraint "goodies_stripe_webhook_events_pkey" PRIMARY KEY (event_id);

alter table public."goodies_stripe_webhook_events" add constraint "goodies_stripe_webhook_events_status_check" CHECK ((status = ANY (ARRAY['processing'::text, 'processed'::text, 'failed'::text])));

alter table public."goodies_group_order_invites" add constraint "goodies_group_order_invites_group_id_invited_user_id_key" UNIQUE (group_id, invited_user_id);

alter table public."goodies_group_order_invites" add constraint "goodies_group_order_invites_pkey" PRIMARY KEY (id);

alter table public."goodies_group_order_invites" add constraint "goodies_group_order_invites_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'declined'::text])));

alter table public."goodies_order_cancellation_private" add constraint "goodies_order_cancellation_private_detail_length_check" CHECK ((length(COALESCE(reason_detail, ''::text)) <= 1000));

alter table public."goodies_order_cancellation_private" add constraint "goodies_order_cancellation_private_other_detail_check" CHECK (((reason_code <> 'other'::text) OR (length(TRIM(BOTH FROM COALESCE(reason_detail, ''::text))) >= 10)));

alter table public."goodies_order_cancellation_private" add constraint "goodies_order_cancellation_private_pkey" PRIMARY KEY (order_id);

alter table public."goodies_order_cancellation_private" add constraint "goodies_order_cancellation_private_reason_code_check" CHECK ((reason_code = ANY (ARRAY['out_of_stock'::text, 'too_busy'::text, 'fulfilment_unavailable'::text, 'delivery_unavailable'::text, 'timing_unavailable'::text, 'other'::text])));

alter table public."wallets" add constraint "wallets_pkey" PRIMARY KEY (id);

alter table public."wallets" add constraint "wallets_user_id_key" UNIQUE (user_id);

alter table public."goodies_orders" add constraint "goodies_orders_decline_reason_code_check" CHECK (((decline_reason_code IS NULL) OR (decline_reason_code = ANY (ARRAY['out_of_stock'::text, 'too_busy'::text, 'fulfilment_unavailable'::text, 'delivery_unavailable'::text, 'timing_unavailable'::text, 'other'::text]))));

alter table public."goodies_orders" add constraint "goodies_orders_delivery_dispute_status_check" CHECK (((delivery_dispute_status IS NULL) OR (delivery_dispute_status = ANY (ARRAY['open'::text, 'resolved_release'::text, 'resolved_refund'::text]))));

alter table public."goodies_orders" add constraint "goodies_orders_order_code_key" UNIQUE (order_code);

alter table public."goodies_orders" add constraint "goodies_orders_order_type_check" CHECK ((order_type = ANY (ARRAY['delivery'::text, 'pickup'::text])));

alter table public."goodies_orders" add constraint "goodies_orders_payment_dispute_status_check" CHECK (((payment_dispute_status IS NULL) OR (payment_dispute_status = ANY (ARRAY['open'::text, 'won'::text, 'lost'::text]))));

alter table public."goodies_orders" add constraint "goodies_orders_payment_refunded_amount_check" CHECK (((payment_refunded_amount >= (0)::numeric) AND (payment_refunded_amount <= total)));

alter table public."goodies_orders" add constraint "goodies_orders_pkey" PRIMARY KEY (id);

alter table public."goodies_orders" add constraint "goodies_orders_status_check" CHECK ((status = ANY (ARRAY['scheduled'::text, 'placed'::text, 'accepted'::text, 'preparing'::text, 'ready'::text, 'courier_assigned'::text, 'picked_up'::text, 'completed'::text, 'cancelled'::text, 'declined'::text, 'expired'::text])));

alter table public."goodies_order_groups" add constraint "goodies_order_groups_customer_id_idempotency_key_key" UNIQUE (customer_id, idempotency_key);

alter table public."goodies_order_groups" add constraint "goodies_order_groups_idempotency_key_check" CHECK (((length(btrim(idempotency_key)) >= 8) AND (length(btrim(idempotency_key)) <= 200)));

alter table public."goodies_order_groups" add constraint "goodies_order_groups_pkey" PRIMARY KEY (id);

alter table public."goodies_order_groups" add constraint "goodies_order_groups_request_fingerprint_check" CHECK ((length(request_fingerprint) = 32));

alter table public."goodies_order_groups" add constraint "goodies_order_groups_stop_count_check" CHECK (((stop_count >= 1) AND (stop_count <= 8)));

alter table public."goodies_group_order_items" add constraint "goodies_group_order_items_group_id_user_id_line_key_key" UNIQUE (group_id, user_id, line_key);

alter table public."goodies_group_order_items" add constraint "goodies_group_order_items_pkey" PRIMARY KEY (id);

alter table public."goodies_group_order_items" add constraint "goodies_group_order_items_quantity_check" CHECK (((quantity >= 1) AND (quantity <= 99)));

alter table public."goodies_group_orders" add constraint "goodies_group_orders_invite_code_key" UNIQUE (invite_code);

alter table public."goodies_group_orders" add constraint "goodies_group_orders_max_members_check" CHECK (((max_members >= 2) AND (max_members <= 50)));

alter table public."goodies_group_orders" add constraint "goodies_group_orders_pkey" PRIMARY KEY (id);

alter table public."goodies_group_orders" add constraint "goodies_group_orders_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'locked'::text, 'checked_out'::text, 'closed'::text, 'expired'::text, 'cancelled'::text])));

alter table public."goodies_group_order_members" add constraint "goodies_group_order_members_pkey" PRIMARY KEY (group_id, user_id);

alter table public."goodies_group_order_members" add constraint "goodies_group_order_members_role_check" CHECK ((role = ANY (ARRAY['host'::text, 'member'::text])));

alter table public."goodies_geocode_cache" add constraint "goodies_geocode_cache_address_hash_check" CHECK ((address_hash ~ '^[0-9a-f]{64}$'::text));

alter table public."goodies_geocode_cache" add constraint "goodies_geocode_cache_latitude_check" CHECK (((latitude >= ('-90'::integer)::double precision) AND (latitude <= (90)::double precision)));

alter table public."goodies_geocode_cache" add constraint "goodies_geocode_cache_longitude_check" CHECK (((longitude >= ('-180'::integer)::double precision) AND (longitude <= (180)::double precision)));

alter table public."goodies_geocode_cache" add constraint "goodies_geocode_cache_pkey" PRIMARY KEY (address_hash);

alter table public."goodies_route_cache" add constraint "goodies_route_cache_address_hash_check" CHECK ((address_hash ~ '^[0-9a-f]{64}$'::text));

alter table public."goodies_route_cache" add constraint "goodies_route_cache_distance_m_check" CHECK ((distance_m > 0));

alter table public."goodies_route_cache" add constraint "goodies_route_cache_origin_latitude_check" CHECK (((origin_latitude >= ('-90'::integer)::double precision) AND (origin_latitude <= (90)::double precision)));

alter table public."goodies_route_cache" add constraint "goodies_route_cache_origin_longitude_check" CHECK (((origin_longitude >= ('-180'::integer)::double precision) AND (origin_longitude <= (180)::double precision)));

alter table public."goodies_route_cache" add constraint "goodies_route_cache_pkey" PRIMARY KEY (store_id, address_hash);

alter table public."goodies_store_schedules" add constraint "goodies_store_schedules_business_id_key" UNIQUE (business_id);

alter table public."goodies_store_schedules" add constraint "goodies_store_schedules_delivery_base_fee_check" CHECK (((delivery_base_fee >= (0)::numeric) AND (delivery_base_fee <= (10000)::numeric)));

alter table public."goodies_store_schedules" add constraint "goodies_store_schedules_delivery_fee_check" CHECK (((delivery_fee >= (0)::numeric) AND (delivery_fee <= (10000)::numeric)));

alter table public."goodies_store_schedules" add constraint "goodies_store_schedules_delivery_max_distance_km_check" CHECK (((delivery_max_distance_km IS NULL) OR ((delivery_max_distance_km > (0)::numeric) AND (delivery_max_distance_km <= (500)::numeric))));

alter table public."goodies_store_schedules" add constraint "goodies_store_schedules_delivery_max_fee_check" CHECK (((delivery_max_fee IS NULL) OR ((delivery_max_fee >= (0)::numeric) AND (delivery_max_fee <= (10000)::numeric))));

alter table public."goodies_store_schedules" add constraint "goodies_store_schedules_delivery_min_fee_check" CHECK (((delivery_min_fee >= (0)::numeric) AND (delivery_min_fee <= (10000)::numeric)));

alter table public."goodies_store_schedules" add constraint "goodies_store_schedules_delivery_per_km_fee_check" CHECK (((delivery_per_km_fee >= (0)::numeric) AND (delivery_per_km_fee <= (10000)::numeric)));

alter table public."goodies_store_schedules" add constraint "goodies_store_schedules_delivery_pricing_mode_check" CHECK ((delivery_pricing_mode = ANY (ARRAY['fixed'::text, 'distance'::text])));

alter table public."goodies_store_schedules" add constraint "goodies_store_schedules_eta_max_check" CHECK (((eta_max >= 1) AND (eta_max <= 1440)));

alter table public."goodies_store_schedules" add constraint "goodies_store_schedules_eta_min_check" CHECK (((eta_min >= 1) AND (eta_min <= 1440)));

alter table public."goodies_store_schedules" add constraint "goodies_store_schedules_min_order_check" CHECK (((min_order >= (0)::numeric) AND (min_order <= (100000)::numeric)));

alter table public."goodies_store_schedules" add constraint "goodies_store_schedules_pkey" PRIMARY KEY (id);

alter table public."goodies_store_schedules" add constraint "goodies_store_schedules_scheduled_order_start_minutes_check" CHECK (((scheduled_order_start_minutes >= 0) AND (scheduled_order_start_minutes <= 1440)));

alter table public."goodies_store_schedules" add constraint "goodies_store_schedules_store_id_key" UNIQUE (store_id);

alter table public."goodies_store_schedules" add constraint "goodies_store_schedules_store_latitude_range" CHECK (((store_latitude IS NULL) OR ((store_latitude >= ('-90'::integer)::double precision) AND (store_latitude <= (90)::double precision))));

alter table public."goodies_store_schedules" add constraint "goodies_store_schedules_store_longitude_range" CHECK (((store_longitude IS NULL) OR ((store_longitude >= ('-180'::integer)::double precision) AND (store_longitude <= (180)::double precision))));

alter table public."goodies_card_refund_queue" add constraint "goodies_card_refund_queue_attempts_check" CHECK ((attempts >= 0));

alter table public."goodies_card_refund_queue" add constraint "goodies_card_refund_queue_order_id_key" UNIQUE (order_id);

alter table public."goodies_card_refund_queue" add constraint "goodies_card_refund_queue_pkey" PRIMARY KEY (id);

alter table public."goodies_card_refund_queue" add constraint "goodies_card_refund_queue_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text, 'cancelled'::text, 'dead_letter'::text])));

alter table public."goodies_promotions" add constraint "goodies_promotions_check" CHECK (((expires_at IS NULL) OR (starts_at IS NULL) OR (expires_at > starts_at)));

alter table public."goodies_promotions" add constraint "goodies_promotions_code_check" CHECK (((code = upper(TRIM(BOTH FROM code))) AND ((length(code) >= 3) AND (length(code) <= 40))));

alter table public."goodies_promotions" add constraint "goodies_promotions_code_key" UNIQUE (code);

alter table public."goodies_promotions" add constraint "goodies_promotions_discount_type_check" CHECK ((discount_type = ANY (ARRAY['percent'::text, 'free_delivery'::text])));

alter table public."goodies_promotions" add constraint "goodies_promotions_discount_value_check" CHECK (((discount_value >= (0)::numeric) AND (discount_value <= (100)::numeric)));

alter table public."goodies_promotions" add constraint "goodies_promotions_max_redemptions_check" CHECK (((max_redemptions IS NULL) OR (max_redemptions > 0)));

alter table public."goodies_promotions" add constraint "goodies_promotions_min_subtotal_check" CHECK ((min_subtotal >= (0)::numeric));

alter table public."goodies_promotions" add constraint "goodies_promotions_pkey" PRIMARY KEY (id);

alter table public."goodies_promotions" add constraint "goodies_promotions_redemption_count_check" CHECK ((redemption_count >= 0));

alter table public."wallet_transactions" add constraint "wallet_transactions_direction_check" CHECK ((direction = ANY (ARRAY['credit'::text, 'debit'::text])));

alter table public."wallet_transactions" add constraint "wallet_transactions_original_currency_check" CHECK (((original_currency IS NULL) OR (original_currency = ANY (ARRAY['USD'::text, 'HTG'::text, 'DOP'::text]))));

alter table public."wallet_transactions" add constraint "wallet_transactions_pkey" PRIMARY KEY (id);

alter table public."wallet_transactions" add constraint "wallet_transactions_wallet_currency_check" CHECK (((wallet_currency IS NULL) OR (wallet_currency = ANY (ARRAY['USD'::text, 'HTG'::text, 'DOP'::text]))));

alter table public."goodies_builder_configs" add constraint "goodies_builder_configs_builder_id_check" CHECK (((length(TRIM(BOTH FROM builder_id)) >= 1) AND (length(TRIM(BOTH FROM builder_id)) <= 120)));

alter table public."goodies_builder_configs" add constraint "goodies_builder_configs_business_id_builder_id_key" UNIQUE (business_id, builder_id);

alter table public."goodies_builder_configs" add constraint "goodies_builder_configs_config_check" CHECK ((jsonb_typeof(config) = 'object'::text));

alter table public."goodies_builder_configs" add constraint "goodies_builder_configs_pkey" PRIMARY KEY (id);

alter table public."goodies_ingredient_requests" add constraint "goodies_ingredient_requests_builder_check" CHECK ((builder ~ '^[a-z0-9_-]{1,40}$'::text));

alter table public."goodies_ingredient_requests" add constraint "goodies_ingredient_requests_name_check" CHECK (((char_length(btrim(name)) >= 2) AND (char_length(btrim(name)) <= 80)));

alter table public."goodies_ingredient_requests" add constraint "goodies_ingredient_requests_note_check" CHECK (((note IS NULL) OR (char_length(note) <= 500)));

alter table public."goodies_ingredient_requests" add constraint "goodies_ingredient_requests_pkey" PRIMARY KEY (id);

alter table public."goodies_ingredient_requests" add constraint "goodies_ingredient_requests_review_note_check" CHECK (((review_note IS NULL) OR (char_length(review_note) <= 500)));

alter table public."goodies_ingredient_requests" add constraint "goodies_ingredient_requests_role_check" CHECK (((role IS NULL) OR (char_length(role) <= 80)));

alter table public."goodies_ingredient_requests" add constraint "goodies_ingredient_requests_status_check" CHECK ((status = ANY (ARRAY['submitted'::text, 'approved'::text, 'denied'::text, 'needs_info'::text])));

alter table public."goodies_delivery_assignments" add constraint "goodies_assignment_lat_check" CHECK (((latitude IS NULL) OR ((latitude >= ('-90'::integer)::double precision) AND (latitude <= (90)::double precision))));

alter table public."goodies_delivery_assignments" add constraint "goodies_assignment_lng_check" CHECK (((longitude IS NULL) OR ((longitude >= ('-180'::integer)::double precision) AND (longitude <= (180)::double precision))));

alter table public."goodies_delivery_assignments" add constraint "goodies_delivery_assignments_order_id_key" UNIQUE (order_id);

alter table public."goodies_delivery_assignments" add constraint "goodies_delivery_assignments_pkey" PRIMARY KEY (id);

alter table public."goodies_delivery_assignments" add constraint "goodies_delivery_assignments_status_check" CHECK ((status = ANY (ARRAY['offered'::text, 'accepted'::text, 'declined'::text, 'expired'::text, 'picked_up'::text, 'delivered'::text, 'cancelled'::text])));

alter table public."goodies_courier_presence" add constraint "goodies_courier_presence_accuracy_check" CHECK (((accuracy_m IS NULL) OR ((accuracy_m >= (0)::double precision) AND (accuracy_m <= (10000)::double precision))));

alter table public."goodies_courier_presence" add constraint "goodies_courier_presence_lat_check" CHECK (((latitude IS NULL) OR ((latitude >= ('-90'::integer)::double precision) AND (latitude <= (90)::double precision))));

alter table public."goodies_courier_presence" add constraint "goodies_courier_presence_lng_check" CHECK (((longitude IS NULL) OR ((longitude >= ('-180'::integer)::double precision) AND (longitude <= (180)::double precision))));

alter table public."goodies_courier_presence" add constraint "goodies_courier_presence_pkey" PRIMARY KEY (courier_id);

alter table public."goodies_courier_roster" add constraint "goodies_courier_roster_pkey" PRIMARY KEY (courier_id);

alter table public."goodies_library_ingredients" add constraint "goodies_library_ingredients_builder_check" CHECK ((builder ~ '^[a-z0-9_-]{1,40}$'::text));

alter table public."goodies_library_ingredients" add constraint "goodies_library_ingredients_name_check" CHECK (((char_length(btrim(name)) >= 2) AND (char_length(btrim(name)) <= 80)));

alter table public."goodies_library_ingredients" add constraint "goodies_library_ingredients_pkey" PRIMARY KEY (id);

alter table public."goodies_library_ingredients" add constraint "goodies_library_ingredients_role_check" CHECK (((role IS NULL) OR (char_length(role) <= 80)));

alter table public."goodies_products" add constraint "goodies_products_aisle_check" CHECK (((aisle IS NULL) OR (char_length(aisle) <= 60)));

alter table public."goodies_products" add constraint "goodies_products_description_check" CHECK (((description IS NULL) OR (char_length(description) <= 500)));

alter table public."goodies_products" add constraint "goodies_products_emoji_check" CHECK ((char_length(emoji) <= 16));

alter table public."goodies_products" add constraint "goodies_products_name_check" CHECK (((char_length(TRIM(BOTH FROM name)) >= 1) AND (char_length(TRIM(BOTH FROM name)) <= 120)));

alter table public."goodies_products" add constraint "goodies_products_photo_url_check" CHECK (((photo_url IS NULL) OR (char_length(photo_url) <= 1000)));

alter table public."goodies_products" add constraint "goodies_products_photo_urls_limit" CHECK (((jsonb_typeof(photo_urls) = 'array'::text) AND (jsonb_array_length(photo_urls) <= 5)));

alter table public."goodies_products" add constraint "goodies_products_pkey" PRIMARY KEY (id);

alter table public."goodies_products" add constraint "goodies_products_price_check" CHECK (((price >= (0)::numeric) AND (price <= (100000)::numeric)));

alter table public."goodies_products" add constraint "goodies_products_restriction_check" CHECK ((restriction = ANY (ARRAY['none'::text, 'otc'::text, 'alcohol'::text])));

alter table public."goodies_products" add constraint "goodies_products_review_status_check" CHECK ((review_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])));

alter table public."goodies_products" add constraint "goodies_products_stock_check" CHECK (((stock >= 0) AND (stock <= 100000)));

alter table public."goodies_delivery_quotes" add constraint "goodies_delivery_quotes_distance_m_check" CHECK ((distance_m > 0));

alter table public."goodies_delivery_quotes" add constraint "goodies_delivery_quotes_fee_check" CHECK ((fee >= (0)::numeric));

alter table public."goodies_delivery_quotes" add constraint "goodies_delivery_quotes_pkey" PRIMARY KEY (id);

alter table public."goodies_ingredient_rules" add constraint "goodies_ingredient_rules_id_check" CHECK (id);

alter table public."goodies_ingredient_rules" add constraint "goodies_ingredient_rules_pkey" PRIMARY KEY (id);

alter table public."goodies_ingredient_rules" add constraint "goodies_ingredient_rules_rules_check" CHECK (((char_length(rules) >= 20) AND (char_length(rules) <= 2000)));

alter table public."goodies_card_checkout_attempts" add constraint "goodies_card_checkout_attempts_fingerprint_check" CHECK (((request_fingerprint IS NULL) OR (length(request_fingerprint) = 32)));

alter table public."goodies_card_checkout_attempts" add constraint "goodies_card_checkout_attempts_idempotency_key_check" CHECK (((length(idempotency_key) >= 8) AND (length(idempotency_key) <= 200)));

alter table public."goodies_card_checkout_attempts" add constraint "goodies_card_checkout_attempts_pkey" PRIMARY KEY (id);

alter table public."goodies_card_checkout_attempts" add constraint "goodies_card_checkout_attempts_user_id_idempotency_key_key" UNIQUE (user_id, idempotency_key);

CREATE TRIGGER goodies_card_refund_dispute_sync AFTER UPDATE OF payment_dispute_status ON public.goodies_orders FOR EACH ROW EXECUTE FUNCTION sync_goodies_card_refund_queue_dispute();

CREATE TRIGGER goodies_card_refund_enqueue AFTER INSERT OR UPDATE OF status, payment_method, payment_status, payment_provider_ref ON public.goodies_orders FOR EACH ROW EXECUTE FUNCTION enqueue_goodies_card_refund();

CREATE TRIGGER goodies_card_refund_queue_on_terminal_status AFTER UPDATE OF status ON public.goodies_orders FOR EACH ROW EXECUTE FUNCTION queue_goodies_card_refund_on_terminal_status();

CREATE TRIGGER goodies_enforce_store_opening_hours BEFORE INSERT OR UPDATE OF store_id, order_type, scheduled_for ON public.goodies_orders FOR EACH ROW EXECUTE FUNCTION goodies_enforce_store_opening_hours();

CREATE TRIGGER goodies_order_after_insert AFTER INSERT ON public.goodies_orders FOR EACH ROW EXECUTE FUNCTION goodies_order_after_insert();

CREATE TRIGGER goodies_order_notify_store_on_payment_confirmed AFTER UPDATE OF status, payment_status ON public.goodies_orders FOR EACH ROW EXECUTE FUNCTION goodies_notify_store_on_payment_confirmed();

CREATE TRIGGER goodies_orders_capture_delivery_coordinates BEFORE INSERT ON public.goodies_orders FOR EACH ROW EXECUTE FUNCTION goodies_orders_capture_delivery_coordinates();

CREATE TRIGGER goodies_orders_cash_policy_guard BEFORE INSERT ON public.goodies_orders FOR EACH ROW EXECUTE FUNCTION goodies_require_cash_policy();

CREATE TRIGGER goodies_orders_commission_snapshot_guard BEFORE INSERT OR UPDATE ON public.goodies_orders FOR EACH ROW EXECUTE FUNCTION goodies_set_order_commission_snapshot();

CREATE TRIGGER goodies_orders_set_ready_at BEFORE INSERT OR UPDATE OF status ON public.goodies_orders FOR EACH ROW EXECUTE FUNCTION private.goodies_orders_set_ready_at();

CREATE TRIGGER goodies_ingredient_request_notifications AFTER INSERT OR UPDATE OF status ON public.goodies_ingredient_requests FOR EACH ROW EXECUTE FUNCTION goodies_ingredient_request_notifications();

CREATE TRIGGER goodies_delivery_offer_expiry BEFORE INSERT OR UPDATE OF status, offered_at, expires_at ON public.goodies_delivery_assignments FOR EACH ROW EXECUTE FUNCTION goodies_set_delivery_offer_expiry();

CREATE TRIGGER goodies_products_enforce_update_moderation BEFORE UPDATE ON public.goodies_products FOR EACH ROW EXECUTE FUNCTION goodies_products_enforce_update_moderation();

CREATE TRIGGER goodies_products_new_vendor_review BEFORE INSERT ON public.goodies_products FOR EACH ROW EXECUTE FUNCTION goodies_products_default_pending_review();

CREATE TRIGGER goodies_products_validate_photo_url BEFORE INSERT OR UPDATE ON public.goodies_products FOR EACH ROW EXECUTE FUNCTION goodies_products_validate_photo_url();

set check_function_bodies=on;

-- Effective execute privileges captured from the production schema.
revoke all on all functions in schema public,private from public,anon,authenticated,service_role;
grant execute on function public.goodies_products_validate_photo_url() to service_role;
grant execute on function public.goodies_auto_complete_self_deliveries() to service_role;
grant execute on function public.goodies_save_store_setup(p_business uuid, p_category text, p_kind text, p_min_order numeric, p_delivery_fee numeric, p_eta_min integer, p_eta_max integer, p_promo text, p_names jsonb, p_delivery boolean, p_pickup boolean, p_delivery_pricing_mode text, p_delivery_base_fee numeric, p_delivery_per_km_fee numeric, p_delivery_min_fee numeric, p_delivery_max_fee numeric, p_delivery_max_distance_km numeric, p_address text, p_city text, p_country text, p_accept_scheduled_orders boolean, p_scheduled_order_start_minutes integer) to authenticated;
grant execute on function public.goodies_save_store_setup(p_business uuid, p_category text, p_kind text, p_min_order numeric, p_delivery_fee numeric, p_eta_min integer, p_eta_max integer, p_promo text, p_names jsonb, p_delivery boolean, p_pickup boolean, p_delivery_pricing_mode text, p_delivery_base_fee numeric, p_delivery_per_km_fee numeric, p_delivery_min_fee numeric, p_delivery_max_fee numeric, p_delivery_max_distance_km numeric, p_address text, p_city text, p_country text, p_accept_scheduled_orders boolean, p_scheduled_order_start_minutes integer) to service_role;
grant execute on function public.goodies_save_store_setup(p_business uuid, p_category text, p_kind text, p_min_order numeric, p_delivery_fee numeric, p_eta_min integer, p_eta_max integer, p_promo text, p_names jsonb, p_delivery boolean, p_pickup boolean, p_delivery_pricing_mode text, p_delivery_base_fee numeric, p_delivery_per_km_fee numeric, p_delivery_min_fee numeric, p_delivery_max_fee numeric, p_delivery_max_distance_km numeric, p_address text, p_city text, p_country text) to authenticated;
grant execute on function public.goodies_save_store_setup(p_business uuid, p_category text, p_kind text, p_min_order numeric, p_delivery_fee numeric, p_eta_min integer, p_eta_max integer, p_promo text, p_names jsonb, p_delivery boolean, p_pickup boolean, p_delivery_pricing_mode text, p_delivery_base_fee numeric, p_delivery_per_km_fee numeric, p_delivery_min_fee numeric, p_delivery_max_fee numeric, p_delivery_max_distance_km numeric, p_address text, p_city text, p_country text) to service_role;
grant execute on function public.goodies_set_delivery_offer_expiry() to anon;
grant execute on function public.goodies_set_delivery_offer_expiry() to authenticated;
grant execute on function public.goodies_set_delivery_offer_expiry() to service_role;
grant execute on function public.expire_goodies_courier_offers() to service_role;
grant execute on function public.goodies_courier_respond_assignment(p_order_id uuid, p_accept boolean) to authenticated;
grant execute on function public.goodies_courier_respond_assignment(p_order_id uuid, p_accept boolean) to service_role;
grant execute on function public.sync_goodies_card_refund_queue_dispute() to service_role;
grant execute on function public.finish_goodies_card_refund(p_queue_id uuid, p_lease_token uuid, p_status text, p_refund_id text, p_error text) to service_role;
grant execute on function public.goodies_save_store_setup(p_business uuid, p_category text, p_kind text, p_min_order numeric, p_delivery_fee numeric, p_eta_min integer, p_eta_max integer, p_promo text, p_names jsonb, p_delivery boolean, p_pickup boolean, p_delivery_pricing_mode text, p_delivery_base_fee numeric, p_delivery_per_km_fee numeric, p_delivery_min_fee numeric, p_delivery_max_fee numeric, p_delivery_max_distance_km numeric, p_address text, p_city text, p_country text, p_accept_scheduled_orders boolean, p_scheduled_order_start_time text, p_scheduled_order_timezone text, p_store_name text) to authenticated;
grant execute on function public.goodies_save_store_setup(p_business uuid, p_category text, p_kind text, p_min_order numeric, p_delivery_fee numeric, p_eta_min integer, p_eta_max integer, p_promo text, p_names jsonb, p_delivery boolean, p_pickup boolean, p_delivery_pricing_mode text, p_delivery_base_fee numeric, p_delivery_per_km_fee numeric, p_delivery_min_fee numeric, p_delivery_max_fee numeric, p_delivery_max_distance_km numeric, p_address text, p_city text, p_country text, p_accept_scheduled_orders boolean, p_scheduled_order_start_time text, p_scheduled_order_timezone text, p_store_name text) to service_role;
grant execute on function public.goodies_notify_store_on_payment_confirmed() to service_role;
grant execute on function public.goodies_save_store_thumbnail(p_business uuid, p_thumbnail_url text) to authenticated;
grant execute on function public.goodies_save_store_thumbnail(p_business uuid, p_thumbnail_url text) to service_role;
grant execute on function public.place_goodies_card_order_once(p_idempotency_key text, p_store_id text, p_order_type text, p_scheduled_for timestamp with time zone, p_address jsonb, p_contact_phone text, p_items jsonb, p_subtotal numeric, p_delivery_fee numeric, p_service_fee numeric, p_discount numeric, p_tip numeric, p_total numeric, p_notes text, p_promo_code text) to authenticated;
grant execute on function public.place_goodies_card_order_once(p_idempotency_key text, p_store_id text, p_order_type text, p_scheduled_for timestamp with time zone, p_address jsonb, p_contact_phone text, p_items jsonb, p_subtotal numeric, p_delivery_fee numeric, p_service_fee numeric, p_discount numeric, p_tip numeric, p_total numeric, p_notes text, p_promo_code text) to service_role;
grant execute on function public.goodies_save_store_setup(p_business uuid, p_category text, p_kind text, p_min_order numeric, p_delivery_fee numeric, p_eta_min integer, p_eta_max integer, p_promo text, p_names jsonb, p_delivery boolean, p_pickup boolean, p_delivery_pricing_mode text, p_delivery_base_fee numeric, p_delivery_per_km_fee numeric, p_delivery_min_fee numeric, p_delivery_max_fee numeric, p_delivery_max_distance_km numeric, p_address text, p_city text, p_country text, p_accept_scheduled_orders boolean, p_scheduled_order_start_time text, p_scheduled_order_timezone text) to authenticated;
grant execute on function public.goodies_save_store_setup(p_business uuid, p_category text, p_kind text, p_min_order numeric, p_delivery_fee numeric, p_eta_min integer, p_eta_max integer, p_promo text, p_names jsonb, p_delivery boolean, p_pickup boolean, p_delivery_pricing_mode text, p_delivery_base_fee numeric, p_delivery_per_km_fee numeric, p_delivery_min_fee numeric, p_delivery_max_fee numeric, p_delivery_max_distance_km numeric, p_address text, p_city text, p_country text, p_accept_scheduled_orders boolean, p_scheduled_order_start_time text, p_scheduled_order_timezone text) to service_role;
grant execute on function public.goodies_save_store_setup(p_business uuid, p_category text, p_kind text, p_min_order numeric, p_delivery_fee numeric, p_eta_min integer, p_eta_max integer, p_promo text, p_names jsonb, p_delivery boolean, p_pickup boolean, p_delivery_pricing_mode text, p_delivery_base_fee numeric, p_delivery_per_km_fee numeric, p_delivery_min_fee numeric, p_delivery_max_fee numeric, p_delivery_max_distance_km numeric, p_address text, p_city text, p_country text, p_accept_scheduled_orders boolean, p_scheduled_order_start_time text) to authenticated;
grant execute on function public.goodies_save_store_setup(p_business uuid, p_category text, p_kind text, p_min_order numeric, p_delivery_fee numeric, p_eta_min integer, p_eta_max integer, p_promo text, p_names jsonb, p_delivery boolean, p_pickup boolean, p_delivery_pricing_mode text, p_delivery_base_fee numeric, p_delivery_per_km_fee numeric, p_delivery_min_fee numeric, p_delivery_max_fee numeric, p_delivery_max_distance_km numeric, p_address text, p_city text, p_country text, p_accept_scheduled_orders boolean, p_scheduled_order_start_time text) to service_role;
grant execute on function public.pause_goodies_card_refund_for_dispute(p_queue_id uuid, p_lease_token uuid, p_error text) to service_role;
grant execute on function public.wantiss_admin_list_goodies_builder_configs() to authenticated;
grant execute on function public.wantiss_admin_list_goodies_builder_configs() to service_role;
grant execute on function public.monitor_goodies_card_refund_worker() to service_role;
grant execute on function public.wantiss_admin_requeue_goodies_card_refund(p_queue_id uuid, p_reason text) to authenticated;
grant execute on function public.wantiss_admin_requeue_goodies_card_refund(p_queue_id uuid, p_reason text) to service_role;
grant execute on function public.wantiss_admin_save_goodies_builder_config(p_business_id uuid, p_builder_id text, p_config jsonb, p_enabled boolean) to authenticated;
grant execute on function public.wantiss_admin_save_goodies_builder_config(p_business_id uuid, p_builder_id text, p_config jsonb, p_enabled boolean) to service_role;
grant execute on function public.wantiss_admin_list_goodies_builder_businesses() to authenticated;
grant execute on function public.wantiss_admin_list_goodies_builder_businesses() to service_role;
grant execute on function public.expire_goodies_card_auth(p_order_id uuid, p_payment_intent_id text, p_stripe_status text) to service_role;
grant execute on function public.goodies_get_ingredient_rules() to authenticated;
grant execute on function public.goodies_get_ingredient_rules() to service_role;
grant execute on function public.goodies_list_library_ingredients() to authenticated;
grant execute on function public.goodies_list_library_ingredients() to service_role;
grant execute on function public.goodies_submit_ingredient_request(p_business uuid, p_name text, p_builder text, p_role text, p_note text, p_image_path text) to authenticated;
grant execute on function public.goodies_submit_ingredient_request(p_business uuid, p_name text, p_builder text, p_role text, p_note text, p_image_path text) to service_role;
grant execute on function public.goodies_list_ingredient_requests(p_business uuid) to authenticated;
grant execute on function public.goodies_list_ingredient_requests(p_business uuid) to service_role;
grant execute on function public.monitor_goodies_card_auth_expiry_worker() to service_role;
grant execute on function public.goodies_group_join(p_invite_code text) to authenticated;
grant execute on function public.goodies_group_join(p_invite_code text) to service_role;
grant execute on function public.get_my_goodies_access_status() to authenticated;
grant execute on function public.get_my_goodies_access_status() to service_role;
grant execute on function public.goodies_group_close(p_group_id uuid) to authenticated;
grant execute on function public.goodies_group_close(p_group_id uuid) to service_role;
grant execute on function public.goodies_group_add_item(p_group_id uuid, p_product_id uuid, p_line_key text, p_quantity integer, p_options jsonb, p_note text) to authenticated;
grant execute on function public.goodies_group_add_item(p_group_id uuid, p_product_id uuid, p_line_key text, p_quantity integer, p_options jsonb, p_note text) to service_role;
grant execute on function public.goodies_group_remove_item(p_item_id uuid) to authenticated;
grant execute on function public.goodies_group_remove_item(p_item_id uuid) to service_role;
grant execute on function private.goodies_customer_can_access() to anon;
grant execute on function private.goodies_customer_can_access() to authenticated;
grant execute on function private.goodies_group_is_member(p_group_id uuid) to authenticated;
grant execute on function public.goodies_save_store_setup(p_business uuid, p_category text, p_kind text, p_min_order numeric, p_delivery_fee numeric, p_eta_min integer, p_eta_max integer, p_promo text, p_names jsonb, p_delivery boolean, p_pickup boolean, p_delivery_pricing_mode text, p_delivery_base_fee numeric, p_delivery_per_km_fee numeric, p_delivery_min_fee numeric, p_delivery_max_fee numeric, p_delivery_max_distance_km numeric) to authenticated;
grant execute on function public.goodies_save_store_setup(p_business uuid, p_category text, p_kind text, p_min_order numeric, p_delivery_fee numeric, p_eta_min integer, p_eta_max integer, p_promo text, p_names jsonb, p_delivery boolean, p_pickup boolean, p_delivery_pricing_mode text, p_delivery_base_fee numeric, p_delivery_per_km_fee numeric, p_delivery_min_fee numeric, p_delivery_max_fee numeric, p_delivery_max_distance_km numeric) to service_role;
grant execute on function public.goodies_validate_message() to service_role;
grant execute on function public.goodies_set_courier_availability(p_is_available boolean, p_accepts_cash_on_delivery boolean) to authenticated;
grant execute on function public.goodies_set_courier_availability(p_is_available boolean, p_accepts_cash_on_delivery boolean) to service_role;
grant execute on function public.goodies_courier_update_delivery_status(p_order_id uuid, p_status text) to authenticated;
grant execute on function public.goodies_courier_update_delivery_status(p_order_id uuid, p_status text) to service_role;
grant execute on function public.goodies_cash_on_delivery_available(p_store_id text) to authenticated;
grant execute on function public.goodies_cash_on_delivery_available(p_store_id text) to service_role;
grant execute on function public.goodies_sync_store_from_business(p_business uuid) to service_role;
grant execute on function public.goodies_update_conversation_summary() to service_role;
grant execute on function public.goodies_set_store_cash_policy(p_store_id text, p_enabled boolean) to authenticated;
grant execute on function public.goodies_set_store_cash_policy(p_store_id text, p_enabled boolean) to service_role;
grant execute on function public.goodies_orders_capture_delivery_coordinates() to service_role;
grant execute on function public.goodies_admin_assert() to service_role;
grant execute on function public.goodies_admin_dashboard() to authenticated;
grant execute on function public.goodies_admin_dashboard() to service_role;
grant execute on function public.goodies_admin_review_product(p_product_id uuid, p_status text, p_note text) to authenticated;
grant execute on function public.goodies_admin_review_product(p_product_id uuid, p_status text, p_note text) to service_role;
grant execute on function public.goodies_admin_analytics() to authenticated;
grant execute on function public.goodies_admin_analytics() to service_role;
grant execute on function public.goodies_admin_update_fee_policy(p_service_fee numeric, p_first_order_free boolean, p_wallet_enabled boolean, p_card_enabled boolean, p_cash_enabled boolean, p_tips numeric[]) to authenticated;
grant execute on function public.goodies_admin_update_fee_policy(p_service_fee numeric, p_first_order_free boolean, p_wallet_enabled boolean, p_card_enabled boolean, p_cash_enabled boolean, p_tips numeric[]) to service_role;
grant execute on function public.goodies_admin_set_merchant_status(p_business_id uuid, p_live boolean) to authenticated;
grant execute on function public.goodies_admin_set_merchant_status(p_business_id uuid, p_live boolean) to service_role;
grant execute on function public.goodies_admin_set_merchant_verification(p_business_id uuid, p_status text) to service_role;
grant execute on function public.goodies_admin_cancel_order(p_order_id uuid, p_reason text) to authenticated;
grant execute on function public.goodies_admin_cancel_order(p_order_id uuid, p_reason text) to service_role;
grant execute on function public.goodies_require_cash_policy() to service_role;
grant execute on function public.goodies_admin_list_courier_candidates() to authenticated;
grant execute on function public.goodies_admin_list_courier_candidates() to service_role;
grant execute on function public.goodies_admin_add_courier(p_courier_id uuid) to authenticated;
grant execute on function public.goodies_admin_add_courier(p_courier_id uuid) to service_role;
grant execute on function public.goodies_admin_remove_courier(p_courier_id uuid) to authenticated;
grant execute on function public.goodies_admin_remove_courier(p_courier_id uuid) to service_role;
grant execute on function private.goodies_merchant_can_operate(p_business_id uuid) to anon;
grant execute on function private.goodies_merchant_can_operate(p_business_id uuid) to authenticated;
grant execute on function private.goodies_merchant_can_operate(p_business_id uuid) to service_role;
grant execute on function public.goodies_admin_update_delivery_surcharge_policy(p_enabled boolean, p_additional_store_fee numeric, p_extra_distance_per_km numeric) to authenticated;
grant execute on function public.goodies_admin_update_delivery_surcharge_policy(p_enabled boolean, p_additional_store_fee numeric, p_extra_distance_per_km numeric) to service_role;
grant execute on function public.goodies_set_store_live(p_business uuid, p_live boolean) to authenticated;
grant execute on function public.goodies_set_store_live(p_business uuid, p_live boolean) to service_role;
grant execute on function public.wantiss_has_permission(p_permission text, p_min_level text) to authenticated;
grant execute on function public.wantiss_has_permission(p_permission text, p_min_level text) to service_role;
grant execute on function public.goodies_save_store_cover(p_business uuid, p_cover_url text) to authenticated;
grant execute on function public.goodies_save_store_cover(p_business uuid, p_cover_url text) to service_role;
grant execute on function public.goodies_products_default_pending_review() to anon;
grant execute on function public.goodies_products_default_pending_review() to authenticated;
grant execute on function public.goodies_products_default_pending_review() to service_role;
grant execute on function public.goodies_ingredient_request_notifications() to service_role;
grant execute on function public.goodies_save_store_location(p_business uuid, p_latitude double precision, p_longitude double precision) to authenticated;
grant execute on function public.goodies_save_store_location(p_business uuid, p_latitude double precision, p_longitude double precision) to service_role;
grant execute on function public.goodies_courier_update_location(p_order_id uuid, p_latitude double precision, p_longitude double precision, p_accuracy_m double precision, p_heading double precision, p_speed_mps double precision) to authenticated;
grant execute on function public.goodies_courier_update_location(p_order_id uuid, p_latitude double precision, p_longitude double precision, p_accuracy_m double precision, p_heading double precision, p_speed_mps double precision) to service_role;
grant execute on function public.goodies_list_dispatch_couriers(p_order_id uuid) to authenticated;
grant execute on function public.goodies_list_dispatch_couriers(p_order_id uuid) to service_role;
grant execute on function public.goodies_assign_courier(p_order_id uuid, p_courier_id uuid) to authenticated;
grant execute on function public.goodies_assign_courier(p_order_id uuid, p_courier_id uuid) to service_role;
grant execute on function public.goodies_cash_global_enabled() to authenticated;
grant execute on function public.goodies_cash_global_enabled() to service_role;
grant execute on function public.goodies_group_create(p_store_id text) to authenticated;
grant execute on function public.goodies_group_create(p_store_id text) to service_role;
grant execute on function public.goodies_admin_list_delivery_reports() to authenticated;
grant execute on function public.goodies_admin_list_delivery_reports() to service_role;
grant execute on function public.goodies_products_enforce_update_moderation() to service_role;
grant execute on function public.goodies_group_order_join(p_invite_code text) to authenticated;
grant execute on function public.goodies_group_order_join(p_invite_code text) to service_role;
grant execute on function public.goodies_group_order_list_members(p_group_id uuid) to authenticated;
grant execute on function public.goodies_group_order_list_members(p_group_id uuid) to service_role;
grant execute on function public.goodies_set_order_commission_snapshot() to service_role;
grant execute on function public.goodies_group_order_remove_item(p_group_id uuid, p_line_key text) to authenticated;
grant execute on function public.goodies_group_order_remove_item(p_group_id uuid, p_line_key text) to service_role;
grant execute on function public.place_goodies_order(p_store_id text, p_order_type text, p_scheduled_for timestamp with time zone, p_address jsonb, p_contact_phone text, p_items jsonb, p_subtotal numeric, p_delivery_fee numeric, p_service_fee numeric, p_discount numeric, p_tip numeric, p_total numeric, p_notes text, p_promo_code text) to service_role;
grant execute on function public.place_goodies_order_with_payment_once(p_idempotency_key text, p_payment_method text, p_store_id text, p_order_type text, p_scheduled_for timestamp with time zone, p_address jsonb, p_contact_phone text, p_items jsonb, p_subtotal numeric, p_delivery_fee numeric, p_service_fee numeric, p_discount numeric, p_tip numeric, p_total numeric, p_notes text, p_promo_code text) to authenticated;
grant execute on function public.place_goodies_order_with_payment_once(p_idempotency_key text, p_payment_method text, p_store_id text, p_order_type text, p_scheduled_for timestamp with time zone, p_address jsonb, p_contact_phone text, p_items jsonb, p_subtotal numeric, p_delivery_fee numeric, p_service_fee numeric, p_discount numeric, p_tip numeric, p_total numeric, p_notes text, p_promo_code text) to service_role;
grant execute on function public.goodies_place_multi_order(p_idempotency_key text, p_payment_method text, p_order_type text, p_scheduled_for timestamp with time zone, p_address jsonb, p_contact_phone text, p_stops jsonb, p_service_fee numeric, p_tip numeric, p_notes text) to authenticated;
grant execute on function public.goodies_place_multi_order(p_idempotency_key text, p_payment_method text, p_order_type text, p_scheduled_for timestamp with time zone, p_address jsonb, p_contact_phone text, p_stops jsonb, p_service_fee numeric, p_tip numeric, p_notes text) to service_role;
grant execute on function public.goodies_tip_is_allowed(p_tip numeric, p_choices text) to service_role;
grant execute on function public.validate_goodies_standard_product_line(p_category text, p_base_price numeric, p_line jsonb, p_deals jsonb) to service_role;
grant execute on function public.goodies_save_builder_configs(p_business uuid, p_configs jsonb) to authenticated;
grant execute on function public.goodies_save_builder_configs(p_business uuid, p_configs jsonb) to service_role;
grant execute on function public.goodies_admin_update_max_stops(p_max_stops integer) to authenticated;
grant execute on function public.goodies_admin_update_max_stops(p_max_stops integer) to service_role;
grant execute on function public.goodies_admin_update_multi_store_policy(p_enabled boolean, p_additional_store_fee numeric, p_extra_distance_per_km numeric, p_max_stops integer) to authenticated;
grant execute on function public.goodies_admin_update_multi_store_policy(p_enabled boolean, p_additional_store_fee numeric, p_extra_distance_per_km numeric, p_max_stops integer) to service_role;
grant execute on function public.goodies_save_store_setup(p_business uuid, p_category text, p_kind text, p_min_order numeric, p_delivery_fee numeric, p_eta_min integer, p_eta_max integer, p_promo text, p_names jsonb, p_delivery boolean, p_pickup boolean) to authenticated;
grant execute on function public.goodies_save_store_setup(p_business uuid, p_category text, p_kind text, p_min_order numeric, p_delivery_fee numeric, p_eta_min integer, p_eta_max integer, p_promo text, p_names jsonb, p_delivery boolean, p_pickup boolean) to service_role;
grant execute on function public.goodies_order_notify(p_user_id uuid, p_title text, p_body text, p_order_id uuid, p_order_code text, p_status text, p_reason_code text) to service_role;
grant execute on function public.goodies_group_order_checkout_preview(p_group_id uuid) to authenticated;
grant execute on function public.goodies_group_order_checkout_preview(p_group_id uuid) to service_role;
grant execute on function public.accept_goodies_order(p_order_id uuid) to authenticated;
grant execute on function public.accept_goodies_order(p_order_id uuid) to service_role;
grant execute on function public.get_goodies_refund_worker_token() to service_role;
grant execute on function public.goodies_group_order_end(p_group_id uuid) to authenticated;
grant execute on function public.goodies_group_order_end(p_group_id uuid) to service_role;
grant execute on function public.process_goodies_card_payment_event(p_order_id uuid, p_payment_intent_id text, p_event_state text, p_amount_cents bigint, p_currency text, p_refunded_amount_cents bigint, p_event_created bigint) to service_role;
grant execute on function public.goodies_group_order_list_friends(p_group_id uuid) to authenticated;
grant execute on function public.goodies_group_order_list_friends(p_group_id uuid) to service_role;
grant execute on function public.goodies_hours_allow_order(p_hours jsonb, p_timezone text, p_at timestamp with time zone) to service_role;
grant execute on function public.get_goodies_stripe_webhook_event_status(p_event_id text) to service_role;
grant execute on function public.goodies_group_order_get_status(p_group_id uuid) to authenticated;
grant execute on function public.goodies_group_order_get_status(p_group_id uuid) to service_role;
grant execute on function public.goodies_group_order_create(p_store_id text) to authenticated;
grant execute on function public.goodies_group_order_create(p_store_id text) to service_role;
grant execute on function public.goodies_group_order_upsert_item(p_group_id uuid, p_product_id uuid, p_line_key text, p_quantity integer, p_options jsonb, p_note text) to authenticated;
grant execute on function public.goodies_group_order_upsert_item(p_group_id uuid, p_product_id uuid, p_line_key text, p_quantity integer, p_options jsonb, p_note text) to service_role;
grant execute on function private.goodies_orders_set_ready_at() to anon;
grant execute on function private.goodies_orders_set_ready_at() to authenticated;
grant execute on function private.goodies_orders_set_ready_at() to service_role;
grant execute on function public.goodies_group_order_checkout(p_idempotency_key text, p_group_id uuid, p_order_type text, p_scheduled_for timestamp with time zone, p_address jsonb, p_contact_phone text, p_tip numeric, p_notes text) to authenticated;
grant execute on function public.goodies_group_order_checkout(p_idempotency_key text, p_group_id uuid, p_order_type text, p_scheduled_for timestamp with time zone, p_address jsonb, p_contact_phone text, p_tip numeric, p_notes text) to service_role;
grant execute on function public.claim_goodies_card_refunds(p_limit integer) to service_role;
grant execute on function public.decline_goodies_order(p_order_id uuid, p_reason_code text, p_reason_detail text) to authenticated;
grant execute on function public.decline_goodies_order(p_order_id uuid, p_reason_code text, p_reason_detail text) to service_role;
grant execute on function public.place_goodies_order_with_wallet(p_store_id text, p_order_type text, p_scheduled_for timestamp with time zone, p_address jsonb, p_contact_phone text, p_items jsonb, p_subtotal numeric, p_delivery_fee numeric, p_service_fee numeric, p_discount numeric, p_tip numeric, p_total numeric, p_notes text, p_promo_code text) to service_role;
grant execute on function public.validate_goodies_builder_line(p_business_id uuid, p_store_id text, p_line jsonb) to service_role;
grant execute on function public.set_goodies_order_status(p_order_id uuid, p_status text) to authenticated;
grant execute on function public.set_goodies_order_status(p_order_id uuid, p_status text) to service_role;
grant execute on function public.refund_goodies_wallet_order(p_order_id uuid, p_reason text) to service_role;
grant execute on function public.expire_unaccepted_goodies_orders() to service_role;
grant execute on function public.goodies_group_order_checkout_estimate(p_group_id uuid, p_order_type text, p_address jsonb) to authenticated;
grant execute on function public.goodies_group_order_checkout_estimate(p_group_id uuid, p_order_type text, p_address jsonb) to service_role;
grant execute on function public.claim_goodies_stripe_webhook_event(p_event_id text, p_event_type text, p_livemode boolean) to service_role;
grant execute on function public.complete_goodies_stripe_webhook_event(p_event_id text, p_claim_token uuid) to service_role;
grant execute on function public.complete_goodies_card_refund(p_order_id uuid, p_refund_id text) to service_role;
grant execute on function public.validate_goodies_refund_worker_token(p_token text) to service_role;
grant execute on function public.fail_goodies_stripe_webhook_event(p_event_id text, p_claim_token uuid, p_error text) to service_role;
grant execute on function public.queue_goodies_card_refund_on_terminal_status() to service_role;
grant execute on function public.enqueue_goodies_card_refund() to service_role;
grant execute on function public.cancel_goodies_order_by_store(p_order_id uuid, p_reason_code text, p_reason_detail text) to authenticated;
grant execute on function public.cancel_goodies_order_by_store(p_order_id uuid, p_reason_code text, p_reason_detail text) to service_role;
grant execute on function public.goodies_order_after_insert() to service_role;
grant execute on function public.goodies_group_order_my_invites() to authenticated;
grant execute on function public.goodies_group_order_my_invites() to service_role;
grant execute on function public.goodies_group_order_decline_invite(p_group_id uuid) to authenticated;
grant execute on function public.goodies_group_order_decline_invite(p_group_id uuid) to service_role;
grant execute on function public.goodies_group_order_invite_friends(p_group_id uuid, p_user_ids uuid[]) to authenticated;
grant execute on function public.goodies_group_order_invite_friends(p_group_id uuid, p_user_ids uuid[]) to service_role;
grant execute on function public.goodies_assign_own_driver(p_order_id uuid, p_driver_name text, p_driver_phone text) to authenticated;
grant execute on function public.goodies_assign_own_driver(p_order_id uuid, p_driver_name text, p_driver_phone text) to service_role;
grant execute on function public.goodies_self_delivery_mark_delivered(p_order_id uuid, p_proof_url text) to authenticated;
grant execute on function public.goodies_self_delivery_mark_delivered(p_order_id uuid, p_proof_url text) to service_role;
grant execute on function public.goodies_customer_confirm_received(p_order_id uuid) to authenticated;
grant execute on function public.goodies_customer_confirm_received(p_order_id uuid) to service_role;
grant execute on function public.goodies_customer_dispute_delivery(p_order_id uuid, p_reason text) to authenticated;
grant execute on function public.goodies_customer_dispute_delivery(p_order_id uuid, p_reason text) to service_role;
grant execute on function public.goodies_admin_resolve_delivery_dispute(p_order_id uuid, p_resolution text) to authenticated;
grant execute on function public.goodies_admin_resolve_delivery_dispute(p_order_id uuid, p_resolution text) to service_role;
grant execute on function public.goodies_enforce_store_opening_hours() to service_role;
grant execute on function public.goodies_start_store_conversation(p_store_id text, p_customer_name text) to authenticated;
grant execute on function public.goodies_start_store_conversation(p_store_id text, p_customer_name text) to service_role;
grant execute on function public.goodies_send_store_message(p_conversation_id uuid, p_body text) to authenticated;
grant execute on function public.goodies_send_store_message(p_conversation_id uuid, p_body text) to service_role;
grant execute on function public.goodies_vendor_reply(p_conversation_id uuid, p_body text) to authenticated;
grant execute on function public.goodies_vendor_reply(p_conversation_id uuid, p_body text) to service_role;
alter table public."goodies_builder_configs" enable row level security;
alter table public."goodies_card_checkout_attempts" enable row level security;
alter table public."goodies_card_refund_queue" enable row level security;
alter table public."goodies_checkout_attempts" enable row level security;
alter table public."goodies_courier_presence" enable row level security;
alter table public."goodies_courier_roster" enable row level security;
alter table public."goodies_delivery_assignments" enable row level security;
alter table public."goodies_delivery_quotes" enable row level security;
alter table public."goodies_geocode_cache" enable row level security;
alter table public."goodies_group_order_invites" enable row level security;
alter table public."goodies_group_order_items" enable row level security;
alter table public."goodies_group_order_members" enable row level security;
alter table public."goodies_group_orders" enable row level security;
alter table public."goodies_ingredient_requests" enable row level security;
alter table public."goodies_ingredient_rules" enable row level security;
alter table public."goodies_library_ingredients" enable row level security;
alter table public."goodies_order_cancellation_private" enable row level security;
alter table public."goodies_order_groups" enable row level security;
alter table public."goodies_orders" enable row level security;
alter table public."goodies_products" enable row level security;
alter table public."goodies_promotions" enable row level security;
alter table public."goodies_route_cache" enable row level security;
alter table public."goodies_store_schedules" enable row level security;
alter table public."goodies_stripe_webhook_events" enable row level security;
create policy "goodies_courier_roster_self_read" on public."goodies_courier_roster" for SELECT to authenticated using ((courier_id = auth.uid()));
create policy "Store members can view private cancellation reasons" on public."goodies_order_cancellation_private" for SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM business_members bm
  WHERE ((bm.business_id = goodies_order_cancellation_private.business_id) AND (bm.user_id = ( SELECT auth.uid() AS uid))))));
create policy "Public can read live Goodies schedules" on public."goodies_store_schedules" for SELECT to anon,authenticated using (((is_live = true) AND private.goodies_customer_can_access()));
create policy "Business members can view their Goodies schedules" on public."goodies_store_schedules" for SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM business_members bm
  WHERE ((bm.business_id = goodies_store_schedules.business_id) AND (bm.user_id = ( SELECT auth.uid() AS uid))))));
create policy "Public can read products of live stores" on public."goodies_products" for SELECT to anon,authenticated using (((review_status = 'approved'::text) AND (is_available = true) AND (restriction <> 'alcohol'::text) AND (NOT (concat_ws(' '::text, name, description) ~* '(alcohol|alcool|liquor|rhum|clairin|barbancourt|whisk|vodka|tequila|cognac|brandy|\\mbeer|bi[èe]re|\\mwine|champagne|cocktail)'::text)) AND (EXISTS ( SELECT 1
   FROM goodies_store_schedules gs
  WHERE ((gs.business_id = goodies_products.business_id) AND (gs.is_live = true)))) AND private.goodies_customer_can_access()));
create policy "Customers can create Goodies orders for mapped stores" on public."goodies_orders" for INSERT to authenticated with check (((customer_id = ( SELECT auth.uid() AS uid)) AND private.goodies_customer_can_access() AND (EXISTS ( SELECT 1
   FROM goodies_store_schedules gs
  WHERE ((gs.business_id = goodies_orders.business_id) AND (gs.store_id = goodies_orders.store_id) AND (gs.is_live = true))))));
create policy "Customers and store members can read Goodies orders" on public."goodies_orders" for SELECT to authenticated using (((customer_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM business_members bm
  WHERE ((bm.business_id = goodies_orders.business_id) AND (bm.user_id = ( SELECT auth.uid() AS uid)))))));
create policy "Store members can update Goodies orders" on public."goodies_orders" for UPDATE to authenticated using ((EXISTS ( SELECT 1
   FROM business_members bm
  WHERE ((bm.business_id = goodies_orders.business_id) AND (bm.user_id = ( SELECT auth.uid() AS uid)))))) with check ((EXISTS ( SELECT 1
   FROM business_members bm
  WHERE ((bm.business_id = goodies_orders.business_id) AND (bm.user_id = ( SELECT auth.uid() AS uid))))));
create policy "group members can read their group" on public."goodies_group_orders" for SELECT to authenticated using (private.goodies_group_is_member(id));
create policy "group members can read membership" on public."goodies_group_order_members" for SELECT to authenticated using (private.goodies_group_is_member(group_id));
create policy "group members can read contributed items" on public."goodies_group_order_items" for SELECT to authenticated using (private.goodies_group_is_member(group_id));
create policy "group invites visible to parties" on public."goodies_group_order_invites" for SELECT to authenticated using (((( SELECT auth.uid() AS uid) IS NOT NULL) AND ((( SELECT auth.uid() AS uid) = invited_user_id) OR (( SELECT auth.uid() AS uid) = invited_by))));
create policy "Business members can delete Goodies schedules" on public."goodies_store_schedules" for DELETE to authenticated using ((EXISTS ( SELECT 1
   FROM business_members bm
  WHERE ((bm.business_id = goodies_store_schedules.business_id) AND (bm.user_id = ( SELECT auth.uid() AS uid))))));
create policy "Business members can read their products" on public."goodies_products" for SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM business_members bm
  WHERE ((bm.business_id = goodies_products.business_id) AND (bm.user_id = ( SELECT auth.uid() AS uid))))));
create policy "Business managers can insert products" on public."goodies_products" for INSERT to authenticated with check ((EXISTS ( SELECT 1
   FROM business_members bm
  WHERE ((bm.business_id = goodies_products.business_id) AND (bm.user_id = ( SELECT auth.uid() AS uid)) AND (bm.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));
create policy "Business managers can update products" on public."goodies_products" for UPDATE to authenticated using ((EXISTS ( SELECT 1
   FROM business_members bm
  WHERE ((bm.business_id = goodies_products.business_id) AND (bm.user_id = ( SELECT auth.uid() AS uid)) AND (bm.role = ANY (ARRAY['owner'::text, 'admin'::text])))))) with check ((EXISTS ( SELECT 1
   FROM business_members bm
  WHERE ((bm.business_id = goodies_products.business_id) AND (bm.user_id = ( SELECT auth.uid() AS uid)) AND (bm.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));
create policy "Business managers can delete products" on public."goodies_products" for DELETE to authenticated using ((EXISTS ( SELECT 1
   FROM business_members bm
  WHERE ((bm.business_id = goodies_products.business_id) AND (bm.user_id = ( SELECT auth.uid() AS uid)) AND (bm.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));
create policy "Live Goodies builders are readable" on public."goodies_builder_configs" for SELECT to anon,authenticated using (((enabled AND (EXISTS ( SELECT 1
   FROM goodies_store_schedules gs
  WHERE ((gs.business_id = goodies_builder_configs.business_id) AND (gs.is_live = true))))) OR (EXISTS ( SELECT 1
   FROM business_members bm
  WHERE ((bm.business_id = goodies_builder_configs.business_id) AND (bm.user_id = ( SELECT auth.uid() AS uid)))))));
create policy "Business members can insert Goodies schedules" on public."goodies_store_schedules" for INSERT to authenticated with check ((EXISTS ( SELECT 1
   FROM business_members bm
  WHERE ((bm.business_id = goodies_store_schedules.business_id) AND (bm.user_id = ( SELECT auth.uid() AS uid))))));
create policy "Business members can update Goodies schedules" on public."goodies_store_schedules" for UPDATE to authenticated using ((EXISTS ( SELECT 1
   FROM business_members bm
  WHERE ((bm.business_id = goodies_store_schedules.business_id) AND (bm.user_id = ( SELECT auth.uid() AS uid)))))) with check ((EXISTS ( SELECT 1
   FROM business_members bm
  WHERE ((bm.business_id = goodies_store_schedules.business_id) AND (bm.user_id = ( SELECT auth.uid() AS uid))))));
create policy "Active library ingredients are readable" on public."goodies_library_ingredients" for SELECT to authenticated using (active);
create policy "goodies_courier_presence_select_self" on public."goodies_courier_presence" for SELECT to authenticated using ((courier_id = auth.uid()));
create policy "goodies_courier_presence_write_self" on public."goodies_courier_presence" for ALL to authenticated using ((courier_id = auth.uid())) with check ((courier_id = auth.uid()));
create policy "customers read own order groups" on public."goodies_order_groups" for SELECT to public using ((( SELECT auth.uid() AS uid) = customer_id));
create policy "goodies_delivery_assignments_read_parties" on public."goodies_delivery_assignments" for SELECT to authenticated using (((courier_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM goodies_orders o
  WHERE ((o.id = goodies_delivery_assignments.order_id) AND (o.customer_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM business_members bm
  WHERE ((bm.business_id = goodies_delivery_assignments.business_id) AND (bm.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (lower(COALESCE(p.role, ''::text)) = ANY (ARRAY['admin'::text, 'super_admin'::text])))))));
grant SELECT on public."goodies_builder_configs" to anon;
grant SELECT on public."goodies_builder_configs" to authenticated;
grant SELECT on public."goodies_courier_presence" to authenticated;
grant SELECT on public."goodies_courier_roster" to authenticated;
grant SELECT on public."goodies_delivery_assignments" to authenticated;
grant UPDATE on public."goodies_group_order_items" to anon;
grant DELETE on public."goodies_group_order_items" to anon;
grant TRUNCATE on public."goodies_group_order_items" to anon;
grant REFERENCES on public."goodies_group_order_items" to anon;
grant TRIGGER on public."goodies_group_order_items" to anon;
grant INSERT on public."goodies_group_order_items" to anon;
grant SELECT on public."goodies_group_order_items" to anon;
grant TRUNCATE on public."goodies_group_order_items" to authenticated;
grant DELETE on public."goodies_group_order_items" to authenticated;
grant UPDATE on public."goodies_group_order_items" to authenticated;
grant SELECT on public."goodies_group_order_items" to authenticated;
grant INSERT on public."goodies_group_order_items" to authenticated;
grant TRIGGER on public."goodies_group_order_items" to authenticated;
grant REFERENCES on public."goodies_group_order_items" to authenticated;
grant INSERT on public."goodies_group_order_members" to anon;
grant UPDATE on public."goodies_group_order_members" to anon;
grant TRUNCATE on public."goodies_group_order_members" to anon;
grant REFERENCES on public."goodies_group_order_members" to anon;
grant TRIGGER on public."goodies_group_order_members" to anon;
grant SELECT on public."goodies_group_order_members" to anon;
grant DELETE on public."goodies_group_order_members" to anon;
grant TRUNCATE on public."goodies_group_order_members" to authenticated;
grant DELETE on public."goodies_group_order_members" to authenticated;
grant UPDATE on public."goodies_group_order_members" to authenticated;
grant SELECT on public."goodies_group_order_members" to authenticated;
grant INSERT on public."goodies_group_order_members" to authenticated;
grant TRIGGER on public."goodies_group_order_members" to authenticated;
grant REFERENCES on public."goodies_group_order_members" to authenticated;
grant INSERT on public."goodies_group_orders" to anon;
grant SELECT on public."goodies_group_orders" to anon;
grant UPDATE on public."goodies_group_orders" to anon;
grant DELETE on public."goodies_group_orders" to anon;
grant TRUNCATE on public."goodies_group_orders" to anon;
grant REFERENCES on public."goodies_group_orders" to anon;
grant TRIGGER on public."goodies_group_orders" to anon;
grant TRIGGER on public."goodies_group_orders" to authenticated;
grant UPDATE on public."goodies_group_orders" to authenticated;
grant TRUNCATE on public."goodies_group_orders" to authenticated;
grant DELETE on public."goodies_group_orders" to authenticated;
grant SELECT on public."goodies_group_orders" to authenticated;
grant INSERT on public."goodies_group_orders" to authenticated;
grant REFERENCES on public."goodies_group_orders" to authenticated;
grant UPDATE on public."goodies_ingredient_rules" to anon;
grant TRIGGER on public."goodies_ingredient_rules" to anon;
grant INSERT on public."goodies_ingredient_rules" to anon;
grant SELECT on public."goodies_ingredient_rules" to anon;
grant DELETE on public."goodies_ingredient_rules" to anon;
grant TRUNCATE on public."goodies_ingredient_rules" to anon;
grant REFERENCES on public."goodies_ingredient_rules" to anon;
grant INSERT on public."goodies_ingredient_rules" to authenticated;
grant TRUNCATE on public."goodies_ingredient_rules" to authenticated;
grant DELETE on public."goodies_ingredient_rules" to authenticated;
grant UPDATE on public."goodies_ingredient_rules" to authenticated;
grant TRIGGER on public."goodies_ingredient_rules" to authenticated;
grant REFERENCES on public."goodies_ingredient_rules" to authenticated;
grant SELECT on public."goodies_ingredient_rules" to authenticated;
grant DELETE on public."goodies_library_ingredients" to anon;
grant UPDATE on public."goodies_library_ingredients" to anon;
grant SELECT on public."goodies_library_ingredients" to anon;
grant INSERT on public."goodies_library_ingredients" to anon;
grant TRIGGER on public."goodies_library_ingredients" to anon;
grant REFERENCES on public."goodies_library_ingredients" to anon;
grant TRUNCATE on public."goodies_library_ingredients" to anon;
grant UPDATE on public."goodies_library_ingredients" to authenticated;
grant INSERT on public."goodies_library_ingredients" to authenticated;
grant SELECT on public."goodies_library_ingredients" to authenticated;
grant DELETE on public."goodies_library_ingredients" to authenticated;
grant TRUNCATE on public."goodies_library_ingredients" to authenticated;
grant REFERENCES on public."goodies_library_ingredients" to authenticated;
grant TRIGGER on public."goodies_library_ingredients" to authenticated;
grant SELECT on public."goodies_order_cancellation_private" to authenticated;
grant SELECT on public."goodies_order_groups" to authenticated;
grant SELECT on public."goodies_orders" to authenticated;
grant SELECT on public."goodies_products" to anon;
grant DELETE on public."goodies_products" to authenticated;
grant SELECT on public."goodies_products" to authenticated;
grant SELECT on public."goodies_store_schedules" to anon;
grant SELECT on public."goodies_store_schedules" to authenticated;

-- Supporting membership SELECT boundary observed from the same schema.
alter table public.business_members enable row level security;
grant select on public.business_members to authenticated;
create policy "Members can view their memberships" on public.business_members for select to authenticated using(user_id=(select auth.uid()));

-- pg_attribute.attidentity is independent of pg_attrdef column defaults.
alter table public.wantiss_admin_audit_log alter column id add generated always as identity;
