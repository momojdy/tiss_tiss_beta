create table if not exists public.wantiss_admin_staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  status text not null default 'active' check (status in ('active', 'suspended', 'revoked')),
  role text not null default 'staff' check (role in ('super_admin', 'staff')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wantiss_admin_permission_grants (
  id uuid primary key default gen_random_uuid(),
  staff_user_id uuid not null references public.wantiss_admin_staff(user_id) on delete cascade,
  permission_key text not null,
  access_level text not null default 'view' check (access_level in ('view', 'edit', 'manage')),
  granted_by uuid not null references auth.users(id),
  reason text not null,
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check (revoked_at is null or revoked_by is not null)
);

create index if not exists wantiss_admin_permission_grants_active_idx
  on public.wantiss_admin_permission_grants (staff_user_id, permission_key, expires_at)
  where revoked_at is null;

create table if not exists public.wantiss_cms_content (
  id uuid primary key default gen_random_uuid(),
  content_key text not null,
  locale text not null default 'en',
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
  content_type text not null,
  byte_size bigint not null check (byte_size >= 0),
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

create or replace function public.wantiss_has_permission(p_permission text, p_min_level text default 'view')
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
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

alter table public.wantiss_admin_staff enable row level security;
alter table public.wantiss_admin_permission_grants enable row level security;
alter table public.wantiss_cms_content enable row level security;
alter table public.wantiss_cms_assets enable row level security;
alter table public.wantiss_admin_audit_log enable row level security;

create policy "Staff can read own staff record"
  on public.wantiss_admin_staff for select to authenticated
  using (user_id = (select auth.uid()) or public.wantiss_has_permission('staff.manage', 'manage'));

create policy "Authorized admins can manage staff"
  on public.wantiss_admin_staff for all to authenticated
  using (public.wantiss_has_permission('staff.manage', 'manage'))
  with check (public.wantiss_has_permission('staff.manage', 'manage'));

create policy "Staff can read own permission grants"
  on public.wantiss_admin_permission_grants for select to authenticated
  using (staff_user_id = (select auth.uid()) or public.wantiss_has_permission('staff.manage', 'manage'));

create policy "Authorized admins can manage permission grants"
  on public.wantiss_admin_permission_grants for all to authenticated
  using (public.wantiss_has_permission('staff.manage', 'manage'))
  with check (public.wantiss_has_permission('staff.manage', 'manage'));

create policy "Anyone can read published CMS content"
  on public.wantiss_cms_content for select to anon, authenticated
  using (status = 'published');

create policy "Authorized staff can manage CMS content"
  on public.wantiss_cms_content for all to authenticated
  using (public.wantiss_has_permission('content.manage', 'edit'))
  with check (public.wantiss_has_permission('content.manage', 'edit'));

create policy "Anyone can read published CMS asset metadata"
  on public.wantiss_cms_assets for select to anon, authenticated
  using (status = 'published');

create policy "Authorized staff can manage CMS asset metadata"
  on public.wantiss_cms_assets for all to authenticated
  using (public.wantiss_has_permission('content.manage', 'edit'))
  with check (public.wantiss_has_permission('content.manage', 'edit'));

create policy "Authorized staff can read admin audit log"
  on public.wantiss_admin_audit_log for select to authenticated
  using (public.wantiss_has_permission('audit.read', 'view'));

create policy "Active staff can append audit log"
  on public.wantiss_admin_audit_log for insert to authenticated
  with check (
    actor_user_id = (select auth.uid())
    and exists (
      select 1 from public.wantiss_admin_staff s
      where s.user_id = (select auth.uid()) and s.status = 'active'
    )
  );

grant select, insert, update, delete on public.wantiss_admin_staff to authenticated;
grant select, insert, update, delete on public.wantiss_admin_permission_grants to authenticated;
grant select, insert, update, delete on public.wantiss_cms_content to authenticated;
grant select, insert, update, delete on public.wantiss_cms_assets to authenticated;
grant select, insert on public.wantiss_admin_audit_log to authenticated;
grant select on public.wantiss_cms_content, public.wantiss_cms_assets to anon;
