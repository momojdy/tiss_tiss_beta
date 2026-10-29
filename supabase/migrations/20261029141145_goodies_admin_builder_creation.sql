create or replace function public.wantiss_admin_list_goodies_builder_businesses()
returns table (
  business_id uuid,
  business_name text,
  goodies_store_id text,
  is_live boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if (select auth.uid()) is null or not public.wantiss_has_permission('operations', 'edit') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  return query
  select b.id, coalesce(b.name::text, 'Unnamed business'), gs.store_id, coalesce(gs.is_live, false)
  from public.businesses b
  left join public.goodies_store_schedules gs on gs.business_id = b.id
  order by b.name nulls last, b.created_at desc;
end;
$function$;

create or replace function public.wantiss_admin_save_goodies_builder_config(
  p_business_id uuid,
  p_builder_id text,
  p_config jsonb,
  p_enabled boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_enabled boolean;
begin
  if (select auth.uid()) is null or not public.wantiss_has_permission('operations', 'edit') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if p_business_id is null or length(trim(coalesce(p_builder_id, ''))) not between 1 and 120 then
    raise exception 'Invalid business or builder id' using errcode = '22023';
  end if;
  if p_config is null or jsonb_typeof(p_config) <> 'object' or p_config->>'id' is distinct from trim(p_builder_id) then
    raise exception 'Builder config must be an object whose id matches the selected builder' using errcode = '22023';
  end if;
  if jsonb_typeof(p_config->'groups') is distinct from 'array' or jsonb_typeof(p_config->'sizes') is distinct from 'array' then
    raise exception 'Builder sizes and ingredient groups must be arrays' using errcode = '22023';
  end if;
  if length(p_config::text) > 500000 then raise exception 'Builder config is too large' using errcode = '22023'; end if;
  if not exists (select 1 from public.businesses b where b.id = p_business_id) then
    raise exception 'Business not found' using errcode = 'P0001';
  end if;

  v_enabled := coalesce(p_enabled, false)
    and coalesce((p_config->>'enabled')::boolean, false)
    and coalesce((p_config->>'available')::boolean, false);

  insert into public.goodies_builder_configs (business_id, builder_id, config, enabled, updated_at)
  values (p_business_id, trim(p_builder_id), p_config, v_enabled, now())
  on conflict (business_id, builder_id)
  do update set config = excluded.config, enabled = excluded.enabled, updated_at = now();

  return true;
end;
$function$;

revoke all on function public.wantiss_admin_list_goodies_builder_businesses() from public, anon;
grant execute on function public.wantiss_admin_list_goodies_builder_businesses() to authenticated;
