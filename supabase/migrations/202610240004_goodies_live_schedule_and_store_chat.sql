-- Live Goodies store mapping and store/customer messaging policies.
alter table public.businesses add column if not exists goodies_store_id text;
create table if not exists public.goodies_store_schedules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses(id) on delete cascade,
  store_id text not null unique,
  hours jsonb not null default '{}'::jsonb,
  accept_scheduled_orders boolean not null default false,
  scheduled_order_start_minutes integer not null default 60 check (scheduled_order_start_minutes >= 0 and scheduled_order_start_minutes <= 1440),
  is_live boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.goodies_store_schedules enable row level security;
drop policy if exists "Public can read live Goodies schedules" on public.goodies_store_schedules;
create policy "Public can read live Goodies schedules" on public.goodies_store_schedules for select to anon, authenticated using (is_live = true);
drop policy if exists "Business members can view their Goodies schedules" on public.goodies_store_schedules;
create policy "Business members can view their Goodies schedules" on public.goodies_store_schedules for select to authenticated using (exists (select 1 from public.business_members bm where bm.business_id = goodies_store_schedules.business_id and bm.user_id = (select auth.uid())));
drop policy if exists "Business members can insert Goodies schedules" on public.goodies_store_schedules;
create policy "Business members can insert Goodies schedules" on public.goodies_store_schedules for insert to authenticated with check (exists (select 1 from public.business_members bm where bm.business_id = goodies_store_schedules.business_id and bm.user_id = (select auth.uid())));
drop policy if exists "Business members can update Goodies schedules" on public.goodies_store_schedules;
create policy "Business members can update Goodies schedules" on public.goodies_store_schedules for update to authenticated using (exists (select 1 from public.business_members bm where bm.business_id = goodies_store_schedules.business_id and bm.user_id = (select auth.uid()))) with check (exists (select 1 from public.business_members bm where bm.business_id = goodies_store_schedules.business_id and bm.user_id = (select auth.uid())));
grant select on public.goodies_store_schedules to anon, authenticated;
grant insert, update, delete on public.goodies_store_schedules to authenticated;

-- Keep vendor schedule rows private to their business unless published.
drop policy if exists "Business members can view their Goodies schedules" on public.goodies_store_schedules;
create policy "Business members can view their Goodies schedules" on public.goodies_store_schedules
  for select to authenticated using (
    exists (select 1 from public.business_members bm where bm.business_id = goodies_store_schedules.business_id and bm.user_id = (select auth.uid()))
  );

-- Store conversations are readable by the customer participant and by members of the linked business.
drop policy if exists "Business members can read their conversations" on public.conversations;
create policy "Business members can read their conversations" on public.conversations
  for select to authenticated using (
    exists (select 1 from public.business_members bm where bm.business_id = conversations.business_id and bm.user_id = (select auth.uid()))
  );
drop policy if exists "Business members can update their conversations" on public.conversations;
create policy "Business members can update their conversations" on public.conversations
  for update to authenticated using (
    exists (select 1 from public.business_members bm where bm.business_id = conversations.business_id and bm.user_id = (select auth.uid()))
  ) with check (
    exists (select 1 from public.business_members bm where bm.business_id = conversations.business_id and bm.user_id = (select auth.uid()))
  );

drop policy if exists "Business members can read store messages" on public.messages;
create policy "Business members can read store messages" on public.messages
  for select to authenticated using (
    exists (select 1 from public.conversations c join public.business_members bm on bm.business_id = c.business_id where c.id = messages.conversation_id and bm.user_id = (select auth.uid()))
  );
drop policy if exists "Business members can reply to store messages" on public.messages;
create policy "Business members can reply to store messages" on public.messages
  for insert to authenticated with check (
    sender_id = (select auth.uid()) and
    exists (select 1 from public.conversations c join public.business_members bm on bm.business_id = c.business_id where c.id = messages.conversation_id and bm.user_id = (select auth.uid()))
  );
