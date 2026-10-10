-- Authoritative business application and access model for Wantiss.
create table if not exists public.business_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_name text not null check (length(trim(business_name)) between 2 and 160),
  status text not null default 'pending' check (status in ('pending','approved','rejected','restricted')),
  review_note text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_applications_user_created_idx
  on public.business_applications (user_id, created_at desc);
create unique index if not exists business_applications_one_active_per_user_idx
  on public.business_applications (user_id)
  where status in ('pending','approved','restricted');

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 160),
  verification text not null default 'pending' check (verification in ('pending','verified','restricted')),
  payout_ready boolean not null default false,
  is_live boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','admin','staff')),
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);
create index if not exists business_members_user_idx on public.business_members (user_id, business_id);

alter table public.business_applications enable row level security;
alter table public.businesses enable row level security;
alter table public.business_members enable row level security;

drop policy if exists "Users can view own business applications" on public.business_applications;
create policy "Users can view own business applications"
  on public.business_applications for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Members can view their businesses" on public.businesses;
create policy "Members can view their businesses"
  on public.businesses for select to authenticated
  using (exists (
    select 1 from public.business_members bm
    where bm.business_id = businesses.id and bm.user_id = (select auth.uid())
  ));

drop policy if exists "Members can view their memberships" on public.business_members;
create policy "Members can view their memberships"
  on public.business_members for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.business_applications from anon, authenticated;
grant select on public.business_applications to authenticated;
revoke all on public.businesses from anon, authenticated;
grant select on public.businesses to authenticated;
revoke all on public.business_members from anon, authenticated;
grant select on public.business_members to authenticated;

create or replace function public.submit_business_application(p_business_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_name text := trim(coalesce(p_business_name, ''));
  v_application public.business_applications%rowtype;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to apply for business access.';
  end if;
  if length(v_name) < 2 or length(v_name) > 160 then
    raise exception 'Business name must be between 2 and 160 characters.';
  end if;
  if exists (select 1 from public.business_members where user_id = v_user_id) then
    raise exception 'This account already has business access.';
  end if;

  select * into v_application
  from public.business_applications
  where user_id = v_user_id and status in ('pending','approved','restricted')
  order by created_at desc limit 1;

  if found then
    if v_application.status = 'pending' then
      update public.business_applications
      set business_name = v_name, updated_at = now()
      where id = v_application.id returning * into v_application;
    end if;
  else
    insert into public.business_applications(user_id, business_name)
    values (v_user_id, v_name)
    returning * into v_application;
  end if;

  return jsonb_build_object('id', v_application.id, 'status', v_application.status, 'business_name', v_application.business_name);
end;
$$;

create or replace function public.provision_approved_business()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid;
begin
  if new.status = 'approved' and (tg_op = 'INSERT' or old.status is distinct from 'approved') then
    select bm.business_id into v_business_id
    from public.business_members bm where bm.user_id = new.user_id limit 1;

    if v_business_id is null then
      insert into public.businesses(name, verification, is_live)
      values (new.business_name, 'pending', false)
      returning id into v_business_id;

      insert into public.business_members(business_id, user_id, role)
      values (v_business_id, new.user_id, 'owner')
      on conflict (business_id, user_id) do nothing;
    end if;
    new.reviewed_at := coalesce(new.reviewed_at, now());
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists business_application_approved_provision on public.business_applications;
create trigger business_application_approved_provision
before insert or update on public.business_applications
for each row execute function public.provision_approved_business();

create or replace function public.get_my_business_access()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_business_id uuid;
  v_business_name text;
  v_application_status text;
  v_application_name text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select b.id, b.name into v_business_id, v_business_name
  from public.business_members bm
  join public.businesses b on b.id = bm.business_id
  where bm.user_id = v_user_id
  order by bm.created_at asc limit 1;

  select ba.status, ba.business_name into v_application_status, v_application_name
  from public.business_applications ba
  where ba.user_id = v_user_id
  order by ba.created_at desc limit 1;

  return jsonb_build_object(
    'approved', v_business_id is not null,
    'business_id', v_business_id,
    'business_name', coalesce(v_business_name, v_application_name),
    'application_status', coalesce(v_application_status, 'not_applied')
  );
end;
$$;

revoke all on function public.submit_business_application(text) from public, anon;
grant execute on function public.submit_business_application(text) to authenticated;
revoke all on function public.get_my_business_access() from public, anon;
grant execute on function public.get_my_business_access() to authenticated;
revoke all on function public.provision_approved_business() from public, anon, authenticated;

-- A user's role is not an authorization grant. Signup always creates a buyer identity.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, role, full_name, business_name)
  values (
    new.id,
    new.email,
    'buyer',
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'business_name', '')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name),
        business_name = coalesce(public.profiles.business_name, excluded.business_name);
  return new;
end;
$$;

-- Preserve profile read/update for the owner but prevent role escalation and client-created profiles.
revoke all on public.profiles from anon;
revoke insert, delete on public.profiles from authenticated;
revoke update on public.profiles from anon, authenticated;
grant update (full_name, business_name, preferred_currency, phone_number, avatar_url)
  on public.profiles to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
