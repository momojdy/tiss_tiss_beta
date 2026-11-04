-- Align friend invitations with the Phase C4 contract:
-- any current group member may invite accepted friends, invitation capacity is
-- reserved against max_members, and the picker reports Invited/Joined/Declined.

drop function if exists public.goodies_group_order_list_friends(uuid);

create function public.goodies_group_order_list_friends(p_group_id uuid)
returns table(
  user_id uuid,
  display_name text,
  avatar_url text,
  already_member boolean,
  already_invited boolean,
  invite_status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_group_status text;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select g.status into v_group_status
  from public.goodies_group_orders g
  where g.id = p_group_id
    and g.expires_at > pg_catalog.now();

  if v_group_status is null or v_group_status <> 'open' then
    raise exception 'This group order has closed or expired' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.goodies_group_order_members m
    where m.group_id = p_group_id and m.user_id = v_uid
  ) then
    raise exception 'You are not a member of this group' using errcode = '42501';
  end if;

  return query
    select
      p.id,
      coalesce(nullif(pg_catalog.btrim(p.full_name), ''), 'Wantiss member'),
      p.avatar_url,
      exists (
        select 1 from public.goodies_group_order_members m
        where m.group_id = p_group_id and m.user_id = p.id
      ),
      exists (
        select 1 from public.goodies_group_order_invites i
        where i.group_id = p_group_id
          and i.invited_user_id = p.id
          and i.status = 'pending'
      ),
      case
        when exists (
          select 1 from public.goodies_group_order_members m
          where m.group_id = p_group_id and m.user_id = p.id
        ) then 'joined'
        when exists (
          select 1 from public.goodies_group_order_invites i
          where i.group_id = p_group_id
            and i.invited_user_id = p.id
            and i.status = 'pending'
        ) then 'invited'
        when exists (
          select 1 from public.goodies_group_order_invites i
          where i.group_id = p_group_id
            and i.invited_user_id = p.id
            and i.status = 'declined'
        ) then 'declined'
        else null
      end
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
  v_existing_status text;
  v_reserved integer;
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

  if not found then
    raise exception 'Group order not found' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.goodies_group_order_members m
    where m.group_id = p_group_id and m.user_id = v_uid
  ) then
    raise exception 'Only group members can invite friends' using errcode = '42501';
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

    select i.status into v_existing_status
    from public.goodies_group_order_invites i
    where i.group_id = p_group_id and i.invited_user_id = v_target;

    -- Repeated sends to an already-pending recipient are a no-op.
    if v_existing_status = 'pending' then
      continue;
    end if;

    -- Count members and outstanding invitations as reserved places.
    select pg_catalog.count(*)::integer into v_reserved
    from (
      select m.user_id
      from public.goodies_group_order_members m
      where m.group_id = p_group_id
      union
      select i.invited_user_id
      from public.goodies_group_order_invites i
      where i.group_id = p_group_id and i.status = 'pending'
    ) reserved_places;

    if v_reserved >= v_group.max_members then
      raise exception 'This group order has reached its member limit' using errcode = 'P0001';
    end if;

    v_invite_id := null;
    if v_existing_status = 'declined' then
      update public.goodies_group_order_invites i
      set status = 'pending',
          invited_by = v_uid,
          created_at = pg_catalog.now()
      where i.group_id = p_group_id
        and i.invited_user_id = v_target
        and i.status = 'declined'
      returning i.id into v_invite_id;
    else
      insert into public.goodies_group_order_invites(group_id, invited_user_id, invited_by)
      values (p_group_id, v_target, v_uid)
      on conflict (group_id, invited_user_id) do nothing
      returning id into v_invite_id;
    end if;

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
        null;
      end;
    end if;
  end loop;

  return v_sent;
end;
$$;

revoke all on function public.goodies_group_order_list_friends(uuid) from public, anon;
revoke all on function public.goodies_group_order_invite_friends(uuid, uuid[]) from public, anon;
grant execute on function public.goodies_group_order_list_friends(uuid) to authenticated;
grant execute on function public.goodies_group_order_invite_friends(uuid, uuid[]) to authenticated;
