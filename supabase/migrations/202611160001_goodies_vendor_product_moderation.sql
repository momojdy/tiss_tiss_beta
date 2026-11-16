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
