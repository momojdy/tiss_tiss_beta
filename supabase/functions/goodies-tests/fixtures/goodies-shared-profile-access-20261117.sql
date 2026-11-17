-- Schema-only shared dependency captured read-only on 2026-11-17.
-- The domain fixture omitted profiles ACL/RLS; live delivery-assignment policies reference it.
-- This file is used only by isolated tests and is never a production migration.
grant select on public.profiles to authenticated;
alter table public.profiles enable row level security;
create policy "Users can view own profile " on public.profiles
for select to authenticated using (auth.uid() = id);
