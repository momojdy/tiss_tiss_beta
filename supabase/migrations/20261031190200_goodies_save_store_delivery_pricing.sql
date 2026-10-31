create or replace function public.goodies_save_store_setup(
  p_business uuid, p_category text, p_kind text, p_min_order numeric, p_delivery_fee numeric,
  p_eta_min integer, p_eta_max integer, p_promo text, p_names jsonb, p_delivery boolean, p_pickup boolean,
  p_delivery_pricing_mode text, p_delivery_base_fee numeric, p_delivery_per_km_fee numeric,
  p_delivery_min_fee numeric, p_delivery_max_fee numeric, p_delivery_max_distance_km numeric
) returns void
language plpgsql security definer set search_path=public,pg_temp
as $$
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
end $$;
revoke all on function public.goodies_save_store_setup(uuid,text,text,numeric,numeric,integer,integer,text,jsonb,boolean,boolean,text,numeric,numeric,numeric,numeric,numeric) from public,anon;
grant execute on function public.goodies_save_store_setup(uuid,text,text,numeric,numeric,integer,integer,text,jsonb,boolean,boolean,text,numeric,numeric,numeric,numeric,numeric) to authenticated;
