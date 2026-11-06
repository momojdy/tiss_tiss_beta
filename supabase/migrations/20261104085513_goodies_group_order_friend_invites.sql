-- Phase 4: secure invitations to a Goodies group order from accepted friends.
create table if not exists public.goodies_group_order_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.goodies_group_orders(id) on delete cascade,
  invited_user_id uuid not null references auth.users(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','declined')),
  created_at timestamptz not null default now(),
  unique (group_id, invited_user_id)
);

create index if not exists goodies_group_order_invites_recipient_pending_idx
  on public.goodies_group_order_invites (invited_user_id, created_at desc)
  where status = 'pending';

alter table public.goodies_group_order_invites enable row level security;
drop policy if exists "group invites visible to parties" on public.goodies_group_order_invites;
create policy "group invites visible to parties"
  on public.goodies_group_order_invites
  for select
  to authenticated
  using (
    (select auth.uid()) is not null
    and (select auth.uid()) in (invited_user_id, invited_by)
  );

-- All table access goes through the narrowly scoped SECURITY DEFINER RPCs below.
revoke all on table public.goodies_group_order_invites from public, anon, authenticated;

-- Only the host can enumerate their accepted friends for an active group.
create or replace function public.goodies_group_order_list_friends(p_group_id uuid)
returns table(user_id uuid, display_name text, avatar_url text, already_member boolean, already_invited boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_host uuid;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select g.host_user_id into v_host
  from public.goodies_group_orders g
  where g.id = p_group_id
    and g.status = 'open'
    and g.expires_at > pg_catalog.now();

  if v_host is null then
    raise exception 'This group order has closed or expired' using errcode = 'P0001';
  end if;
  if v_host <> v_uid then
    raise exception 'Only the host can view friends to invite' using errcode = '42501';
  end if;

  return query
    select
      p.id,
      coalesce(nullif(pg_catalog.btrim(p.full_name), ''), 'Wantiss member'),
      p.avatar_url,
      exists (
        select 1
        from public.goodies_group_order_members m
        where m.group_id = p_group_id and m.user_id = p.id
      ),
      exists (
        select 1
        from public.goodies_group_order_invites i
        where i.group_id = p_group_id
          and i.invited_user_id = p.id
          and i.status = 'pending'
      )
    from public.user_friendships f
    join public.profiles p
      on p.id = case
        when f.requester_id = v_uid then f.recipient_id
        else f.requester_id
      end
    where f.status = 'accepted'
      and v_uid in (f.requester_id, f.recipient_id)
    order by 2;
end;
$$;

-- Host-only invitation RPC. Duplicate pending requests are idempotent; declined
-- invitations can be re-opened, and only newly-created/re-opened invites notify.
create or replace function public.goodies_group_order_invite_friends(p_group_id uuid, p_user_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_group public.goodies_group_orders%rowtype;
  v_target uuid;
  v_invite_id uuid;
  v_sent integer := 0;
  v_name text;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select g.* into v_group
  from public.goodies_group_orders g
  where g.id = p_group_id
  for update;

  if not found or v_group.host_user_id <> v_uid then
    raise exception 'Only the host can invite friends' using errcode = '42501';
  end if;
  if v_group.status <> 'open' or v_group.expires_at <= pg_catalog.now() then
    raise exception 'This group order has closed' using errcode = 'P0001';
  end if;

  select coalesce(nullif(pg_catalog.btrim(p.full_name), ''), 'A friend')
    into v_name
  from public.profiles p
  where p.id = v_uid;

  for v_target in
    select distinct target_id
    from pg_catalog.unnest(coalesce(p_user_ids, '{}'::uuid[])) as requested(target_id)
    where target_id is not null
    order by target_id
  loop
    continue when v_target = v_uid;
    continue when not exists (
      select 1
      from public.user_friendships f
      where f.status = 'accepted'
        and (
          (f.requester_id = v_uid and f.recipient_id = v_target)
          or (f.requester_id = v_target and f.recipient_id = v_uid)
        )
    );
    continue when exists (
      select 1
      from public.goodies_group_order_members m
      where m.group_id = p_group_id and m.user_id = v_target
    );

    v_invite_id := null;
    insert into public.goodies_group_order_invites(group_id, invited_user_id, invited_by)
    values (p_group_id, v_target, v_uid)
    on conflict (group_id, invited_user_id) do update
      set status = 'pending',
          invited_by = excluded.invited_by,
          created_at = pg_catalog.now()
      where public.goodies_group_order_invites.status = 'declined'
    returning id into v_invite_id;

    -- A still-pending duplicate is deliberately a no-op: no duplicate count
    -- and no duplicate notification.
    if v_invite_id is not null then
      v_sent := v_sent + 1;
      begin
        insert into public.notifications(user_id, title, body, feature_name, notification_type, metadata)
        values (
          v_target,
          'Group order invite',
          coalesce(v_name, 'A friend') || ' invited you to a group order.',
          'goodies',
          'goodies_group_invite',
          pg_catalog.jsonb_build_object('group_id', p_group_id, 'invite_code', v_group.invite_code)
        );
      exception when others then
        -- The invitation is durable even if optional notification delivery fails.
        null;
      end;
    end if;
  end loop;

  return v_sent;
end;
$$;

-- Only the recipient sees their live, pending invitations.
create or replace function public.goodies_group_order_my_invites()
returns table(group_id uuid, invite_code text, store_id text, host_name text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  return query
    select
      g.id,
      g.invite_code,
      g.store_id,
      coalesce(nullif(pg_catalog.btrim(p.full_name), ''), 'A friend'),
      g.expires_at
    from public.goodies_group_order_invites i
    join public.goodies_group_orders g on g.id = i.group_id
    left join public.profiles p on p.id = g.host_user_id
    where i.invited_user_id = v_uid
      and i.status = 'pending'
      and g.status = 'open'
      and g.expires_at > pg_catalog.now()
      and not exists (
        select 1
        from public.goodies_group_order_members m
        where m.group_id = g.id and m.user_id = v_uid
      )
    order by i.created_at desc;
end;
$$;

-- A recipient can decline only their own currently-pending invitation.
create or replace function public.goodies_group_order_decline_invite(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  update public.goodies_group_order_invites i
  set status = 'declined'
  where i.group_id = p_group_id
    and i.invited_user_id = v_uid
    and i.status = 'pending';
end;
$$;

revoke all on function public.goodies_group_order_list_friends(uuid) from public, anon;
revoke all on function public.goodies_group_order_invite_friends(uuid, uuid[]) from public, anon;
revoke all on function public.goodies_group_order_my_invites() from public, anon;
revoke all on function public.goodies_group_order_decline_invite(uuid) from public, anon;

grant execute on function public.goodies_group_order_list_friends(uuid) to authenticated;
grant execute on function public.goodies_group_order_invite_friends(uuid, uuid[]) to authenticated;
grant execute on function public.goodies_group_order_my_invites() to authenticated;
grant execute on function public.goodies_group_order_decline_invite(uuid) to authenticated;
