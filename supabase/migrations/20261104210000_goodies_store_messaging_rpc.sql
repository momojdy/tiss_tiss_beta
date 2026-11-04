-- Phase 2 Goodies messaging: allow a customer thread to exist before a
-- business member is assigned, and make both customer/vendor sends atomic RPCs.
--
-- Goodies conversations are scoped by customer_id + business_id. Business
-- members read them through business_id RLS; they are deliberately NOT stored
-- in participant_ids so a removed business member cannot retain access.

update public.conversations
set participant_ids = array[customer_id]::uuid[]
where feature = 'goodies'
  and customer_id is not null
  and participant_ids is distinct from array[customer_id]::uuid[];

alter table public.conversations
  drop constraint if exists conversations_participants_minimum;
alter table public.conversations
  add constraint conversations_participants_minimum
  check (cardinality(participant_ids) >= 1);

create index if not exists conversations_goodies_business_status_updated_idx
  on public.conversations (business_id, status, updated_at desc)
  where feature = 'goodies';

create or replace function public.goodies_start_store_conversation(
  p_store_id text,
  p_customer_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_customer uuid := auth.uid();
  v_business_id uuid;
  v_store_name text;
  v_conversation_id uuid;
begin
  if v_customer is null then
    raise exception 'Sign in to message this store.' using errcode = '28000';
  end if;
  if nullif(pg_catalog.btrim(coalesce(p_store_id, '')), '') is null then
    raise exception 'A valid store is required.' using errcode = '22023';
  end if;

  select gs.business_id,
         coalesce(
           nullif(pg_catalog.btrim(gs.store_name), ''),
           nullif(pg_catalog.btrim(gs.business_name), ''),
           'Goodies store'
         )
    into v_business_id, v_store_name
  from public.goodies_store_schedules gs
  where gs.store_id = p_store_id
    and gs.is_live = true;

  if v_business_id is null then
    raise exception 'This store is not currently available for messaging.' using errcode = 'P0002';
  end if;

  if exists (
    select 1
    from public.business_members bm
    where bm.business_id = v_business_id
      and bm.user_id = v_customer
  ) then
    raise exception 'You manage this store, so you cannot message it as a customer.' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_store_id || ':' || v_customer::text, 0)
  );

  select c.id
    into v_conversation_id
  from public.conversations c
  where c.business_id = v_business_id
    and c.feature = 'goodies'
    and c.ref_id = p_store_id
    and c.customer_id = v_customer
    and c.status <> 'closed'
  order by c.updated_at desc
  limit 1;

  if v_conversation_id is not null then
    return v_conversation_id;
  end if;

  -- A conversation can be created before the store has an assigned member.
  -- The customer remains its only participant until a store member replies.
  insert into public.conversations (
    business_id,
    participant_ids,
    customer_id,
    customer_name,
    feature,
    ref_id,
    ref_label,
    title,
    last_body,
    unread_business,
    unread_customer,
    status
  ) values (
    v_business_id,
    array[v_customer]::uuid[],
    v_customer,
    coalesce(nullif(pg_catalog.btrim(p_customer_name), ''), 'Customer'),
    'goodies',
    p_store_id,
    v_store_name,
    v_store_name,
    '',
    0,
    0,
    'pending_vendor'
  )
  returning id into v_conversation_id;

  return v_conversation_id;
end;
$function$;

create or replace function public.goodies_send_store_message(
  p_conversation_id uuid,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
  v_conversation public.conversations%rowtype;
  v_body text := nullif(pg_catalog.btrim(coalesce(p_body, '')), '');
  v_message_id uuid;
begin
  if v_user is null then
    raise exception 'Sign in to send a message.' using errcode = '28000';
  end if;
  if p_conversation_id is null then
    raise exception 'A conversation is required.' using errcode = '22023';
  end if;
  if v_body is null or pg_catalog.char_length(v_body) > 4000 then
    raise exception 'Messages must contain between 1 and 4000 characters.' using errcode = '22023';
  end if;

  select c.* into v_conversation
  from public.conversations c
  where c.id = p_conversation_id
  for update;

  if not found then
    raise exception 'Conversation not found.' using errcode = 'P0002';
  end if;
  if v_conversation.feature is distinct from 'goodies'
     or v_conversation.customer_id is distinct from v_user then
    raise exception 'You cannot send messages in this conversation.' using errcode = '42501';
  end if;
  if v_conversation.status = 'closed' then
    raise exception 'This conversation is closed.' using errcode = '55000';
  end if;

  insert into public.messages (conversation_id, sender_id, body)
  values (p_conversation_id, v_user, v_body)
  returning id into v_message_id;

  return v_message_id;
end;
$function$;

create or replace function public.goodies_vendor_reply(
  p_conversation_id uuid,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
  v_conversation public.conversations%rowtype;
  v_body text := nullif(pg_catalog.btrim(coalesce(p_body, '')), '');
  v_message_id uuid;
begin
  if v_user is null then
    raise exception 'Sign in to reply.' using errcode = '28000';
  end if;
  if p_conversation_id is null then
    raise exception 'A conversation is required.' using errcode = '22023';
  end if;
  if v_body is null or pg_catalog.char_length(v_body) > 4000 then
    raise exception 'Messages must contain between 1 and 4000 characters.' using errcode = '22023';
  end if;

  select c.* into v_conversation
  from public.conversations c
  where c.id = p_conversation_id
  for update;

  if not found then
    raise exception 'Conversation not found.' using errcode = 'P0002';
  end if;
  if v_conversation.feature is distinct from 'goodies'
     or v_conversation.customer_id is null
     or not exists (
       select 1
       from public.business_members bm
       where bm.business_id = v_conversation.business_id
         and bm.user_id = v_user
     ) then
    raise exception 'You are not authorized to reply to this store conversation.' using errcode = '42501';
  end if;
  if v_conversation.status = 'closed' then
    raise exception 'This conversation is closed.' using errcode = '55000';
  end if;

  insert into public.messages (conversation_id, sender_id, body)
  values (p_conversation_id, v_user, v_body)
  returning id into v_message_id;

  return v_message_id;
end;
$function$;

-- Keep summary/unread counts and notifications in the same transaction as the
-- message. Notifications are best-effort so a notification issue cannot lose
-- an otherwise valid customer/vendor message.
create or replace function public.goodies_update_conversation_summary()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  c public.conversations%rowtype;
  v_name text;
  m record;
begin
  select * into c
  from public.conversations
  where id = new.conversation_id;

  if c.id is null then
    return new;
  end if;

  if c.customer_id = new.sender_id then
    update public.conversations
    set last_body = new.body,
        updated_at = pg_catalog.now(),
        unread_business = unread_business + 1
    where id = c.id;

    if c.feature = 'goodies' then
      v_name := coalesce(nullif(c.customer_name, ''), 'A customer');
      for m in
        select distinct bm.user_id
        from public.business_members bm
        where bm.business_id = c.business_id
      loop
        begin
          insert into public.notifications (
            user_id, title, body, feature_name, notification_type, destination, metadata
          ) values (
            m.user_id,
            'New message from ' || v_name,
            pg_catalog.left(new.body, 140),
            'goodies',
            'store_message',
            'messages',
            pg_catalog.jsonb_build_object('conversation_id', c.id, 'business_id', c.business_id)
          );
        exception when others then
          raise warning 'Goodies store-message notification failed for conversation %: %', c.id, sqlerrm;
        end;
      end loop;
    end if;
  else
    update public.conversations
    set last_body = new.body,
        updated_at = pg_catalog.now(),
        unread_customer = unread_customer + 1,
        status = case when status = 'pending_vendor' then 'active' else status end,
        vendor_replied_at = coalesce(vendor_replied_at, pg_catalog.now()),
        participant_ids = case
          when c.feature = 'goodies' then participant_ids
          when new.sender_id = any(participant_ids) then participant_ids
          else pg_catalog.array_append(participant_ids, new.sender_id)
        end
    where id = c.id;

    if c.feature = 'goodies' and c.customer_id is not null then
      begin
        insert into public.notifications (
          user_id, title, body, feature_name, notification_type, destination, metadata
        ) values (
          c.customer_id,
          coalesce(c.ref_label, 'Store') || ' replied',
          pg_catalog.left(new.body, 140),
          'goodies',
          'store_message',
          'messages',
          pg_catalog.jsonb_build_object('conversation_id', c.id)
        );
      exception when others then
        raise warning 'Goodies customer reply notification failed for conversation %: %', c.id, sqlerrm;
      end;
    end if;
  end if;

  return new;
end;
$function$;

revoke all on function public.goodies_start_store_conversation(text, text) from public, anon;
revoke all on function public.goodies_send_store_message(uuid, text) from public, anon;
revoke all on function public.goodies_vendor_reply(uuid, text) from public, anon;

grant execute on function public.goodies_start_store_conversation(text, text) to authenticated;
grant execute on function public.goodies_send_store_message(uuid, text) to authenticated;
grant execute on function public.goodies_vendor_reply(uuid, text) to authenticated;
