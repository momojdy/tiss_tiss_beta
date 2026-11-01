alter table public.goodies_store_schedules
  add column if not exists store_name text,
  add column if not exists thumbnail_url text;

create or replace function public.goodies_save_store_setup(
  p_business uuid, p_category text, p_kind text, p_min_order numeric, p_delivery_fee numeric,
  p_eta_min integer, p_eta_max integer, p_promo text, p_names jsonb, p_delivery boolean, p_pickup boolean,
  p_delivery_pricing_mode text, p_delivery_base_fee numeric, p_delivery_per_km_fee numeric,
  p_delivery_min_fee numeric, p_delivery_max_fee numeric, p_delivery_max_distance_km numeric,
  p_address text, p_city text, p_country text, p_accept_scheduled_orders boolean,
  p_scheduled_order_start_time text, p_scheduled_order_timezone text, p_store_name text
)
returns void language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
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
revoke all on function public.goodies_save_store_setup(uuid,text,text,numeric,numeric,integer,integer,text,jsonb,boolean,boolean,text,numeric,numeric,numeric,numeric,numeric,text,text,text,boolean,text,text,text) from public;
grant execute on function public.goodies_save_store_setup(uuid,text,text,numeric,numeric,integer,integer,text,jsonb,boolean,boolean,text,numeric,numeric,numeric,numeric,numeric,text,text,text,boolean,text,text,text) to authenticated;

create or replace function public.goodies_save_store_thumbnail(p_business uuid, p_thumbnail_url text)
returns boolean language plpgsql security definer set search_path to ''
as $function$
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode = '28000'; end if;
  if not exists (select 1 from public.business_members bm where bm.business_id = p_business and bm.user_id = auth.uid() and bm.role in ('owner','admin')) then raise exception 'Not allowed' using errcode = '42501'; end if;
  if p_thumbnail_url is not null and (length(p_thumbnail_url) > 2048 or p_thumbnail_url !~ '^https://') then raise exception 'Invalid store thumbnail URL'; end if;
  update public.goodies_store_schedules set thumbnail_url = p_thumbnail_url, updated_at = now() where business_id = p_business;
  if not found then raise exception 'Save your store setup before adding a thumbnail'; end if;
  return true;
end;
$function$;
revoke all on function public.goodies_save_store_thumbnail(uuid,text) from public;
grant execute on function public.goodies_save_store_thumbnail(uuid,text) to authenticated;