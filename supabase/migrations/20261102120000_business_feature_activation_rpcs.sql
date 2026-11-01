-- Business Space feature activation RPCs used by the existing feature catalog.
-- Keep activation state in the shared business_features table.
create table if not exists public.business_features (
  business_id uuid not null references public.businesses(id) on delete cascade,
  feature text not null,
  status text not null default 'setup' check (status in ('setup','active','restricted','paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_id, feature)
);

create or replace function public.is_business_member(p_business uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $
  select exists (
    select 1 from public.business_members bm
    where bm.business_id = p_business and bm.user_id = auth.uid()
  );
$;
revoke all on function public.is_business_member(uuid) from public, anon;
grant execute on function public.is_business_member(uuid) to authenticated;

alter table public.business_features enable row level security;

drop policy if exists business_features_member_read on public.business_features;
create policy business_features_member_read on public.business_features
for select to authenticated
using (public.is_business_member(business_id));

drop policy if exists business_features_owner_manage on public.business_features;
create policy business_features_owner_manage on public.business_features
for all to authenticated
using (
  exists (
    select 1 from public.business_members bm
    where bm.business_id = business_features.business_id
      and bm.user_id = auth.uid()
      and bm.role in ('owner','admin')
  )
)
with check (
  exists (
    select 1 from public.business_members bm
    where bm.business_id = business_features.business_id
      and bm.user_id = auth.uid()
      and bm.role in ('owner','admin')
  )
);

create or replace function public.activate_feature(p_business uuid, p_feature text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_verification text;
begin
  if auth.uid() is null then
    raise exception 'Sign in required' using errcode = '28000';
  end if;
  if p_business is null or p_feature is null or length(trim(p_feature)) = 0 then
    raise exception 'Business and feature are required' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.business_members bm
    where bm.business_id = p_business
      and bm.user_id = auth.uid()
      and bm.role in ('owner','admin')
  ) then
    raise exception 'Only a business owner or admin can activate features' using errcode = '42501';
  end if;
  select b.verification into v_verification
  from public.businesses b where b.id = p_business;
  if not found then raise exception 'Business not found' using errcode = 'P0002'; end if;
  if v_verification = 'restricted' then
    raise exception 'This business is restricted and cannot activate features' using errcode = '42501';
  end if;
  insert into public.business_features (business_id, feature, status, updated_at)
  values (p_business, trim(p_feature), 'active', now())
  on conflict (business_id, feature)
  do update set status = 'active', updated_at = now();
end;
$$;

create or replace function public.deactivate_feature(p_business uuid, p_feature text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in required' using errcode = '28000';
  end if;
  if not exists (
    select 1 from public.business_members bm
    where bm.business_id = p_business
      and bm.user_id = auth.uid()
      and bm.role in ('owner','admin')
  ) then
    raise exception 'Only a business owner or admin can deactivate features' using errcode = '42501';
  end if;
  delete from public.business_features
  where business_id = p_business and feature = trim(p_feature);
end;
$$;

revoke all on function public.activate_feature(uuid,text) from public, anon;
revoke all on function public.deactivate_feature(uuid,text) from public, anon;
grant execute on function public.activate_feature(uuid,text) to authenticated;
grant execute on function public.deactivate_feature(uuid,text) to authenticated;
