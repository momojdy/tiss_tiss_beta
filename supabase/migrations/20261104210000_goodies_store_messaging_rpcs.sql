-- Phase 2: make Goodies store messaging independent of a pre-assigned member,
-- and route all Goodies sends through role-checked RPCs.
--
-- A customer is the only required initial participant. Store members are resolved
-- from business_members at read/reply time, so a store can receive messages before
-- its first member account is connected.

alter table public.conversations
  drop constraint if exists conversations_participants_minimum;

alter table public.conversations
  add constraint conversations_participants_minimum
  check (
    (
      feature = 'goodies'
      and customer_id is not null
      and customer_id = any(participant_ids)
      and cardinality(participant_ids) >= 1
    )
    or
    (
      coalesce(feature, '') <> 'goodies'
      and cardinality(participant_ids) >= 2
    )
  );

create index if not exists conversations_goodies_business_status_updated_idx
  on public.conversations (business_id, status, updated_at desc)
  where feature = 'goodies';

-- Only the start RPC may create a Goodies conversation.
drop policy if exists "Customers can start Goodies store conversations" on public.conversations;

-- Only the role-checked send RPCs may insert Goodies messages. Preserve direct
-- participant inserts for the other Wantiss conversation features.
drop policy if exists "Goodies chat participants send only as customer or store member" on public.messages;
create policy "Non-Goodies participants send messages"
on public.messages
for insert
to authenticated
with check (
  sender_id = (select auth.uid())
  and exists (
    select 1
    from public.conversations c
    where c.id = messages.conversation_id
      and coalesce(c.feature, '') <> 'goodies'
      and (
        (select auth.uid()) = any(c.participant_ids)
        or exists (
          select 1
          from public.business_members bm
          where bm.business_id = c.business_id
            and bm.user_id = (select auth.uid())
        )
      )
  )
);

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
    raise exception 'Sign in to message this store.';
  end if;
  if nullif(pg_catalog.btrim(p_store_id), '') is null then
    raise exception 'A valid store is required.';
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
    raise exception 'This store is not currently available for messaging.';
  end if;

  if exists (
    select 1 from public.business_members bm
    where bm.business_id = v_business_id
      and bm.user_id = v_customer
  ) then
    raise exception 'You manage this store and cannot message it as a customer.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_store_id || ':' || v_customer::text, 0)
  );

  select c.id into v_conversation_id
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
  )
  values (
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
  v_message_id uuid;
  v_body text := pg_catalog.btrim(coalesce(p_body, ''));
begin
  if v_user is null then
    raise exception 'Sign in to send a message.';
  end if;
  if p_conversation_id is null then
    raise exception 'A conversation is required.';
  end if;
  if pg_catalog.char_length(v_body) < 1 or pg_catalog.char_length(v_body) > 2000 then
    raise exception 'Messages must be between 1 and 2000 characters.';
  end if;

  select c.* into v_conversation
  from public.conversations c
  where c.id = p_conversation_id
    and c.feature = 'goodies'
    and c.customer_id = v_user
  for update;

  if not found then
    raise exception 'This store conversation was not found.';
  end if;
  if v_conversation.status = 'closed' then
    raise exception 'This conversation is closed.';
  end if;

  insert into public.messages (conversation_id, sender_id, body)
  values (v_conversation.id, v_user, v_body)
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
  v_message_id uuid;
  v_body text := pg_catalog.btrim(coalesce(p_body, ''));
begin
  if v_user is null then
    raise exception 'Sign in to reply.';
  end if;
  if p_conversation_id is null then
    raise exception 'A conversation is required.';
  end if;
  if pg_catalog.char_length(v_body) < 1 or pg_catalog.char_length(v_body) > 2000 then
    raise exception 'Messages must be between 1 and 2000 characters.';
  end if;

  select c.* into v_conversation
  from public.conversations c
  where c.id = p_conversation_id
    and c.feature = 'goodies'
  for update;

  if not found then
    raise exception 'This store conversation was not found.';
  end if;
  if v_conversation.status = 'closed' then
    raise exception 'This conversation is closed.';
  end if;
  if not exists (
    select 1 from public.business_members bm
    where bm.business_id = v_conversation.business_id
      and bm.user_id = v_user
  ) then
    raise exception 'You are not a member of this store.';
  end if;

  insert into public.messages (conversation_id, sender_id, body)
  values (v_conversation.id, v_user, v_body)
  returning id into v_message_id;

  return v_message_id;
end;
$function$;

revoke all on function public.goodies_start_store_conversation(text, text) from public, anon;
revoke all on function public.goodies_send_store_message(uuid, text) from public, anon;
revoke all on function public.goodies_vendor_reply(uuid, text) from public, anon;
grant execute on function public.goodies_start_store_conversation(text, text) to authenticated;
grant execute on function public.goodies_send_store_message(uuid, text) to authenticated;
grant execute on function public.goodies_vendor_reply(uuid, text) to authenticated;
