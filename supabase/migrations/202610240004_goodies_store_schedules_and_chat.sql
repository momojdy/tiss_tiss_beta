-- Connect Wantiss Business Space to Goodies stores, publish live opening hours,
-- and allow customers and authorized business members to share store conversations.
alter table public.businesses
  add column if not exists goodies_store_id text;

create table if not exists public.goodies_store_schedules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses(id) on delete cascade,
  store_id text not null unique,
  hours jsonb not null default '{}'::jsonb,
  accept_scheduled_orders boolean not null default false,
  scheduled_order_start_minutes integer not null default 60 check (scheduled_order_start_minutes >= 0 and scheduled_order_start_minutes <= 1440),
  is_live boolean not null default false,
  updated_at timestamptz not null default now(),
  business_name text,
  description text,
  phone text,
  email text,
  website text,
  address text,
  city text,
  country text,
  delivery_modes text[] not null default '{}'::text[],
  logo_url text
);
alter table public.goodies_store_schedules enable row level security;
drop policy if exists "Public can read live Goodies schedules" on public.goodies_store_schedules;
create policy "Public can read live Goodies schedules" on public.goodies_store_schedules
  for select to anon, authenticated using (is_live = true);
drop policy if exists "Business members can insert Goodies schedules" on public.goodies_store_schedules;
create policy "Business members can insert Goodies schedules" on public.goodies_store_schedules
  for insert to authenticated with check (
    exists (select 1 from public.business_members bm where bm.business_id = goodies_store_schedules.business_id and bm.user_id = (select auth.uid()))
  );
drop policy if exists "Business members can update Goodies schedules" on public.goodies_store_schedules;
create policy "Business members can update Goodies schedules" on public.goodies_store_schedules
  for update to authenticated using (
    exists (select 1 from public.business_members bm where bm.business_id = goodies_store_schedules.business_id and bm.user_id = (select auth.uid()))
  ) with check (
    exists (select 1 from public.business_members bm where bm.business_id = goodies_store_schedules.business_id and bm.user_id = (select auth.uid()))
  );
grant select on public.goodies_store_schedules to anon, authenticated;
drop policy if exists "Business members can delete Goodies schedules" on public.goodies_store_schedules;
create policy "Business members can delete Goodies schedules" on public.goodies_store_schedules
  for delete to authenticated using (
    exists (select 1 from public.business_members bm where bm.business_id = goodies_store_schedules.business_id and bm.user_id = (select auth.uid()))
  );
grant insert, update, delete on public.goodies_store_schedules to authenticated;

alter table public.conversations
  add column if not exists business_id uuid references public.businesses(id) on delete cascade,
  add column if not exists customer_id uuid references auth.users(id) on delete set null,
  add column if not exists customer_name text,
  add column if not exists feature text,
  add column if not exists ref_id text,
  add column if not exists ref_label text,
  add column if not exists last_body text,
  add column if not exists unread_business integer not null default 0,
  add column if not exists unread_customer integer not null default 0;

create index if not exists conversations_business_updated_idx on public.conversations (business_id, updated_at desc);
create index if not exists conversations_goodies_customer_idx on public.conversations (customer_id, ref_id) where feature = 'goodies';

drop policy if exists "Conversation participants can read conversations" on public.conversations;
create policy "Conversation participants and business members can read conversations"
on public.conversations for select to authenticated
using (
  (select auth.uid()) = any(participant_ids)
  or exists (select 1 from public.business_members bm where bm.business_id = conversations.business_id and bm.user_id = (select auth.uid()))
);

drop policy if exists "Users can create conversations they participate in" on public.conversations;
create policy "Users can create non-Goodies conversations they participate in"
on public.conversations for insert to authenticated
with check ((select auth.uid()) = any(participant_ids) and coalesce(feature, '') <> 'goodies');
create policy "Customers can start Goodies store conversations"
on public.conversations for insert to authenticated
with check (
  (select auth.uid()) = any(participant_ids)
  and customer_id = (select auth.uid())
  and feature = 'goodies'
  and exists (
    select 1 from public.goodies_store_schedules gs
    where gs.business_id = conversations.business_id
      and gs.store_id = conversations.ref_id
      and gs.is_live = true
  )
);

drop policy if exists "Participants can update conversations" on public.conversations;
create policy "Participants and business members can update conversations"
on public.conversations for update to authenticated
using (
  (select auth.uid()) = any(participant_ids)
  or exists (select 1 from public.business_members bm where bm.business_id = conversations.business_id and bm.user_id = (select auth.uid()))
)
with check (
  (select auth.uid()) = any(participant_ids)
  or exists (select 1 from public.business_members bm where bm.business_id = conversations.business_id and bm.user_id = (select auth.uid()))
);

drop policy if exists "Conversation participants can read messages" on public.messages;
create policy "Conversation participants and business members can read messages"
on public.messages for select to authenticated
using (
  exists (select 1 from public.conversations c where c.id = messages.conversation_id and (
    (select auth.uid()) = any(c.participant_ids)
    or exists (select 1 from public.business_members bm where bm.business_id = c.business_id and bm.user_id = (select auth.uid()))
  ))
);

drop policy if exists "Participants can send messages" on public.messages;
create policy "Participants and business members can send messages"
on public.messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and exists (select 1 from public.conversations c where c.id = messages.conversation_id and (
    (select auth.uid()) = any(c.participant_ids)
    or exists (select 1 from public.business_members bm where bm.business_id = c.business_id and bm.user_id = (select auth.uid()))
  ))
);

create or replace function public.goodies_update_conversation_summary()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.conversations c
  set last_body = new.body,
      updated_at = now(),
      unread_business = case when c.customer_id = new.sender_id then c.unread_business + 1 else c.unread_business end,
      unread_customer = case when c.customer_id is distinct from new.sender_id then c.unread_customer + 1 else c.unread_customer end
  where c.id = new.conversation_id;
  return new;
end;
$$;
drop trigger if exists goodies_message_summary on public.messages;
create trigger goodies_message_summary after insert on public.messages
for each row execute function public.goodies_update_conversation_summary();

grant select, insert on public.conversations to authenticated;
revoke update on public.conversations from authenticated;
grant update (last_body, updated_at, unread_business, unread_customer) on public.conversations to authenticated;
grant select, insert on public.messages to authenticated;
