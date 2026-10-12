create table if not exists public.account_deletion_requests(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 email text not null default '',
 reason text not null default 'user_request',
 status text not null default 'requested' check(status in ('requested','under_review','completed','rejected')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists account_deletion_requests_user_created_idx on public.account_deletion_requests(user_id,created_at desc);
alter table public.account_deletion_requests enable row level security;
drop policy if exists "Users can create own account deletion requests" on public.account_deletion_requests;
create policy "Users can create own account deletion requests" on public.account_deletion_requests for insert to authenticated with check ((select auth.uid())=user_id);
drop policy if exists "Users can view own account deletion requests" on public.account_deletion_requests;
create policy "Users can view own account deletion requests" on public.account_deletion_requests for select to authenticated using ((select auth.uid())=user_id);
revoke all on public.account_deletion_requests from anon;
grant select,insert on public.account_deletion_requests to authenticated;