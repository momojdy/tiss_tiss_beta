create or replace function public.wantiss_admin_upsert_asset(
  p_asset_key text,
  p_storage_path text,
  p_content_type text,
  p_byte_size bigint,
  p_alt_text jsonb default '{}'::jsonb,
  p_status text default 'draft'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_id uuid;
begin
  if v_actor is null or not public.wantiss_has_permission('content.assets', 'edit') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if p_status not in ('draft', 'published', 'archived') then raise exception 'Invalid asset status'; end if;
  if p_status = 'published' and not public.wantiss_has_permission('content.publish', 'manage') then
    raise exception 'Publishing requires content.publish manage permission' using errcode = '42501';
  end if;
  if p_status = 'archived' and not public.wantiss_has_permission('content.archive', 'manage') then
    raise exception 'Archiving requires content.archive manage permission' using errcode = '42501';
  end if;
  if (storage.foldername(p_storage_path))[1] <> v_actor::text then
    raise exception 'Asset path must be scoped to the authenticated user' using errcode = '42501';
  end if;

  insert into public.wantiss_cms_assets(asset_key, storage_path, content_type, byte_size, alt_text, status, created_by, updated_by, published_by, published_at)
  values (
    trim(p_asset_key), p_storage_path, p_content_type, p_byte_size, coalesce(p_alt_text, '{}'::jsonb), p_status, v_actor, v_actor,
    case when p_status = 'published' then v_actor else null end,
    case when p_status = 'published' then now() else null end
  )
  on conflict (asset_key) do update set
    storage_path = excluded.storage_path,
    content_type = excluded.content_type,
    byte_size = excluded.byte_size,
    alt_text = excluded.alt_text,
    status = excluded.status,
    updated_by = v_actor,
    updated_at = now(),
    published_by = case when excluded.status = 'published' then v_actor else null end,
    published_at = case when excluded.status = 'published' then now() else null end
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.wantiss_admin_upsert_asset(text, text, text, bigint, jsonb, text) from public, anon;
grant execute on function public.wantiss_admin_upsert_asset(text, text, text, bigint, jsonb, text) to authenticated;

create or replace function public.wantiss_public_content(p_locale text default 'en')
returns setof public.wantiss_cms_content
language sql
stable
security invoker
set search_path = ''
as $$
  select c.*
  from public.wantiss_cms_content c
  where c.status = 'published'
    and c.locale = p_locale
    and c.version = (
      select max(c2.version) from public.wantiss_cms_content c2
      where c2.content_key = c.content_key and c2.locale = c.locale and c2.status = 'published'
    )
  order by c.content_key;
$$;
revoke all on function public.wantiss_public_content(text) from public;
grant execute on function public.wantiss_public_content(text) to anon, authenticated;

create or replace function public.wantiss_admin_audit_read()
returns setof public.wantiss_admin_audit_log
language sql
stable
security invoker
set search_path = ''
as $$
  select a.* from public.wantiss_admin_audit_log a
  where public.wantiss_has_permission('audit.read', 'view')
  order by a.created_at desc
  limit 500;
$$;
revoke all on function public.wantiss_admin_audit_read() from public, anon;
grant execute on function public.wantiss_admin_audit_read() to authenticated;

drop policy if exists wantiss_cms_asset_select on storage.objects;
create policy wantiss_cms_asset_select on storage.objects for select to authenticated
using (bucket_id = 'wantiss-cms-assets' and public.wantiss_has_permission('content.assets', 'view'));

drop policy if exists wantiss_cms_asset_upload on storage.objects;
create policy wantiss_cms_asset_upload on storage.objects for insert to authenticated
with check (bucket_id = 'wantiss-cms-assets' and public.wantiss_has_permission('content.assets', 'edit') and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists wantiss_cms_asset_update on storage.objects;
create policy wantiss_cms_asset_update on storage.objects for update to authenticated
using (bucket_id = 'wantiss-cms-assets' and public.wantiss_has_permission('content.assets', 'edit') and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'wantiss-cms-assets' and public.wantiss_has_permission('content.assets', 'edit') and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists wantiss_cms_asset_delete on storage.objects;
create policy wantiss_cms_asset_delete on storage.objects for delete to authenticated
using (bucket_id = 'wantiss-cms-assets' and public.wantiss_has_permission('content.assets', 'manage') and (storage.foldername(name))[1] = (select auth.uid())::text);
