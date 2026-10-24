create table if not exists public.wantiss_admin_staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 1 and 120),
  status text not null default 'active' check (status in ('active', 'suspended', 'revoked')),
  role text not null default 'staff' check (role in ('super_admin', 'staff')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wantiss_admin_permission_grants (
  id uuid primary key default gen_random_uuid(),
  staff_user_id uuid not null references public.wantiss_admin_staff(user_id) on delete cascade,
  permission_key text not null check (permission_key ~ '^[a-z][a-z0-9_.-]{1,79}$'),
  access_level text not null check (access_level in ('view', 'edit', 'manage')),
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  granted_by uuid not null references auth.users(id),
  reason text not null check (length(trim(reason)) between 3 and 500),
  created_at timestamptz not null default now(),
  check ((revoked_at is null and revoked_by is null) or (revoked_at is not null and revoked_by is not null))
);

create index if not exists wantiss_admin_grants_lookup_idx
  on public.wantiss_admin_permission_grants (staff_user_id, permission_key, expires_at)
  where revoked_at is null;

create table if not exists public.wantiss_cms_content (
  id uuid primary key default gen_random_uuid(),
  content_key text not null check (length(trim(content_key)) between 1 and 160),
  locale text not null default 'en' check (locale ~ '^[a-z]{2,3}(-[A-Z]{2})?$'),
  version integer not null default 1 check (version > 0),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  payload jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  published_by uuid references auth.users(id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (content_key, locale, version),
  check ((status = 'published' and published_at is not null and published_by is not null) or status <> 'published')
);

create index if not exists wantiss_cms_public_lookup_idx
  on public.wantiss_cms_content (content_key, locale, version desc)
  where status = 'published';

create table if not exists public.wantiss_cms_assets (
  id uuid primary key default gen_random_uuid(),
  asset_key text not null unique check (length(trim(asset_key)) between 1 and 160),
  storage_path text not null unique,
  content_type text not null check (content_type in ('image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4')),
  byte_size bigint not null check (byte_size between 1 and 10485760),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  alt_text jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  published_by uuid references auth.users(id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'published' and published_at is not null and published_by is not null) or status <> 'published')
);

create table if not exists public.wantiss_admin_audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id text,
  reason text,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default now()
);

create index if not exists wantiss_admin_audit_resource_time_idx
  on public.wantiss_admin_audit_log (resource_type, resource_id, created_at desc);
create index if not exists wantiss_admin_audit_actor_time_idx
  on public.wantiss_admin_audit_log (actor_user_id, created_at desc);

create or replace function public.wantiss_bootstrap_super_admin(p_user_id uuid, p_display_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('wantiss:first-super-admin-bootstrap', 0));

  if exists (select 1 from public.wantiss_admin_staff where role = 'super_admin') then
    raise exception 'Super Admin bootstrap has already been used' using errcode = '23505';
  end if;

  if p_user_id is null or not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'A valid authenticated user is required';
  end if;

  insert into public.wantiss_admin_staff(user_id, display_name, status, role)
  values (p_user_id, left(coalesce(nullif(trim(p_display_name), ''), 'Super Admin'), 120), 'active', 'super_admin');
end;
$$;

revoke all on function public.wantiss_bootstrap_super_admin(uuid, text) from public, anon, authenticated;
grant execute on function public.wantiss_bootstrap_super_admin(uuid, text) to service_role;

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
    where s.user_id = (select auth.uid())
      and s.status = 'active'
      and (
        s.role = 'super_admin'
        or exists (
          select 1
          from public.wantiss_admin_permission_grants g
          where g.staff_user_id = s.user_id
            and g.permission_key = p_permission
            and g.revoked_at is null
            and (g.expires_at is null or g.expires_at > now())
            and case p_min_level
              when 'view' then g.access_level in ('view', 'edit', 'manage')
              when 'edit' then g.access_level in ('edit', 'manage')
              when 'manage' then g.access_level = 'manage'
              else false
            end
        )
      )
  );
$$;

revoke all on function public.wantiss_has_permission(text, text) from public, anon;
grant execute on function public.wantiss_has_permission(text, text) to authenticated;

create or replace function public.wantiss_admin_audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_old jsonb;
  v_new jsonb;
  v_id text;
  v_action text;
begin
  if tg_op = 'DELETE' then
    v_old := to_jsonb(old);
    v_new := null;
    v_id := coalesce(v_old ->> 'user_id', v_old ->> 'id');
    v_action := 'delete';
  elsif tg_op = 'INSERT' then
    v_old := null;
    v_new := to_jsonb(new);
    v_id := coalesce(v_new ->> 'user_id', v_new ->> 'id');
    v_action := 'insert';
  else
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
    v_id := coalesce(v_new ->> 'user_id', v_new ->> 'id');
    v_action := 'update';
  end if;

  insert into public.wantiss_admin_audit_log(actor_user_id, action, resource_type, resource_id, before_state, after_state)
  values (v_actor, v_action, tg_table_name, v_id, v_old, v_new);

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function public.wantiss_admin_audit_trigger() from public, anon, authenticated;

drop trigger if exists wantiss_admin_staff_audit on public.wantiss_admin_staff;
create trigger wantiss_admin_staff_audit after insert or update or delete on public.wantiss_admin_staff
for each row execute function public.wantiss_admin_audit_trigger();

drop trigger if exists wantiss_admin_grants_audit on public.wantiss_admin_permission_grants;
create trigger wantiss_admin_grants_audit after insert or update or delete on public.wantiss_admin_permission_grants
for each row execute function public.wantiss_admin_audit_trigger();

drop trigger if exists wantiss_cms_content_audit on public.wantiss_cms_content;
create trigger wantiss_cms_content_audit after insert or update or delete on public.wantiss_cms_content
for each row execute function public.wantiss_admin_audit_trigger();

drop trigger if exists wantiss_cms_assets_audit on public.wantiss_cms_assets;
create trigger wantiss_cms_assets_audit after insert or update or delete on public.wantiss_cms_assets
for each row execute function public.wantiss_admin_audit_trigger();

create or replace function public.wantiss_admin_set_staff_status(
  p_user_id uuid,
  p_status text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (select 1 from public.wantiss_admin_staff a where a.user_id = (select auth.uid()) and a.status = 'active' and a.role = 'super_admin') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if p_status not in ('active', 'suspended', 'revoked') then
    raise exception 'Invalid staff status';
  end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then
    raise exception 'A reason is required';
  end if;
  if exists (
    select 1 from public.wantiss_admin_staff s
    where s.user_id = p_user_id and s.role = 'super_admin'
      and p_status <> 'active'
      and (select count(*) from public.wantiss_admin_staff x where x.role = 'super_admin' and x.status = 'active') <= 1
  ) then
    raise exception 'Cannot deactivate the last active Super Admin';
  end if;

  update public.wantiss_admin_staff
  set status = p_status, updated_at = now()
  where user_id = p_user_id;

  if not found then raise exception 'Staff record not found'; end if;

  insert into public.wantiss_admin_audit_log(actor_user_id, action, resource_type, resource_id, reason)
  values (auth.uid(), 'staff_status_changed', 'staff', p_user_id::text, p_reason);
end;
$$;

create or replace function public.wantiss_admin_grant_permission(
  p_staff_user_id uuid,
  p_permission_key text,
  p_access_level text,
  p_reason text,
  p_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null or not exists (select 1 from public.wantiss_admin_staff a where a.user_id = (select auth.uid()) and a.status = 'active' and a.role = 'super_admin') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if p_access_level not in ('view', 'edit', 'manage') then raise exception 'Invalid access level'; end if;
  if p_permission_key !~ '^[a-z][a-z0-9_.-]{1,79}$' then raise exception 'Invalid permission key'; end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'A reason is required'; end if;
  if p_expires_at is not null and p_expires_at <= now() then raise exception 'Expiry must be in the future'; end if;
  if not exists (select 1 from public.wantiss_admin_staff where user_id = p_staff_user_id and status = 'active' and role = 'staff') then
    raise exception 'Target must be an active staff account';
  end if;

  insert into public.wantiss_admin_permission_grants(staff_user_id, permission_key, access_level, reason, expires_at, granted_by)
  values (p_staff_user_id, p_permission_key, p_access_level, trim(p_reason), p_expires_at, auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.wantiss_admin_revoke_permission(p_grant_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (select 1 from public.wantiss_admin_staff a where a.user_id = (select auth.uid()) and a.status = 'active' and a.role = 'super_admin') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'A reason is required'; end if;
  update public.wantiss_admin_permission_grants
  set revoked_at = now(), revoked_by = auth.uid(), reason = reason || ' | Revoked: ' || trim(p_reason)
  where id = p_grant_id and revoked_at is null;
  if not found then raise exception 'Active permission grant not found'; end if;
end;
$$;

create or replace function public.wantiss_admin_upsert_cms_version(
  p_content_key text,
  p_locale text,
  p_payload jsonb,
  p_status text default 'draft'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_version integer;
  v_actor uuid := auth.uid();
begin
  if v_actor is null or not public.wantiss_has_permission('content.manage', 'edit') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_content_key, ''))) not between 1 and 160 then raise exception 'Invalid content key'; end if;
  if p_locale !~ '^[a-z]{2,3}(-[A-Z]{2})?$' then raise exception 'Invalid locale'; end if;
  if p_status not in ('draft', 'published', 'archived') then raise exception 'Invalid content status'; end if;
  if p_status = 'published' and not public.wantiss_has_permission('content.publish', 'manage') then
    raise exception 'Publishing requires content.publish manage permission' using errcode = '42501';
  end if;
  if p_status = 'archived' and not public.wantiss_has_permission('content.archive', 'manage') then
    raise exception 'Archiving requires content.archive manage permission' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(trim(p_content_key) || ':' || p_locale, 0));

  select coalesce(max(c.version), 0) + 1 into v_version
  from public.wantiss_cms_content c
  where c.content_key = p_content_key and c.locale = p_locale;

  insert into public.wantiss_cms_content(content_key, locale, version, payload, status, created_by, updated_by, published_by, published_at)
  values (
    trim(p_content_key), p_locale, v_version, coalesce(p_payload, '{}'::jsonb), p_status, v_actor, v_actor,
    case when p_status = 'published' then v_actor else null end,
    case when p_status = 'published' then now() else null end
  )
  returning id into v_id;

  insert into public.wantiss_admin_audit_log(actor_user_id, action, resource_type, resource_id, reason, after_state)
  values (v_actor, 'cms_version_created', 'cms_content', v_id::text, 'status=' || p_status, jsonb_build_object('content_key', p_content_key, 'locale', p_locale, 'status', p_status, 'version', v_version));

  return v_id;
end;
$$;

revoke all on function public.wantiss_admin_set_staff_status(uuid, text, text) from public, anon;
revoke all on function public.wantiss_admin_grant_permission(uuid, text, text, text, timestamptz) from public, anon;
revoke all on function public.wantiss_admin_revoke_permission(uuid, text) from public, anon;
revoke all on function public.wantiss_admin_upsert_cms_version(text, text, jsonb, text) from public, anon;
grant execute on function public.wantiss_admin_set_staff_status(uuid, text, text) to authenticated;
grant execute on function public.wantiss_admin_grant_permission(uuid, text, text, text, timestamptz) to authenticated;
grant execute on function public.wantiss_admin_revoke_permission(uuid, text) to authenticated;
grant execute on function public.wantiss_admin_upsert_cms_version(text, text, jsonb, text) to authenticated;

alter table public.wantiss_admin_staff enable row level security;
alter table public.wantiss_admin_permission_grants enable row level security;
alter table public.wantiss_cms_content enable row level security;
alter table public.wantiss_cms_assets enable row level security;
alter table public.wantiss_admin_audit_log enable row level security;

drop policy if exists wantiss_admin_staff_select on public.wantiss_admin_staff;
create policy wantiss_admin_staff_select on public.wantiss_admin_staff for select to authenticated
using (user_id = (select auth.uid()) or public.wantiss_has_permission('staff.manage', 'manage'));

drop policy if exists wantiss_admin_grants_select on public.wantiss_admin_permission_grants;
create policy wantiss_admin_grants_select on public.wantiss_admin_permission_grants for select to authenticated
using (staff_user_id = (select auth.uid()) or public.wantiss_has_permission('staff.manage', 'manage'));

drop policy if exists wantiss_cms_public_published_select on public.wantiss_cms_content;
create policy wantiss_cms_public_published_select on public.wantiss_cms_content for select to anon, authenticated
using (status = 'published');

drop policy if exists wantiss_cms_staff_select on public.wantiss_cms_content;
create policy wantiss_cms_staff_select on public.wantiss_cms_content for select to authenticated
using (public.wantiss_has_permission('content.manage', 'view'));

drop policy if exists wantiss_cms_assets_staff_select on public.wantiss_cms_assets;
create policy wantiss_cms_assets_staff_select on public.wantiss_cms_assets for select to authenticated
using (public.wantiss_has_permission('content.assets', 'view'));

drop policy if exists wantiss_admin_audit_select on public.wantiss_admin_audit_log;
create policy wantiss_admin_audit_select on public.wantiss_admin_audit_log for select to authenticated
using (public.wantiss_has_permission('audit.read', 'view'));

revoke all on public.wantiss_admin_staff from anon, authenticated;
revoke all on public.wantiss_admin_permission_grants from anon, authenticated;
revoke all on public.wantiss_cms_content from anon, authenticated;
revoke all on public.wantiss_cms_assets from anon, authenticated;
revoke all on public.wantiss_admin_audit_log from anon, authenticated;

grant select on public.wantiss_admin_staff, public.wantiss_admin_permission_grants to authenticated;
grant select on public.wantiss_cms_content to anon, authenticated;
grant select on public.wantiss_cms_assets to authenticated;
grant select on public.wantiss_admin_audit_log to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wantiss-cms-assets', 'wantiss-cms-assets', false, 10485760, array['image/jpeg','image/png','image/webp','image/gif','video/mp4'])
on conflict (id) do update set public = false, file_size_limit = 10485760, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists wantiss_cms_asset_upload on storage.objects;
create policy wantiss_cms_asset_upload on storage.objects for insert to authenticated
with check (bucket_id = 'wantiss-cms-assets' and public.wantiss_has_permission('content.assets', 'edit') and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists wantiss_cms_asset_update on storage.objects;
create policy wantiss_cms_asset_update on storage.objects for update to authenticated
using (bucket_id = 'wantiss-cms-assets' and public.wantiss_has_permission('content.assets', 'edit') and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'wantiss-cms-assets' and public.wantiss_has_permission('content.assets', 'edit') and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists wantiss_cms_asset_select on storage.objects;
create policy wantiss_cms_asset_select on storage.objects for select to authenticated
using (bucket_id = 'wantiss-cms-assets' and public.wantiss_has_permission('content.assets', 'view'));

drop policy if exists wantiss_cms_asset_delete on storage.objects;
create policy wantiss_cms_asset_delete on storage.objects for delete to authenticated
using (bucket_id = 'wantiss-cms-assets' and public.wantiss_has_permission('content.assets', 'manage') and (storage.foldername(name))[1] = (select auth.uid())::text);
