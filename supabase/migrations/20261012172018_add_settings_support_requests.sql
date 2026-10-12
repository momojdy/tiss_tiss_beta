create table if not exists public.settings_support_requests (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 email text not null default '',
 subject text not null,
 message text not null,
 status text not null default 'open' check(status in ('open','in_progress','resolved','closed')),
 created_at timestamptz not null default now()
);
create index if not exists settings_support_requests_user_created_idx on public.settings_support_requests(user_id,created_at desc);
alter table public.settings_support_requests enable row level security;
drop policy if exists "Users can view own support requests" on public.settings_support_requests;
create policy "Users can view own support requests" on public.settings_support_requests for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists "Users can create own support requests" on public.settings_support_requests;
create policy "Users can create own support requests" on public.settings_support_requests for insert to authenticated with check ((select auth.uid())=user_id);
revoke all on public.settings_support_requests from anon;
grant select,insert on public.settings_support_requests to authenticated;