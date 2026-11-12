-- Canonical Goodies validator, with a validation-only path that does not consume inventory, delivery quotes, or promotions.
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
$function$
;
-- Private finalization creates the real order for the request creator, regardless of which friend provides the final payment.
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
$function$
;
revoke all on function private.help_pay_place_goodies_order(uuid,text,text,timestamptz,jsonb,text,jsonb,numeric,numeric,numeric,numeric,numeric,numeric,text,text) from public,anon,authenticated;
alter table public.help_pay_requests add column if not exists order_id uuid references public.goodies_orders(id);
create unique index if not exists help_pay_creator_checkout_key on public.help_pay_requests(creator_id,checkout_key);
create unique index if not exists help_pay_order_id_unique on public.help_pay_requests(order_id) where order_id is not null;
revoke insert,update,delete on public.help_pay_requests from public,anon,authenticated;
grant select on public.help_pay_requests to authenticated;
revoke insert,update,delete on public.help_pay_contributions from public,anon,authenticated;
