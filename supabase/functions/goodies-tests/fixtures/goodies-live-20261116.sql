-- Schema-only deployed Goodies changes captured read-only on 2026-11-16. No customer rows.
-- Goodies: vendor-owned product mutations through narrow RPCs, with real moderation.
-- No customer or payment records are modified by this migration.
alter table public.goodies_products alter column review_status set default 'pending';

create or replace function public.goodies_products_default_pending_review()
returns trigger language plpgsql set search_path to 'public', 'pg_temp'
as $body$
begin
  if coalesce(new.restriction, 'none') = 'alcohol'
     or concat_ws(' ', new.name, new.description) ~*
        '(alcohol|alcool|liquor|rhum|clairin|barbancourt|whisk|vodka|tequila|cognac|brandy|\mbeer|bi[èe]re|\mwine|champagne|cocktail)'
  then
    raise exception 'Alcohol products are prohibited on Wantiss' using errcode='P0001';
  end if;
  new.review_status := 'pending';
  new.review_note := null;
  new.reviewed_by := null;
  new.reviewed_at := null;
  new.is_available := false;
  return new;
end;
$body$;

create or replace function public.goodies_products_enforce_update_moderation()
returns trigger language plpgsql security definer
set search_path to 'public', 'auth', 'pg_temp'
as $body$
declare v_is_admin boolean := false; v_content_changed boolean;
begin
  if auth.uid() is null then return new; end if;
  if new.business_id is distinct from old.business_id then
    raise exception 'A product cannot be transferred between businesses' using errcode='42501';
  end if;
  if coalesce(new.restriction, 'none') = 'alcohol'
     or concat_ws(' ', new.name, new.description) ~*
        '(alcohol|alcool|liquor|rhum|clairin|barbancourt|whisk|vodka|tequila|cognac|brandy|\mbeer|bi[èe]re|\mwine|champagne|cocktail)'
  then
    raise exception 'Alcohol products are prohibited on Wantiss' using errcode='P0001';
  end if;
  begin
    perform public.goodies_admin_assert();
    v_is_admin := true;
  exception when insufficient_privilege then
    v_is_admin := false;
  end;
  if (new.review_status, new.review_note, new.reviewed_by, new.reviewed_at)
     is distinct from (old.review_status, old.review_note, old.reviewed_by, old.reviewed_at)
     and not v_is_admin then
    raise exception 'Only Wantiss administrators can change product review metadata' using errcode='42501';
  end if;
  v_content_changed :=
       new.name is distinct from old.name
    or new.description is distinct from old.description
    or new.price is distinct from old.price
    or new.emoji is distinct from old.emoji
    or new.restriction is distinct from old.restriction
    or new.photo_url is distinct from old.photo_url
    or new.photo_urls is distinct from old.photo_urls
    or new.aisle is distinct from old.aisle;
  if v_content_changed then
    new.review_status := 'pending';
    new.review_note := null;
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.is_available := false;
  elsif new.review_status <> 'approved' then
    new.is_available := false;
  end if;
  return new;
end;
$body$;

create or replace function public.goodies_vendor_save_product(
  p_business uuid, p_id uuid, p_name text, p_description text,
  p_price numeric, p_emoji text, p_stock integer, p_restriction text,
  p_photo_url text, p_photo_urls jsonb
)
returns uuid language plpgsql security definer
set search_path to 'public', 'auth', 'pg_temp'
as $body$
declare v_user uuid := auth.uid(); v_result uuid;
begin
  if v_user is null then
    raise exception 'Sign in required' using errcode='28000';
  end if;
  if p_business is null
    or not private.goodies_merchant_can_operate(p_business)
    or not exists (select 1 from public.business_members m
                   where m.business_id=p_business and m.user_id=v_user
                     and m.role in ('owner','admin')) then
    raise exception 'Only authorized store managers can edit these products' using errcode='42501';
  end if;
  if nullif(trim(coalesce(p_name,'')),'') is null or length(trim(p_name)) > 120
     or p_price is null or p_price < 0 or p_price > 100000 or round(p_price,2)<>p_price
     or p_stock is null or p_stock < 0 or p_stock > 100000
     or length(coalesce(p_description,'')) > 500
     or coalesce(p_restriction,'none') not in ('none','otc')
     or p_photo_urls is null or jsonb_typeof(p_photo_urls) <> 'array'
     or jsonb_array_length(p_photo_urls)>5 then
    raise exception 'Product details are invalid' using errcode='22023';
  end if;
  if p_id is null then
    insert into public.goodies_products
      (business_id,name,description,price,emoji,stock,restriction,photo_url,photo_urls,is_available)
    values
      (p_business,trim(p_name),nullif(trim(coalesce(p_description,'')),''),
       p_price,coalesce(nullif(trim(p_emoji),''),'🛍️'),p_stock,coalesce(p_restriction,'none'),
       p_photo_url,p_photo_urls,false)
    returning id into v_result;
  else
    update public.goodies_products
       set name=trim(p_name), description=nullif(trim(coalesce(p_description,'')),''),
           price=p_price, emoji=coalesce(nullif(trim(p_emoji),''),'🛍️'),
           stock=p_stock, restriction=coalesce(p_restriction,'none'),
           photo_url=p_photo_url, photo_urls=p_photo_urls,updated_at=now()
     where id=p_id and business_id=p_business
    returning id into v_result;
    if v_result is null then
      raise exception 'Product not found in your store' using errcode='P0002';
    end if;
  end if;
  return v_result;
end;
$body$;

create or replace function public.goodies_vendor_set_product_availability(
  p_business uuid, p_id uuid, p_available boolean
)
returns boolean language plpgsql security definer
set search_path to 'public', 'auth', 'pg_temp'
as $body$
declare v_user uuid := auth.uid(); v_row public.goodies_products%rowtype;
begin
  if v_user is null then raise exception 'Sign in required' using errcode='28000'; end if;
  if p_business is null
    or not private.goodies_merchant_can_operate(p_business)
    or not exists (select 1 from public.business_members m
                   where m.business_id=p_business and m.user_id=v_user
                     and m.role in ('owner','admin')) then
    raise exception 'Only authorized store managers can change product availability' using errcode='42501';
  end if;
  select * into v_row from public.goodies_products
    where id=p_id and business_id=p_business for update;
  if not found then raise exception 'Product not found in your store' using errcode='P0002'; end if;
  if coalesce(p_available,false) and v_row.review_status <> 'approved' then
    raise exception 'This product must be approved before it can be offered' using errcode='P0001';
  end if;
  if coalesce(p_available,false) and v_row.stock < 1 then
    raise exception 'Add stock before making this product available' using errcode='P0001';
  end if;
  update public.goodies_products
     set is_available=coalesce(p_available,false),updated_at=now()
     where id=p_id and business_id=p_business;
  return coalesce(p_available,false);
end;
$body$;

revoke all on function public.goodies_vendor_save_product(uuid,uuid,text,text,numeric,text,integer,text,text,jsonb) from public, anon;
grant execute on function public.goodies_vendor_save_product(uuid,uuid,text,text,numeric,text,integer,text,text,jsonb) to authenticated;
revoke all on function public.goodies_vendor_set_product_availability(uuid,uuid,boolean) from public, anon;
grant execute on function public.goodies_vendor_set_product_availability(uuid,uuid,boolean) to authenticated;

-- Only reviewed catalog entries may justify publishing a store.
create or replace function public.goodies_set_store_live(p_business uuid, p_live boolean)
returns boolean language plpgsql security definer
set search_path to 'public', 'pg_temp'
as $body$
declare v_uid uuid := auth.uid(); b public.businesses%rowtype;
        s public.goodies_store_schedules%rowtype;
begin
  if v_uid is null then raise exception 'Sign in required' using errcode='28000'; end if;
  if not private.goodies_merchant_can_operate(p_business) then
    raise exception 'Goodies merchant access is restricted' using errcode='42501';
  end if;
  select * into s from public.goodies_store_schedules where business_id=p_business for update;
  if not found then raise exception 'Save your store setup first' using errcode='P0001'; end if;
  if not coalesce(p_live,false) then
    update public.goodies_store_schedules set is_live=false,updated_at=now() where business_id=p_business;
    return false;
  end if;
  select * into b from public.businesses where id=p_business;
  if not found then raise exception 'Business not found' using errcode='P0002'; end if;
  if s.category is null then raise exception 'Choose a store category first' using errcode='P0001'; end if;
  if b.hours is null or jsonb_typeof(b.hours)<>'object' or b.hours='{}'::jsonb then
    raise exception 'Set your opening hours in Business information first' using errcode='P0001';
  end if;
  if not exists (
    select 1 from public.goodies_products p
     where p.business_id=p_business and p.is_available and p.stock>0
       and p.review_status='approved' and p.restriction<>'alcohol'
       and not (concat_ws(' ',p.name,p.description) ~*
         '(alcohol|alcool|liquor|rhum|clairin|barbancourt|whisk|vodka|tequila|cognac|brandy|\mbeer|bi[èe]re|\mwine|champagne|cocktail)')
  ) then raise exception 'Publish at least one approved product with stock first' using errcode='P0001'; end if;
  perform public.goodies_sync_store_from_business(p_business);
  update public.goodies_store_schedules set is_live=true,updated_at=now() where business_id=p_business;
  return true;
end;
$body$;

-- Persist the actual road geometry from the server-owned delivery quote.
-- Do not synthesize a straight line from store and destination coordinates.
create or replace function public.goodies_orders_capture_delivery_coordinates()
returns trigger language plpgsql security definer
set search_path to 'public', 'pg_temp'
as $body$
declare v_quote public.goodies_delivery_quotes%rowtype; v_quote_id uuid;
begin
  if new.order_type='delivery' and new.address is not null then
    if nullif(new.address->>'delivery_quote_id','') is not null then
      begin
        v_quote_id := (new.address->>'delivery_quote_id')::uuid;
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
      new.store_latitude := v_quote.origin_latitude;
      new.store_longitude := v_quote.origin_longitude;
      new.delivery_latitude := v_quote.destination_latitude;
      new.delivery_longitude := v_quote.destination_longitude;
      -- This is a server-calculated Geoapify GeoJSON LineString / MultiLineString.
      new.delivery_route := v_quote.route_geometry;
    end if;
  end if;
  return new;
end;
$body$;

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
  if nullif(current_setting('app.goodies_group_first_order', true), '') is not null then v_first_order := current_setting('app.goodies_group_first_order', true)::boolean; else select not exists(select 1 from public.goodies_orders o where o.customer_id=v_uid and o.order_type='delivery') into v_first_order; end if;
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
$function$
;

-- Deployed review schema 20261116135012, captured read-only on 2026-11-17.
-- Goodies reviews: verified completed orders, unique per target, and moderated publication.
-- This migration does not insert review data or alter existing orders.
create table if not exists public.goodies_order_reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.goodies_orders(id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  courier_id uuid references auth.users(id) on delete set null,
  review_target text not null check (review_target in ('store','courier')),
  rating integer not null check (rating between 1 and 5),
  comment text not null default '' check (char_length(comment)<=1000),
  review_status text not null default 'pending' check (review_status in ('pending','approved','rejected')),
  review_note text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(order_id,review_target),
  constraint goodies_review_courier_target check (review_target='store' or courier_id is not null)
);
create index if not exists goodies_order_reviews_store_index
  on public.goodies_order_reviews(business_id,review_status,created_at desc)
  where review_target='store';
create index if not exists goodies_order_reviews_courier_index
  on public.goodies_order_reviews(courier_id,review_status,created_at desc)
  where review_target='courier';

alter table public.goodies_order_reviews enable row level security;
revoke all on table public.goodies_order_reviews from public,anon,authenticated;
grant select on table public.goodies_order_reviews to authenticated;

create policy "Goodies customers read their submitted reviews"
on public.goodies_order_reviews for select to authenticated
using (customer_id=(select auth.uid()));

create policy "Goodies merchants read feedback for their business"
on public.goodies_order_reviews for select to authenticated
using (exists (
  select 1 from public.business_members m
   where m.business_id=goodies_order_reviews.business_id
     and m.user_id=(select auth.uid())
));

create or replace function public.goodies_submit_order_review(
  p_order_id uuid, p_review_target text, p_rating integer, p_comment text default ''
)
returns uuid language plpgsql security definer
set search_path to 'public','auth','pg_temp'
as $body$
declare
  v_uid uuid:=auth.uid(); v_order public.goodies_orders%rowtype;
  v_existing public.goodies_order_reviews%rowtype; v_review_id uuid;
  v_comment text:=trim(coalesce(p_comment,''));
begin
  if v_uid is null then raise exception 'Sign in to review a Goodies order' using errcode='28000'; end if;
  if p_review_target not in ('store','courier') or p_rating is null or p_rating not between 1 and 5
     or length(v_comment)>1000 then
    raise exception 'Choose a target, 1 to 5 stars, and a comment under 1000 characters' using errcode='22023';
  end if;
  select * into v_order from public.goodies_orders
   where id=p_order_id and customer_id=v_uid for share;
  if not found or v_order.status<>'completed' then
    raise exception 'Only a completed order that belongs to you can be reviewed' using errcode='42501';
  end if;
  if p_review_target='courier' and (v_order.order_type='pickup' or v_order.courier_id is null) then
    raise exception 'This order does not have a Wantiss courier to review' using errcode='22023';
  end if;
  select * into v_existing from public.goodies_order_reviews
   where order_id=p_order_id and review_target=p_review_target for update;
  if found then
    if v_existing.customer_id=v_uid and v_existing.rating=p_rating
       and v_existing.comment=v_comment then return v_existing.id; end if;
    raise exception 'This order has already been reviewed' using errcode='23505';
  end if;
  insert into public.goodies_order_reviews
    (order_id,customer_id,business_id,courier_id,review_target,rating,comment)
  values
    (v_order.id,v_uid,v_order.business_id,
     case when p_review_target='courier' then v_order.courier_id else null end,
     p_review_target,p_rating,v_comment)
  returning id into v_review_id;
  return v_review_id;
end;
$body$;

-- Public storefront receives only approved ratings and anonymous review text, never reviewer identity.
create or replace function public.goodies_public_store_review_stats(p_store_ids text[])
returns table(store_id text,rating numeric,review_count bigint)
language plpgsql security definer set search_path to 'public','pg_temp'
as $body$
begin
  if p_store_ids is null or coalesce(cardinality(p_store_ids),0)>100 then
    raise exception 'Choose up to 100 stores' using errcode='22023';
  end if;
  return query
  select gs.store_id,
         coalesce(round(avg(r.rating)::numeric,1),0) as rating,
         count(r.id) as review_count
    from public.goodies_store_schedules gs
    left join public.goodies_order_reviews r
      on r.business_id=gs.business_id and r.review_target='store'
     and r.review_status='approved'
   where gs.is_live and gs.store_id=any(p_store_ids)
   group by gs.store_id;
end;
$body$;

create or replace function public.goodies_public_store_reviews(p_store_id text)
returns table(rating integer,comment text,created_at timestamptz,author_label text)
language plpgsql security definer set search_path to 'public','pg_temp'
as $body$
begin
  return query
  select r.rating,r.comment,r.created_at,'Verified customer'::text
    from public.goodies_order_reviews r
    join public.goodies_store_schedules gs on gs.business_id=r.business_id
   where gs.store_id=p_store_id and gs.is_live and r.review_target='store'
     and r.review_status='approved'
   order by r.created_at desc limit 50;
end;
$body$;

create or replace function public.goodies_admin_list_reviews()
returns table(id uuid,order_id uuid,store_name text,review_target text,
              rating integer,comment text,review_status text,
              review_note text,created_at timestamptz)
language plpgsql security definer set search_path to 'public','auth','pg_temp'
as $body$
begin
  perform public.goodies_admin_assert();
  return query
  select r.id,r.order_id,coalesce(gs.store_name,'Store'),r.review_target,
         r.rating,r.comment,r.review_status,r.review_note,r.created_at
    from public.goodies_order_reviews r
    left join public.goodies_store_schedules gs on gs.business_id=r.business_id
   order by (r.review_status='pending') desc,r.created_at desc limit 300;
end;
$body$;

create or replace function public.goodies_admin_review_order_review(
  p_review_id uuid,p_status text,p_note text default null
)
returns void language plpgsql security definer
set search_path to 'public','auth','pg_temp'
as $body$
begin
  perform public.goodies_admin_assert();
  if p_status not in ('approved','rejected') then
    raise exception 'Invalid review decision' using errcode='22023';
  end if;
  if p_status='rejected' and nullif(trim(coalesce(p_note,'')),'') is null then
    raise exception 'Explain why the review was rejected' using errcode='22023';
  end if;
  update public.goodies_order_reviews
     set review_status=p_status,
         review_note=left(nullif(trim(coalesce(p_note,'')),''),500),
         reviewed_by=auth.uid(),reviewed_at=now()
   where id=p_review_id and review_status='pending';
  if not found then raise exception 'Review is missing or already moderated' using errcode='P0002'; end if;
end;
$body$;

revoke all on function public.goodies_submit_order_review(uuid,text,integer,text) from public,anon;
grant execute on function public.goodies_submit_order_review(uuid,text,integer,text) to authenticated;
revoke all on function public.goodies_public_store_review_stats(text[]) from public;
grant execute on function public.goodies_public_store_review_stats(text[]) to anon,authenticated;
revoke all on function public.goodies_public_store_reviews(text) from public;
grant execute on function public.goodies_public_store_reviews(text) to anon,authenticated;
revoke all on function public.goodies_admin_list_reviews() from public,anon;
grant execute on function public.goodies_admin_list_reviews() to authenticated;
revoke all on function public.goodies_admin_review_order_review(uuid,text,text) from public,anon;
grant execute on function public.goodies_admin_review_order_review(uuid,text,text) to authenticated;
