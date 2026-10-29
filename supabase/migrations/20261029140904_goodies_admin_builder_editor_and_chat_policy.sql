create or replace function public.wantiss_admin_list_goodies_builder_configs()
returns table (
  business_id uuid,
  business_name text,
  builder_id text,
  config jsonb,
  enabled boolean,
  updated_at timestamptz
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
  select gbc.business_id, coalesce(b.name::text, 'Unknown business'), gbc.builder_id, gbc.config, gbc.enabled, gbc.updated_at
  from public.goodies_builder_configs gbc
  left join public.businesses b on b.id = gbc.business_id
  order by b.name nulls last, gbc.updated_at desc, gbc.builder_id;
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

  v_enabled := coalesce(p_enabled, false)
    and coalesce((p_config->>'enabled')::boolean, false)
    and coalesce((p_config->>'available')::boolean, false);

  update public.goodies_builder_configs
  set config = p_config, enabled = v_enabled, updated_at = now()
  where business_id = p_business_id and builder_id = trim(p_builder_id);

  if not found then raise exception 'Builder config not found for this business' using errcode = 'P0001'; end if;
  return true;
end;
$function$;

revoke all on function public.wantiss_admin_list_goodies_builder_configs() from public, anon;
revoke all on function public.wantiss_admin_save_goodies_builder_config(uuid, text, jsonb, boolean) from public, anon;
grant execute on function public.wantiss_admin_list_goodies_builder_configs() to authenticated;
grant execute on function public.wantiss_admin_save_goodies_builder_config(uuid, text, jsonb, boolean) to authenticated;

drop policy if exists "Participants and business members can send messages" on public.messages;
drop policy if exists "Business members can reply to store messages" on public.messages;
drop policy if exists "Goodies chat participants send only as customer or store member" on public.messages;
create policy "Goodies chat participants send only as customer or store member"
on public.messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
      and (
        (
          c.feature = 'goodies'
          and (
            c.customer_id = (select auth.uid())
            or exists (
              select 1 from public.business_members bm
              where bm.business_id = c.business_id and bm.user_id = (select auth.uid())
            )
          )
        )
        or (
          coalesce(c.feature, '') <> 'goodies'
          and (
            (select auth.uid()) = any(c.participant_ids)
            or exists (
              select 1 from public.business_members bm
              where bm.business_id = c.business_id and bm.user_id = (select auth.uid())
            )
          )
        )
      )
  )
);
