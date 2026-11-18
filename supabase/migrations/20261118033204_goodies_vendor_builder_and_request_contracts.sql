begin;
-- Builder edits use the same merchant authorization as product editing.
CREATE OR REPLACE FUNCTION public.goodies_save_builder_configs(p_business uuid, p_configs jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_config jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  if p_configs is null or jsonb_typeof(p_configs) <> 'array' then
    raise exception 'Builder configurations must be an array' using errcode = '22023';
  end if;
  if not private.goodies_merchant_can_operate(p_business)
     or exists(select 1 from public.businesses b where b.id=p_business and b.verification='restricted') then
    raise exception 'Not authorized for this business' using errcode = '42501';
  end if;

  for v_config in
    select cfg.value
    from jsonb_array_elements(p_configs) as cfg(value)
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
    do update set
      config = excluded.config,
      enabled = excluded.enabled,
      updated_at = now();
  end loop;

  delete from public.goodies_builder_configs gbc
  where gbc.business_id = p_business
    and not exists (
      select 1
      from jsonb_array_elements(p_configs) as cfg(value)
      where cfg.value->>'id' = gbc.builder_id
    );
end;
$function$;
revoke all on function public.goodies_save_builder_configs(uuid,jsonb) from public,anon;
grant execute on function public.goodies_save_builder_configs(uuid,jsonb) to authenticated;

-- The legacy capped RPC is retained for older clients.
create function public.goodies_list_ingredient_requests_page(p_business uuid,p_offset integer default 0,p_limit integer default 50)
returns table(id uuid,name text,builder text,role text,note text,status text,review_note text,created_at timestamptz,image_path text,library_id text)
language plpgsql stable security definer set search_path='' as $function$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='28000';end if;
 if not exists(select 1 from public.business_members bm where bm.business_id=p_business and bm.user_id=auth.uid() and bm.role in ('owner','admin')) then raise exception 'Not allowed' using errcode='42501';end if;
 return query select r.id,r.name,r.builder,r.role,r.note,r.status,r.review_note,r.created_at,r.image_path,r.library_id
 from public.goodies_ingredient_requests r where r.business_id=p_business
 order by r.created_at desc,r.id desc offset greatest(coalesce(p_offset,0),0) limit least(greatest(coalesce(p_limit,50),1),100);
end $function$;
revoke all on function public.goodies_list_ingredient_requests_page(uuid,integer,integer) from public,anon;
grant execute on function public.goodies_list_ingredient_requests_page(uuid,integer,integer) to authenticated;

-- The operational queue filters waiting requests before paging so older open
-- requests cannot disappear behind recently decided requests.
create function public.wantiss_admin_list_ingredient_requests_page(p_offset integer default 0,p_limit integer default 50,p_waiting boolean default false)
returns table(id uuid,business_id uuid,business_name text,name text,builder text,role text,note text,status text,review_note text,created_at timestamptz,reviewed_at timestamptz,image_path text,admin_asset_key text,library_id text)
language plpgsql stable security definer set search_path='' as $function$
begin
 if not private.goodies_has_staff_permission('goodies.requests','view') then raise exception 'Not allowed' using errcode='42501';end if;
 return query select r.id,r.business_id,b.name::text,r.name,r.builder,r.role,r.note,r.status,r.review_note,r.created_at,r.reviewed_at,r.image_path,r.admin_asset_key,r.library_id
 from public.goodies_ingredient_requests r left join public.businesses b on b.id=r.business_id
 where not coalesce(p_waiting,false) or r.status in ('submitted','needs_info')
 order by r.created_at desc,r.id desc offset greatest(coalesce(p_offset,0),0) limit least(greatest(coalesce(p_limit,50),1),100);
end $function$;
revoke all on function public.wantiss_admin_list_ingredient_requests_page(integer,integer,boolean) from public,anon;
grant execute on function public.wantiss_admin_list_ingredient_requests_page(integer,integer,boolean) to authenticated;
commit;
