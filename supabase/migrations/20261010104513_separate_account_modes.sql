-- Separate mode registration from the shared Supabase identity.
create table if not exists public.account_modes (
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('buyer', 'business')),
  registered_at timestamptz not null default now(),
  primary key (user_id, mode)
);

alter table public.account_modes enable row level security;
revoke all on public.account_modes from anon, authenticated;

-- Preserve legacy Buyer access and existing business registrations when introducing modes.
insert into public.account_modes (user_id, mode)
select p.id, 'buyer' from public.profiles p
on conflict (user_id, mode) do nothing;

insert into public.account_modes (user_id, mode)
select distinct ba.user_id, 'business'
from public.business_applications ba
on conflict (user_id, mode) do nothing;

insert into public.account_modes (user_id, mode)
select distinct bm.user_id, 'business'
from public.business_members bm
on conflict (user_id, mode) do nothing;

-- The selected signup mode is recorded by the trusted auth.users trigger,
-- including when email confirmation means the client has no session yet.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_signup_mode text := lower(coalesce(new.raw_user_meta_data->>'signup_mode', 'buyer'));
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

  if v_signup_mode not in ('buyer', 'business') then
    v_signup_mode := 'buyer';
  end if;

  insert into public.account_modes (user_id, mode)
  values (new.id, v_signup_mode)
  on conflict (user_id, mode) do nothing;

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Read-only mode check used by the app after password authentication.
create or replace function public.get_my_account_modes()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  return jsonb_build_object(
    'buyer', exists (
      select 1 from public.account_modes am
      where am.user_id = v_user_id and am.mode = 'buyer'
    ),
    'business', exists (
      select 1 from public.account_modes am
      where am.user_id = v_user_id and am.mode = 'business'
    )
  );
end;
$$;

revoke all on function public.get_my_account_modes() from public, anon;
grant execute on function public.get_my_account_modes() to authenticated;
