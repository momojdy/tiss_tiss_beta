alter table public.wantiss_admin_staff
  add column if not exists invited_at timestamptz,
  add column if not exists invitation_expires_at timestamptz,
  add column if not exists invited_by uuid references auth.users(id) on delete set null;

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
      and (s.invitation_expires_at is null or s.invitation_expires_at > now() or u.email_confirmed_at is not null)
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

create or replace function public.wantiss_admin_audit_read()
returns setof public.wantiss_admin_audit_log
language sql
stable
security definer
set search_path = ''
as $$
  select a.* from public.wantiss_admin_audit_log a
  where public.wantiss_has_permission('audit.read','view')
  order by a.created_at desc
  limit 500
$$;
revoke all on function public.wantiss_admin_audit_read() from public, anon;
grant execute on function public.wantiss_admin_audit_read() to authenticated;

create or replace function public.wantiss_admin_register_cms_asset(
  p_asset_key text, p_storage_path text, p_content_type text, p_byte_size bigint,
  p_width integer default null, p_height integer default null, p_alt_text jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_id uuid; v_actor uuid := auth.uid();
begin
  if v_actor is null or not public.wantiss_has_permission('content.assets','edit') then
    raise exception 'Not authorized' using errcode='42501';
  end if;
  if split_part(p_storage_path,'/',1) <> v_actor::text or length(p_storage_path)>512 then
    raise exception 'Asset path must be in the authenticated staff folder' using errcode='42501';
  end if;
  insert into public.wantiss_cms_assets(asset_key,storage_path,content_type,byte_size,width,height,alt_text,status,created_by,updated_by)
  values (trim(p_asset_key),p_storage_path,p_content_type,p_byte_size,p_width,p_height,coalesce(p_alt_text,'{}'::jsonb),'draft',v_actor,v_actor)
  returning id into v_id;
  insert into public.wantiss_admin_audit_log(actor_user_id,action,resource_type,resource_id,reason,after_state)
  values(v_actor,'cms_asset_registered','cms_asset',v_id::text,'draft',jsonb_build_object('asset_key',p_asset_key,'storage_path',p_storage_path,'byte_size',p_byte_size));
  return v_id;
end;
$$;

create or replace function public.wantiss_admin_set_cms_asset_status(p_asset_id uuid,p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_actor uuid := auth.uid();
begin
  if v_actor is null or p_status not in ('published','archived') then
    raise exception 'Invalid request';
  end if;
  if p_status='published' and not public.wantiss_has_permission('content.assets','manage') then
    raise exception 'Publishing assets requires content.assets manage' using errcode='42501';
  end if;
  if p_status='archived' and not public.wantiss_has_permission('content.archive','manage') then
    raise exception 'Archiving assets requires content.archive manage' using errcode='42501';
  end if;
  update public.wantiss_cms_assets set status=p_status,updated_by=v_actor,
    published_by=case when p_status='published' then v_actor else published_by end,
    published_at=case when p_status='published' then now() else published_at end,
    updated_at=now()
  where id=p_asset_id and status <> 'archived';
  if not found then raise exception 'Asset not found or already archived'; end if;
end;
$$;

create or replace function public.wantiss_cms_published_content(p_locale text default 'en')
returns table(content_key text, locale text, version integer, payload jsonb, updated_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select c.content_key,c.locale,c.version,c.payload,c.updated_at
  from public.wantiss_cms_content c
  where c.status='published' and c.locale=p_locale
    and c.version=(select max(c2.version) from public.wantiss_cms_content c2 where c2.content_key=c.content_key and c2.locale=c.locale and c2.status='published')
  order by c.content_key
$$;
revoke all on function public.wantiss_cms_published_content(text) from public;
grant execute on function public.wantiss_cms_published_content(text) to anon, authenticated;

revoke all on function public.wantiss_admin_register_cms_asset(text,text,text,bigint,integer,integer,jsonb) from public,anon;
revoke all on function public.wantiss_admin_set_cms_asset_status(uuid,text) from public,anon;
grant execute on function public.wantiss_admin_register_cms_asset(text,text,text,bigint,integer,integer,jsonb) to authenticated;
grant execute on function public.wantiss_admin_set_cms_asset_status(uuid,text) to authenticated;

drop policy if exists wantiss_cms_asset_select on storage.objects;
create policy wantiss_cms_asset_select on storage.objects for select to authenticated
using (bucket_id='wantiss-cms-assets' and public.wantiss_has_permission('content.assets','view'));

drop policy if exists wantiss_cms_asset_delete on storage.objects;
create policy wantiss_cms_asset_delete on storage.objects for delete to authenticated
using (bucket_id='wantiss-cms-assets' and public.wantiss_has_permission('content.assets','manage') and (storage.foldername(name))[1]=(select auth.uid())::text);
