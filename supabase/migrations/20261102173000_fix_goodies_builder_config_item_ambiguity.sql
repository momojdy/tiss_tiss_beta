create or replace function public.goodies_save_builder_configs(p_business uuid, p_configs jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_config jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  if p_configs is null or jsonb_typeof(p_configs) <> 'array' then
    raise exception 'Builder configurations must be an array' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.business_members bm
    where bm.business_id = p_business and bm.user_id = (select auth.uid())
  ) then
    raise exception 'Not authorized for this business' using errcode = '42501';
  end if;
  for v_config in
    select cfg.value from jsonb_array_elements(p_configs) as cfg(value)
  loop
    if nullif(v_config->>'id', '') is null then
      raise exception 'Every builder needs an id' using errcode = '22023';
    end if;
    insert into public.goodies_builder_configs
      (business_id, builder_id, config, enabled, updated_at)
    values
      (p_business, v_config->>'id', v_config,
       coalesce((v_config->>'enabled')::boolean, false)
       and coalesce((v_config->>'available')::boolean, false), now())
    on conflict (business_id, builder_id)
    do update set config = excluded.config, enabled = excluded.enabled, updated_at = now();
  end loop;
  delete from public.goodies_builder_configs gbc
  where gbc.business_id = p_business
    and not exists (
      select 1 from jsonb_array_elements(p_configs) as cfg(value)
      where cfg.value->>'id' = gbc.builder_id
    );
end;
$function$;
revoke all on function public.goodies_save_builder_configs(uuid, jsonb) from public;
grant execute on function public.goodies_save_builder_configs(uuid, jsonb) to authenticated;