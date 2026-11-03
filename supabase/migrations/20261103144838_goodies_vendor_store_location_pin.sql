create or replace function public.goodies_save_store_location(
  p_business uuid,
  p_latitude double precision,
  p_longitude double precision
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
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

revoke all on function public.goodies_save_store_location(uuid, double precision, double precision) from public, anon;
grant execute on function public.goodies_save_store_location(uuid, double precision, double precision) to authenticated;
