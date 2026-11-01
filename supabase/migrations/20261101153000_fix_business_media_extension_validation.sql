-- Use explicit suffix checks so URL extension validation is independent of regex escaping.
create or replace function public.goodies_products_validate_photo_url()
returns trigger language plpgsql set search_path=public,auth,pg_temp as $function$
declare v_base text; v_prefix text; v_url text;
begin
 if new.photo_url is null then return new; end if;
 if tg_op='UPDATE' and new.photo_url is not distinct from old.photo_url then return new; end if;
 if auth.uid() is null then return new; end if;
 v_url:=lower(new.photo_url);
 v_base:=regexp_replace(coalesce(auth.jwt()->>'iss',''),'/auth/v1/?$','');
 v_prefix:=v_base||'/storage/v1/object/public/listing-photos/'||new.business_id::text||'/goodies/products/';
 if v_base='' or left(new.photo_url,length(v_prefix))<>v_prefix
    or not (v_url like any(array['%.jpg','%.jpeg','%.png','%.webp'])) then
  raise exception 'Product photos must be uploaded to this business Goodies product folder' using errcode='42501';
 end if;
 return new;
end $function$;

create or replace function public.update_my_business_info(p_business uuid,p_fields jsonb)
returns void language plpgsql security definer set search_path=public,pg_temp as $function$
declare v_uid uuid:=auth.uid();v_start integer;v_existing_logo text;v_base text;v_prefix text;v_logo text;
begin
 if v_uid is null then raise exception 'Sign in required' using errcode='28000';end if;
 if not exists(select 1 from public.business_members bm where bm.business_id=p_business and bm.user_id=v_uid and bm.role in ('owner','admin')) then raise exception 'Not allowed' using errcode='42501';end if;
 if p_fields is null or jsonb_typeof(p_fields)<>'object' then raise exception 'Invalid fields' using errcode='22023';end if;
 if p_fields ? 'name' and char_length(trim(coalesce(p_fields->>'name',''))) not between 2 and 160 then raise exception 'Business name must be between 2 and 160 characters' using errcode='22023';end if;
 if p_fields ? 'hours' and jsonb_typeof(p_fields->'hours')<>'object' then raise exception 'Invalid hours' using errcode='22023';end if;
 if p_fields ? 'delivery_modes' and jsonb_typeof(p_fields->'delivery_modes')<>'array' then raise exception 'Invalid delivery modes' using errcode='22023';end if;
 if p_fields ? 'scheduled_order_start_minutes' then
  v_start:=(p_fields->>'scheduled_order_start_minutes')::integer;
  if v_start is null or v_start<0 or v_start>1440 then raise exception 'Invalid scheduled order lead time' using errcode='22023';end if;
 end if;
 select logo_url into v_existing_logo from public.businesses where id=p_business for update;
 if not found then raise exception 'Business not found' using errcode='P0002';end if;
 if p_fields ? 'logo_url' then
  v_logo:=nullif(trim(p_fields->>'logo_url'),'');
  if v_logo is not null and v_logo is distinct from v_existing_logo then
   v_base:=regexp_replace(coalesce(auth.jwt()->>'iss',''),'/auth/v1/?$','');
   v_prefix:=v_base||'/storage/v1/object/public/listing-photos/'||p_business::text||'/logo/';
   if v_base='' or left(v_logo,length(v_prefix))<>v_prefix or not (lower(v_logo) like any(array['%.jpg','%.jpeg','%.png','%.webp'])) then
    raise exception 'Business logos must be uploaded to this business listing-photo folder' using errcode='42501';
   end if;
  end if;
 end if;
 update public.businesses b set
  name=case when p_fields ? 'name' then trim(p_fields->>'name') else b.name end,
  description=case when p_fields ? 'description' then left(nullif(p_fields->>'description',''),1000) else b.description end,
  phone=case when p_fields ? 'phone' then left(nullif(p_fields->>'phone',''),32) else b.phone end,
  phone_country=case when p_fields ? 'phone_country' then left(nullif(p_fields->>'phone_country',''),4) else b.phone_country end,
  email=case when p_fields ? 'email' then left(nullif(p_fields->>'email',''),254) else b.email end,
  website=case when p_fields ? 'website' then left(nullif(p_fields->>'website',''),300) else b.website end,
  address=case when p_fields ? 'address' then left(nullif(p_fields->>'address',''),300) else b.address end,
  city=case when p_fields ? 'city' then left(nullif(p_fields->>'city',''),120) else b.city end,
  country=case when p_fields ? 'country' then left(nullif(p_fields->>'country',''),120) else b.country end,
  delivery_modes=case when p_fields ? 'delivery_modes' then array(select left(x,20) from jsonb_array_elements_text(p_fields->'delivery_modes') x) else b.delivery_modes end,
  hours=case when p_fields ? 'hours' then p_fields->'hours' else b.hours end,
  logo_url=case when p_fields ? 'logo_url' then v_logo else b.logo_url end,
  accept_scheduled_orders=case when p_fields ? 'accept_scheduled_orders' then coalesce((p_fields->>'accept_scheduled_orders')::boolean,false) else b.accept_scheduled_orders end,
  scheduled_order_start_minutes=case when p_fields ? 'scheduled_order_start_minutes' then v_start else b.scheduled_order_start_minutes end
 where b.id=p_business;
 perform public.goodies_sync_store_from_business(p_business);
end $function$;
revoke all on function public.update_my_business_info(uuid,jsonb) from public,anon;
grant execute on function public.update_my_business_info(uuid,jsonb) to authenticated;
