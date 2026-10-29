create or replace function public.wantiss_has_permission(p_permission text, p_min_level text default 'view')
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.wantiss_admin_staff s
    join auth.users u on u.id = s.user_id
    where s.user_id = (select auth.uid())
      and s.status = 'active'
      and u.email_confirmed_at is not null
      and (s.invitation_expires_at is null or s.invitation_expires_at > now())
      and (
        s.role = 'super_admin'
        or exists (
          select 1 from public.wantiss_admin_permission_grants g
          where g.staff_user_id = s.user_id
            and g.permission_key = p_permission
            and g.revoked_at is null
            and (g.expires_at is null or g.expires_at > now())
            and case p_min_level
              when 'view' then g.access_level in ('view','edit','manage')
              when 'edit' then g.access_level in ('edit','manage')
              when 'manage' then g.access_level = 'manage'
              else false
            end
        )
      )
  );
$$;
revoke all on function public.wantiss_has_permission(text,text) from public, anon;
grant execute on function public.wantiss_has_permission(text,text) to authenticated;

create or replace function public.wantiss_admin_upsert_asset(
  p_asset_key text, p_storage_path text, p_content_type text, p_byte_size bigint,
  p_alt_text jsonb default '{}'::jsonb, p_status text default 'draft'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_id uuid;
begin
  v_id := public.wantiss_admin_register_cms_asset(
    p_asset_key, p_storage_path, p_content_type, p_byte_size, null, null, coalesce(p_alt_text,'{}'::jsonb)
  );
  if p_status not in ('draft','published') then raise exception 'Invalid asset status'; end if;
  if p_status = 'published' then
    perform public.wantiss_admin_set_cms_asset_status(v_id, 'published');
  end if;
  return v_id;
end;
$$;
revoke all on function public.wantiss_admin_upsert_asset(text,text,text,bigint,jsonb,text) from public, anon;
grant execute on function public.wantiss_admin_upsert_asset(text,text,text,bigint,jsonb,text) to authenticated;

create or replace function public.wantiss_admin_list_cms_assets()
returns setof public.wantiss_cms_assets
language sql
stable
security definer
set search_path = ''
as $$
  select a.* from public.wantiss_cms_assets a
  where public.wantiss_has_permission('content.assets','view')
  order by a.created_at desc
  limit 500
$$;
revoke all on function public.wantiss_admin_list_cms_assets() from public, anon;
grant execute on function public.wantiss_admin_list_cms_assets() to authenticated;

create or replace function public.wantiss_cms_published_assets(p_prefix text default null)
returns table(asset_key text, storage_path text, content_type text, alt_text jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select a.asset_key,a.storage_path,a.content_type,a.alt_text
  from public.wantiss_cms_assets a
  where a.status='published' and (p_prefix is null or a.asset_key like p_prefix || '%')
  order by a.created_at desc
$$;
revoke all on function public.wantiss_cms_published_assets(text) from public;
grant execute on function public.wantiss_cms_published_assets(text) to anon, authenticated;
