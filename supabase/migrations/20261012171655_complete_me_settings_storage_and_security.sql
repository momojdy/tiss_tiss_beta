create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  language text not null default 'English',
  region text not null default 'Haiti',
  currency text not null default 'USD' check (currency in ('USD','HTG','DOP')),
  notification_preferences jsonb not null default '{"orders":true,"promotions":true,"account":true,"wallet":true}'::jsonb,
  privacy_preferences jsonb not null default '{"personalization":true,"analytics":false}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.user_settings enable row level security;
drop policy if exists "Users can view own settings" on public.user_settings;
create policy "Users can view own settings" on public.user_settings for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users can insert own settings" on public.user_settings;
create policy "Users can insert own settings" on public.user_settings for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users can update own settings" on public.user_settings;
create policy "Users can update own settings" on public.user_settings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create table if not exists public.user_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipient_name text not null,
  phone_number text not null,
  country text not null default 'Haiti',
  department text not null default '',
  city text not null,
  street_address text not null,
  apartment text not null default '',
  postal_code text not null default '',
  delivery_notes text not null default '',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists user_addresses_user_created_idx on public.user_addresses(user_id, created_at desc);
create unique index if not exists user_addresses_one_default_idx on public.user_addresses(user_id) where is_default;
alter table public.user_addresses enable row level security;
drop policy if exists "Users can view own addresses" on public.user_addresses;
create policy "Users can view own addresses" on public.user_addresses for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users can insert own addresses" on public.user_addresses;
create policy "Users can insert own addresses" on public.user_addresses for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users can update own addresses" on public.user_addresses;
create policy "Users can update own addresses" on public.user_addresses for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users can delete own addresses" on public.user_addresses;
create policy "Users can delete own addresses" on public.user_addresses for delete to authenticated using ((select auth.uid()) = user_id);

create table if not exists public.account_security_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  request_type text not null check (request_type in ('email_verification','phone_change')),
  created_at timestamptz not null default now()
);
create index if not exists account_security_requests_user_type_time_idx on public.account_security_requests(user_id, request_type, created_at desc);
alter table public.account_security_requests enable row level security;
revoke all on public.account_security_requests from anon, authenticated;
grant select, insert on public.account_security_requests to authenticated;
drop policy if exists "Users can view own security requests" on public.account_security_requests;
create policy "Users can view own security requests" on public.account_security_requests for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users can insert own security requests" on public.account_security_requests;
create policy "Users can insert own security requests" on public.account_security_requests for insert to authenticated with check ((select auth.uid()) = user_id);

create or replace function public.request_account_security_action(p_request_type text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_user uuid := auth.uid(); v_limit integer; v_count integer;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_request_type not in ('email_verification','phone_change') then raise exception 'Unsupported request type'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text || ':' || p_request_type, 0));
  v_limit := case when p_request_type = 'email_verification' then 5 else 3 end;
  select count(*) into v_count from public.account_security_requests
  where user_id = v_user and request_type = p_request_type and created_at > now() - interval '24 hours';
  if v_count >= v_limit then return jsonb_build_object('allowed', false, 'remaining', 0, 'limit', v_limit); end if;
  insert into public.account_security_requests(user_id, request_type) values (v_user, p_request_type);
  return jsonb_build_object('allowed', true, 'remaining', v_limit - v_count - 1, 'limit', v_limit);
end;
$$;
revoke all on function public.request_account_security_action(text) from public, anon;
grant execute on function public.request_account_security_action(text) to authenticated;