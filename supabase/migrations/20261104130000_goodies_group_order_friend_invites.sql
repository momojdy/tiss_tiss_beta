-- Phase 4: invite accepted friends to a Goodies group order.
create table if not exists public.goodies_group_order_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.goodies_group_orders(id) on delete cascade,
  invited_user_id uuid not null,
  invited_by uuid not null,
  status text not null default 'pending' check (status in ('pending','declined')),
  created_at timestamptz not null default now(),
  unique (group_id, invited_user_id)
);
alter table public.goodies_group_order_invites enable row level security;
drop policy if exists "group invites visible to parties" on public.goodies_group_order_invites;
create policy "group invites visible to parties" on public.goodies_group_order_invites
  for select using ((select auth.uid()) in (invited_user_id, invited_by));

-- Accepted friends of the caller, flagged when already in or invited to the group.
create or replace function public.goodies_group_order_list_friends(p_group_id uuid)
returns table(user_id uuid, display_name text, avatar_url text, already_member boolean, already_invited boolean)
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='28000'; end if;
  if not private.goodies_group_is_member(p_group_id) then raise exception 'You are not a member of this group' using errcode='42501'; end if;
  return query
    select p.id,
           coalesce(nullif(trim(p.full_name), ''), 'Wantiss member'),
           p.avatar_url,
           exists(select 1 from public.goodies_group_order_members m where m.group_id = p_group_id and m.user_id = p.id),
           exists(select 1 from public.goodies_group_order_invites i where i.group_id = p_group_id and i.invited_user_id = p.id)
    from public.user_friendships f
    join public.profiles p on p.id = case when f.requester_id = auth.uid() then f.recipient_id else f.requester_id end
    where f.status = 'accepted' and auth.uid() in (f.requester_id, f.recipient_id)
    order by 2;
end $$;

-- Host invites friends. Only accepted friends can be invited.
create or replace function public.goodies_group_order_invite_friends(p_group_id uuid, p_user_ids uuid[])
returns integer
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_group public.goodies_group_orders%rowtype; v_target uuid; v_sent int := 0; v_name text;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode='28000'; end if;
  select * into v_group from public.goodies_group_orders where id = p_group_id;
  if not found or v_group.host_user_id <> v_uid then raise exception 'Only the host can invite friends' using errcode='42501'; end if;
  if v_group.status <> 'open' or v_group.expires_at <= now() then raise exception 'This group order has closed' using errcode='P0001'; end if;
  select coalesce(nullif(trim(full_name), ''), 'A friend') into v_name from public.profiles where id = v_uid;
  foreach v_target in array coalesce(p_user_ids, '{}') loop
    continue when v_target = v_uid;
    continue when not exists(select 1 from public.user_friendships f where f.status = 'accepted'
      and ((f.requester_id = v_uid and f.recipient_id = v_target) or (f.requester_id = v_target and f.recipient_id = v_uid)));
    continue when exists(select 1 from public.goodies_group_order_members m where m.group_id = p_group_id and m.user_id = v_target);
    insert into public.goodies_group_order_invites(group_id, invited_user_id, invited_by)
      values (p_group_id, v_target, v_uid)
      on conflict (group_id, invited_user_id) do update set status = 'pending', created_at = now();
    v_sent := v_sent + 1;
    begin
      insert into public.notifications(user_id, title, body, feature_name, notification_type, metadata)
      values (v_target, 'Group order invite', v_name || ' invited you to a group order.', 'goodies', 'goodies_group_invite',
              jsonb_build_object('group_id', p_group_id, 'invite_code', v_group.invite_code));
    exception when others then null; -- a notification problem must never block the invite
    end;
  end loop;
  return v_sent;
end $$;

-- Pending invites for the caller, with what is needed to join.
create or replace function public.goodies_group_order_my_invites()
returns table(group_id uuid, invite_code text, store_id text, host_name text, expires_at timestamptz)
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='28000'; end if;
  return query
    select g.id, g.invite_code, g.store_id,
           coalesce(nullif(trim(p.full_name), ''), 'A friend'), g.expires_at
    from public.goodies_group_order_invites i
    join public.goodies_group_orders g on g.id = i.group_id
    left join public.profiles p on p.id = g.host_user_id
    where i.invited_user_id = auth.uid() and i.status = 'pending'
      and g.status = 'open' and g.expires_at > now()
      and not exists(select 1 from public.goodies_group_order_members m where m.group_id = g.id and m.user_id = auth.uid())
    order by i.created_at desc;
end $$;

create or replace function public.goodies_group_order_decline_invite(p_group_id uuid)
returns void
language sql security definer set search_path = public, pg_temp as $$
  update public.goodies_group_order_invites set status = 'declined'
  where group_id = p_group_id and invited_user_id = auth.uid();
$$;

revoke all on function public.goodies_group_order_list_friends(uuid), public.goodies_group_order_invite_friends(uuid, uuid[]),
  public.goodies_group_order_my_invites(), public.goodies_group_order_decline_invite(uuid) from public, anon;
grant execute on function public.goodies_group_order_list_friends(uuid), public.goodies_group_order_invite_friends(uuid, uuid[]),
  public.goodies_group_order_my_invites(), public.goodies_group_order_decline_invite(uuid) to authenticated;
