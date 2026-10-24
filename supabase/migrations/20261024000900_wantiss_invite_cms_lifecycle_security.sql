create or replace function public.wantiss_has_permission(p_permission text, p_min_level text default 'view')
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.wantiss_admin_staff s
    join auth.users u on u.id=s.user_id
    where s.user_id=(select auth.uid()) and s.status='active'
      and u.email_confirmed_at is not null
      and (s.invitation_expires_at is null or s.invitation_expires_at>now())
      and (s.invited_at is null or u.raw_user_meta_data->>'wantiss_invite_accepted'='true')
      and (s.role='super_admin' or exists (
        select 1 from public.wantiss_admin_permission_grants g
        where g.staff_user_id=s.user_id and g.permission_key=p_permission
          and g.revoked_at is null and (g.expires_at is null or g.expires_at>now())
          and case p_min_level when 'view' then g.access_level in ('view','edit','manage')
            when 'edit' then g.access_level in ('edit','manage') when 'manage' then g.access_level='manage' else false end
      ))
  );
$$;
revoke all on function public.wantiss_has_permission(text,text) from public, anon;
grant execute on function public.wantiss_has_permission(text,text) to authenticated;

create or replace function public.wantiss_admin_save_cms_draft(p_content_key text,p_locale text,p_payload jsonb)
returns uuid language plpgsql security definer set search_path = ''
as $$
begin
  return public.wantiss_admin_upsert_cms_version(p_content_key,p_locale,p_payload,'draft');
end;
$$;
revoke all on function public.wantiss_admin_save_cms_draft(text,text,jsonb) from public, anon;
grant execute on function public.wantiss_admin_save_cms_draft(text,text,jsonb) to authenticated;

create or replace function public.wantiss_admin_publish_cms_version(p_content_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_actor uuid := (select auth.uid()); v_row public.wantiss_cms_content%rowtype;
begin
  if v_actor is null or not public.wantiss_has_permission('content.publish','manage') then raise exception 'Not authorized' using errcode='42501'; end if;
  select * into v_row from public.wantiss_cms_content where id=p_content_id for update;
  if not found or v_row.status<>'draft' then raise exception 'Draft content not found'; end if;
  update public.wantiss_cms_content set status='archived',updated_by=v_actor,updated_at=now()
    where content_key=v_row.content_key and locale=v_row.locale and status='published';
  update public.wantiss_cms_content set status='published',published_by=v_actor,published_at=now(),updated_by=v_actor,updated_at=now() where id=p_content_id;
  insert into public.wantiss_admin_audit_log(actor_user_id,action,resource_type,resource_id,reason,after_state)
  values(v_actor,'cms_content_published','cms_content',p_content_id::text,'publish',jsonb_build_object('content_key',v_row.content_key,'locale',v_row.locale,'version',v_row.version));
end;
$$;
revoke all on function public.wantiss_admin_publish_cms_version(uuid) from public, anon;
grant execute on function public.wantiss_admin_publish_cms_version(uuid) to authenticated;

create or replace function public.wantiss_admin_archive_cms_version(p_content_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_actor uuid := (select auth.uid());
begin
  if v_actor is null or not public.wantiss_has_permission('content.archive','manage') then raise exception 'Not authorized' using errcode='42501'; end if;
  update public.wantiss_cms_content set status='archived',updated_by=v_actor,updated_at=now()
  where id=p_content_id and status in ('draft','published');
  if not found then raise exception 'Content version not found'; end if;
  insert into public.wantiss_admin_audit_log(actor_user_id,action,resource_type,resource_id,reason)
  values(v_actor,'cms_content_archived','cms_content',p_content_id::text,'archive');
end;
$$;
revoke all on function public.wantiss_admin_archive_cms_version(uuid) from public, anon;
grant execute on function public.wantiss_admin_archive_cms_version(uuid) to authenticated;

create or replace function public.wantiss_admin_upsert_asset(
  p_asset_key text,p_storage_path text,p_content_type text,p_byte_size bigint,p_alt_text jsonb default '{}'::jsonb,p_status text default 'draft'
)
returns uuid language plpgsql security definer set search_path = ''
as $$
begin
  if p_status<>'draft' then raise exception 'Assets must be uploaded as drafts and published separately'; end if;
  return public.wantiss_admin_register_cms_asset(p_asset_key,p_storage_path,p_content_type,p_byte_size,null,null,coalesce(p_alt_text,'{}'::jsonb));
end;
$$;
revoke all on function public.wantiss_admin_upsert_asset(text,text,text,bigint,jsonb,text) from public, anon;
grant execute on function public.wantiss_admin_upsert_asset(text,text,text,bigint,jsonb,text) to authenticated;

drop policy if exists wantiss_cms_asset_upload on storage.objects;
create policy wantiss_cms_asset_upload on storage.objects for insert to authenticated
with check (bucket_id='wantiss-cms-assets'
  and public.wantiss_has_permission('content.assets','edit')
  and (storage.foldername(name))[1]=(select auth.uid())::text
  and lower(storage.extension(name)) in ('jpg','jpeg','png','webp','gif','mp4'));

drop policy if exists wantiss_audit_insert on public.wantiss_admin_audit_log;
drop policy if exists wantiss_audit_update on public.wantiss_admin_audit_log;
drop policy if exists wantiss_audit_delete on public.wantiss_admin_audit_log;
revoke insert, update, delete on public.wantiss_admin_audit_log from anon, authenticated;
