create or replace function public.goodies_save_store_setup(
  p_business uuid,
  p_category text,
  p_kind text,
  p_min_order numeric,
  p_delivery_fee numeric,
  p_eta_min integer,
  p_eta_max integer,
  p_promo text,
  p_names jsonb,
  p_delivery boolean,
  p_pickup boolean,
  p_delivery_pricing_mode text,
  p_delivery_base_fee numeric,
  p_delivery_per_km_fee numeric,
  p_delivery_min_fee numeric,
  p_delivery_max_fee numeric,
  p_delivery_max_distance_km numeric,
  p_address text,
  p_city text,
  p_country text,
  p_accept_scheduled_orders boolean,
  p_scheduled_order_start_minutes integer
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
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

revoke all on function public.goodies_save_store_setup(uuid,text,text,numeric,numeric,integer,integer,text,jsonb,boolean,boolean,text,numeric,numeric,numeric,numeric,numeric,text,text,text,boolean,integer) from public;
grant execute on function public.goodies_save_store_setup(uuid,text,text,numeric,numeric,integer,integer,text,jsonb,boolean,boolean,text,numeric,numeric,numeric,numeric,numeric,text,text,text,boolean,integer) to authenticated;