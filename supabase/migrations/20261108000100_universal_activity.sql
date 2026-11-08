-- Universal, user-scoped activity timeline across Wantiss features.
create table if not exists public.wantiss_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null check (length(feature) between 1 and 40),
  activity_type text not null check (length(activity_type) between 1 and 50),
  title text not null check (length(title) between 1 and 240),
  detail text,
  destination text,
  destination_id text,
  occurred_at timestamptz not null default now()
);
create index if not exists wantiss_activity_user_time_idx on public.wantiss_activity(user_id, occurred_at desc, id desc);
alter table public.wantiss_activity enable row level security;
create policy "activity_select_own" on public.wantiss_activity for select to authenticated using (user_id = (select auth.uid()));
create policy "activity_insert_own" on public.wantiss_activity for insert to authenticated with check (user_id = (select auth.uid()));
create policy "activity_delete_own" on public.wantiss_activity for delete to authenticated using (user_id = (select auth.uid()));
grant select, insert, delete on public.wantiss_activity to authenticated;
