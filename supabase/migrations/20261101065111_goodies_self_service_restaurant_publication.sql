create or replace function public.goodies_set_store_live(p_business uuid, p_live boolean)
returns boolean language plpgsql security definer set search_path = 'public', 'pg_temp' as $function$
declare v_uid uuid := auth.uid(); b public.businesses%rowtype; s public.goodies_store_schedules%rowtype;
begin
  if v_uid is null then raise exception 'Sign in required' using errcode = '28000'; end if;
  if not exists (select 1 from public.business_members bm where bm.business_id = p_business and bm.user_id = v_uid and bm.role in ('owner', 'admin')) then raise exception 'Not allowed' using errcode = '42501'; end if;
  select * into s from public.goodies_store_schedules where business_id = p_business for update;
  if not found then raise exception 'Save your store setup first' using errcode = 'P0001'; end if;
  if not coalesce(p_live, false) then
    update public.goodies_store_schedules set is_live = false, updated_at = now() where business_id = p_business;
    return false;
  end if;
  select * into b from public.businesses where id = p_business;
  if not found then raise exception 'Business not found' using errcode = 'P0002'; end if;
  if s.category is null then raise exception 'Choose a store category first' using errcode = 'P0001'; end if;
  if b.hours is null or jsonb_typeof(b.hours) <> 'object' or b.hours = '{}'::jsonb then raise exception 'Set your opening hours in Business information first' using errcode = 'P0001'; end if;
  if not exists (
    select 1 from public.goodies_products p
    where p.business_id = p_business and p.is_available and p.stock > 0 and p.restriction <> 'alcohol'
      and not (concat_ws(' ', p.name, p.description) ~* '(alcohol|alcool|liquor|rhum|clairin|barbancourt|whisk|vodka|tequila|cognac|brandy|\\mbeer|bi[èe]re|\\mwine|champagne|cocktail)')
  ) then raise exception 'Add at least one available product with stock first' using errcode = 'P0001'; end if;
  perform public.goodies_sync_store_from_business(p_business);
  update public.goodies_store_schedules set is_live = true, updated_at = now() where business_id = p_business;
  return true;
end;
$function$;

create or replace function public.goodies_sync_store_from_business(p_business uuid)
returns void language sql security definer set search_path = 'public', 'pg_temp' as $function$
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

create or replace function public.goodies_admin_set_merchant_status(p_business_id uuid, p_live boolean)
returns void language plpgsql security definer set search_path = 'public', 'pg_temp' as $function$
begin
  perform public.goodies_admin_assert();
  if not exists (select 1 from public.businesses where id = p_business_id) then raise exception 'Merchant not found' using errcode = 'P0002'; end if;
  update public.goodies_store_schedules set is_live = coalesce(p_live, false), updated_at = now() where business_id = p_business_id;
  update public.businesses set is_live = coalesce(p_live, false) where id = p_business_id;
end;
$function$;

create or replace function public.wantiss_admin_set_business_verification(p_business uuid, p_status text, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $function$
begin
  if not public.wantiss_has_permission('ecosystem','edit') then raise exception 'Not authorized' using errcode='42501'; end if;
  if p_status not in ('verified','pending','restricted') then raise exception 'Invalid status' using errcode='22023'; end if;
  if length(trim(coalesce(p_reason,''))) < 3 then raise exception 'A reason of at least 3 characters is required' using errcode='22023'; end if;
  update public.businesses set verification=p_status where id=p_business;
  if not found then raise exception 'Business not found' using errcode='P0002'; end if;
  insert into public.wantiss_admin_audit_log(actor_user_id,action,resource_type,resource_id,reason,after_state)
  values((select auth.uid()),'business_verification_set','business',p_business::text,left(trim(p_reason),500),jsonb_build_object('verification',p_status));
end;
$function$;

revoke all on function public.goodies_admin_set_merchant_verification(uuid,text) from public, anon, authenticated;
