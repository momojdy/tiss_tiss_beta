alter table public.goodies_store_schedules
  add column if not exists scheduled_order_start_time time without time zone not null default time '10:00';

create or replace function public.goodies_save_store_setup(
  p_business uuid, p_category text, p_kind text, p_min_order numeric, p_delivery_fee numeric,
  p_eta_min integer, p_eta_max integer, p_promo text, p_names jsonb, p_delivery boolean, p_pickup boolean,
  p_delivery_pricing_mode text, p_delivery_base_fee numeric, p_delivery_per_km_fee numeric,
  p_delivery_min_fee numeric, p_delivery_max_fee numeric, p_delivery_max_distance_km numeric,
  p_address text, p_city text, p_country text, p_accept_scheduled_orders boolean, p_scheduled_order_start_time text
)
returns void language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare v_start_time time;
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
    p_business, p_category, p_kind, p_min_order, p_delivery_fee, p_eta_min, p_eta_max,
    p_promo, p_names, p_delivery, p_pickup, p_delivery_pricing_mode, p_delivery_base_fee,
    p_delivery_per_km_fee, p_delivery_min_fee, p_delivery_max_fee, p_delivery_max_distance_km,
    p_address, p_city, p_country
  );
  update public.goodies_store_schedules
  set accept_scheduled_orders = coalesce(p_accept_scheduled_orders, false),
      scheduled_order_start_time = v_start_time, updated_at = now()
  where business_id = p_business;
end;
$function$;
revoke all on function public.goodies_save_store_setup(uuid,text,text,numeric,numeric,integer,integer,text,jsonb,boolean,boolean,text,numeric,numeric,numeric,numeric,numeric,text,text,text,boolean,text) from public;
grant execute on function public.goodies_save_store_setup(uuid,text,text,numeric,numeric,integer,integer,text,jsonb,boolean,boolean,text,numeric,numeric,numeric,numeric,numeric,text,text,text,boolean,text) to authenticated;