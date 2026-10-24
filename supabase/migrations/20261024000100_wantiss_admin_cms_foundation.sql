create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

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
  permission_key text not null check (permission_key ~ '^[a-z][a-z0-9_.-]{1,99}$'),
  access_level text not null check (access_level in ('view', 'edit', 'manage')),
  granted_by uuid not null references auth.users(id),
  reason text not null check (length(trim(reason)) between 3 and 1000),
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check ((revoked_at is null and revoked_by is null) or (revoked_at is not null and revoked_by is not null))
);
create index if not exists wantiss_admin_permission_grants_active_idx
  on public.wantiss_admin_permission_grants (staff_user_id, permission_key, expires_at)
  where revoked_at is null;

create table if not exists public.wantiss_cms_content (
  id uuid primary key default gen_random_uuid(),
  content_key text not null check (length(trim(content_key)) between 1 and 160),
  locale text not null default 'en' check (locale ~ '^[a-z]{2,3}(-[A-Z]{2})?$'),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  version integer not null default 1 check (version > 0),
  payload jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (content_key, locale, version)
);
create index if not exists wantiss_cms_content_public_idx
  on public.wantiss_cms_content (content_key, locale, version desc)
  where status = 'published';

create table if not exists public.wantiss_cms_assets (
  id uuid primary key default gen_random_uuid(),
  asset_key text not null unique,
  storage_path text not null unique,
  content_type text not null check (content_type in ('image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'application/pdf', 'video/mp4')),
  byte_size bigint not null check (byte_size between 1 and 52428800),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  alt_text jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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
create index if not exists wantiss_admin_audit_actor_time_idx
  on public.wantiss_admin_audit_log (actor_user_id, created_at desc);

create table if not exists private.wantiss_admin_bootstrap (
  id boolean primary key default true check (id),
  token_sha256 text not null check (token_sha256 ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
revoke all on private.wantiss_admin_bootstrap from public, anon, authenticated;

create or replace function public.wantiss_has_permission(p_permission text, p_min_level text default 'view')
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.wantiss_admin_staff s
    where s.user_id = (select auth.uid()) and s.status = 'active'
      and (s.role = 'super_admin' or exists (
        select 1 from public.wantiss_admin_permission_grants g
        where g.staff_user_id = s.user_id and g.permission_key = p_permission
          and g.revoked_at is null and (g.expires_at is null or g.expires_at > now())
          and case p_min_level
            when 'view' then g.access_level in ('view', 'edit', 'manage')
            when 'edit' then g.access_level in ('edit', 'manage')
            when 'manage' then g.access_level = 'manage'
            else false
          end
      ))
  );
$$;
revoke all on function public.wantiss_has_permission(text, text) from public, anon;
grant execute on function public.wantiss_has_permission(text, text) to authenticated;

create or replace function public.wantiss_bootstrap_first_super_admin(p_bootstrap_token text, p_display_name text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_token_hash text;
  v_expires_at timestamptz;
  v_consumed_at timestamptz;
  v_name text := trim(coalesce(p_display_name, ''));
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if length(v_name) < 1 or length(v_name) > 120 then
    raise exception 'Display name must be between 1 and 120 characters' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('wantiss-first-super-admin-bootstrap'));
  if exists (select 1 from public.wantiss_admin_staff where role = 'super_admin') then
    raise exception 'First Super Admin has already been established' using errcode = '42501';
  end if;
  select b.token_sha256, b.expires_at, b.consumed_at into v_token_hash, v_expires_at, v_consumed_at
  from private.wantiss_admin_bootstrap b where b.id = true for update;
  if not found or v_consumed_at is not null or v_expires_at <= now() or p_bootstrap_token is null
     or encode(extensions.digest(convert_to(p_bootstrap_token, 'UTF8'), 'sha256'), 'hex') <> v_token_hash then
    raise exception 'Bootstrap authorization is invalid or expired' using errcode = '42501';
  end if;
  insert into public.wantiss_admin_staff (user_id, display_name, status, role, created_by)
  values (v_user_id, v_name, 'active', 'super_admin', v_user_id);
  update private.wantiss_admin_bootstrap set consumed_at = now(), token_sha256 = repeat('0', 64) where id = true;
  insert into public.wantiss_admin_audit_log (actor_user_id, action, resource_type, resource_id, reason, after_state)
  values (v_user_id, 'bootstrap.first_super_admin', 'admin_staff', v_user_id::text,
          'One-time first administrator bootstrap', jsonb_build_object('role', 'super_admin', 'status', 'active'));
  return jsonb_build_object('user_id', v_user_id, 'role', 'super_admin', 'status', 'active');
end;
$$;
revoke all on function public.wantiss_bootstrap_first_super_admin(text, text) from public, anon;
grant execute on function public.wantiss_bootstrap_first_super_admin(text, text) to authenticated;

create or replace function private.wantiss_admin_audit_trigger()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_old jsonb;
  v_new jsonb;
  v_resource_id text;
begin
  if tg_op <> 'INSERT' then v_old := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then v_new := to_jsonb(new); end if;
  v_resource_id := coalesce(v_new->>'id', v_new->>'user_id', v_old->>'id', v_old->>'user_id');
  insert into public.wantiss_admin_audit_log
    (actor_user_id, action, resource_type, resource_id, before_state, after_state)
  values (v_actor, lower(tg_op), tg_table_name, v_resource_id, v_old, v_new);
  return coalesce(new, old);
end;
$$;
revoke all on function private.wantiss_admin_audit_trigger() from public, anon, authenticated;

drop trigger if exists wantiss_admin_staff_audit on public.wantiss_admin_staff;
create trigger wantiss_admin_staff_audit after insert or update or delete on public.wantiss_admin_staff
for each row execute function private.wantiss_admin_audit_trigger();
drop trigger if exists wantiss_admin_grants_audit on public.wantiss_admin_permission_grants;
create trigger wantiss_admin_grants_audit after insert or update or delete on public.wantiss_admin_permission_grants
for each row execute function private.wantiss_admin_audit_trigger();
drop trigger if exists wantiss_cms_content_audit on public.wantiss_cms_content;
create trigger wantiss_cms_content_audit after insert or update or delete on public.wantiss_cms_content
for each row execute function private.wantiss_admin_audit_trigger();
drop trigger if exists wantiss_cms_assets_audit on public.wantiss_cms_assets;
create trigger wantiss_cms_assets_audit after insert or update or delete on public.wantiss_cms_assets
for each row execute function private.wantiss_admin_audit_trigger();

alter table public.wantiss_admin_staff enable row level security;
alter table public.wantiss_admin_permission_grants enable row level security;
alter table public.wantiss_cms_content enable row level security;
alter table public.wantiss_cms_assets enable row level security;
alter table public.wantiss_admin_audit_log enable row level security;

drop policy if exists "Staff can read own staff record" on public.wantiss_admin_staff;
create policy "Staff can read own staff record" on public.wantiss_admin_staff for select to authenticated
using (user_id = (select auth.uid()) or public.wantiss_has_permission('staff.manage', 'manage'));
drop policy if exists "Staff can read own permission grants" on public.wantiss_admin_permission_grants;
create policy "Staff can read own permission grants" on public.wantiss_admin_permission_grants for select to authenticated
using (staff_user_id = (select auth.uid()) or public.wantiss_has_permission('staff.manage', 'manage'));
drop policy if exists "Anyone can read published CMS content" on public.wantiss_cms_content;
create policy "Anyone can read published CMS content" on public.wantiss_cms_content for select to anon, authenticated
using (status = 'published');
drop policy if exists "Authorized staff can manage CMS content" on public.wantiss_cms_content;
create policy "Authorized staff can manage CMS content" on public.wantiss_cms_content for all to authenticated
using (public.wantiss_has_permission('content.manage', 'edit'))
with check (public.wantiss_has_permission('content.manage', 'edit'));
drop policy if exists "Anyone can read published CMS asset metadata" on public.wantiss_cms_assets;
create policy "Anyone can read published CMS asset metadata" on public.wantiss_cms_assets for select to anon, authenticated
using (status = 'published');
drop policy if exists "Authorized staff can manage CMS asset metadata" on public.wantiss_cms_assets;
create policy "Authorized staff can manage CMS asset metadata" on public.wantiss_cms_assets for all to authenticated
using (public.wantiss_has_permission('content.manage', 'edit'))
with check (public.wantiss_has_permission('content.manage', 'edit'));
drop policy if exists "Authorized staff can read admin audit log" on public.wantiss_admin_audit_log;
create policy "Authorized staff can read admin audit log" on public.wantiss_admin_audit_log for select to authenticated
using (public.wantiss_has_permission('audit.read', 'view'));

revoke all on public.wantiss_admin_staff from anon, authenticated;
revoke all on public.wantiss_admin_permission_grants from anon, authenticated;
revoke all on public.wantiss_admin_audit_log from anon, authenticated;
grant select on public.wantiss_admin_staff, public.wantiss_admin_permission_grants to authenticated;
grant select on public.wantiss_admin_audit_log to authenticated;
revoke all on public.wantiss_cms_content from anon, authenticated;
revoke all on public.wantiss_cms_assets from anon, authenticated;
grant select on public.wantiss_cms_content, public.wantiss_cms_assets to anon, authenticated;
grant insert, update, delete on public.wantiss_cms_content, public.wantiss_cms_assets to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wantiss-cms-assets', 'wantiss-cms-assets', false, 52428800,
        array['image/jpeg','image/png','image/webp','image/svg+xml','application/pdf','video/mp4'])
on conflict (id) do update set public = false, file_size_limit = 52428800, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Authorized staff upload CMS assets" on storage.objects;
create policy "Authorized staff upload CMS assets" on storage.objects for insert to authenticated
with check (bucket_id = 'wantiss-cms-assets' and public.wantiss_has_permission('content.manage', 'edit'));
drop policy if exists "Authorized staff update CMS assets" on storage.objects;
create policy "Authorized staff update CMS assets" on storage.objects for update to authenticated
using (bucket_id = 'wantiss-cms-assets' and public.wantiss_has_permission('content.manage', 'edit'))
with check (bucket_id = 'wantiss-cms-assets' and public.wantiss_has_permission('content.manage', 'edit'));
drop policy if exists "Authorized staff delete CMS assets" on storage.objects;
create policy "Authorized staff delete CMS assets" on storage.objects for delete to authenticated
using (bucket_id = 'wantiss-cms-assets' and public.wantiss_has_permission('content.manage', 'edit'));
drop policy if exists "Authorized staff read CMS assets" on storage.objects;
create policy "Authorized staff read CMS assets" on storage.objects for select to authenticated
using (bucket_id = 'wantiss-cms-assets' and public.wantiss_has_permission('content.manage', 'view'));
