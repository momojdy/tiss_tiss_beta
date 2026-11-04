-- Harden message mutation privileges: authenticated clients may only mark
-- messages they are allowed to read as read. Message identity/body are immutable
-- to clients; SECURITY DEFINER messaging RPCs remain the write path for Goodies.
revoke update on table public.messages from public, anon, authenticated;
revoke update (id, conversation_id, sender_id, body, created_at, read_at)
  on table public.messages from public, anon, authenticated;
grant update (read_at) on table public.messages to authenticated;

-- Keep the existing 2,000-character Goodies message contract and make the
-- customer follow-up limit apply only to messages since the latest vendor reply.
create or replace function public.goodies_validate_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  c public.conversations%rowtype;
  v_len integer;
  v_last_vendor_reply timestamptz;
  v_customer_messages bigint;
begin
  select * into c
  from public.conversations
  where id = new.conversation_id
  for update;

  if c.id is null or c.feature is distinct from 'goodies' then
    return new;
  end if;

  v_len := pg_catalog.char_length(pg_catalog.btrim(coalesce(new.body, '')));
  if v_len < 1 or v_len > 2000 then
    raise exception 'Messages must be between 1 and 2000 characters.';
  end if;
  if c.status = 'closed' then
    raise exception 'This conversation is closed.';
  end if;

  if (
    select count(*)
    from public.messages m
    where m.sender_id = new.sender_id
      and m.created_at > pg_catalog.now() - interval '1 minute'
  ) >= 10 then
    raise exception 'You are sending messages too quickly. Please wait a moment.';
  end if;

  if c.status = 'pending_vendor' and c.customer_id = new.sender_id then
    select pg_catalog.max(m.created_at)
      into v_last_vendor_reply
    from public.messages m
    where m.conversation_id = c.id
      and m.sender_id <> c.customer_id;

    select pg_catalog.count(*)
      into v_customer_messages
    from public.messages m
    where m.conversation_id = c.id
      and m.sender_id = c.customer_id
      and (v_last_vendor_reply is null or m.created_at > v_last_vendor_reply);

    if v_customer_messages >= 3 then
      raise exception 'The store has not replied yet. You can send more once they respond.';
    end if;
  end if;

  return new;
end;
$function$;

-- Use the store's configured timezone and weekly hours as the authoritative
-- clock. Missing or malformed hours fail closed, matching the customer UI.
create or replace function public.goodies_hours_allow_order(
  p_hours jsonb,
  p_timezone text,
  p_at timestamptz
)
returns boolean
language plpgsql
immutable
set search_path = ''
as $function$
declare
  v_days text[] := array['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  v_local timestamp without time zone;
  v_day_index integer;
  v_today jsonb;
  v_yesterday jsonb;
  v_open time without time zone;
  v_close time without time zone;
  v_prev_open time without time zone;
  v_prev_close time without time zone;
  v_local_time time without time zone;
begin
  if p_at is null or p_hours is null or pg_catalog.jsonb_typeof(p_hours) <> 'object'
     or p_hours = '{}'::jsonb then
    return false;
  end if;

  begin
    v_local := p_at at time zone coalesce(nullif(pg_catalog.btrim(p_timezone), ''), 'UTC');
  exception when others then
    return false;
  end;

  v_day_index := extract(dow from v_local)::integer;
  v_local_time := v_local::time;
  v_today := p_hours -> v_days[v_day_index + 1];
  v_yesterday := p_hours -> v_days[((v_day_index + 6) % 7) + 1];

  if v_today is not null
     and pg_catalog.jsonb_typeof(v_today) = 'object'
     and coalesce(v_today ->> 'closed', 'false') <> 'true'
     and coalesce(v_today ->> 'open', '') ~ '^([0-9]|[01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$'
     and coalesce(v_today ->> 'close', '') ~ '^([0-9]|[01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$' then
    v_open := (v_today ->> 'open')::time;
    v_close := (v_today ->> 'close')::time;

    if v_open < v_close and v_local_time >= v_open and v_local_time < v_close then
      return true;
    elsif v_open >= v_close and v_local_time >= v_open then
      return true;
    end if;
  end if;

  -- A previous day's overnight opening window may still be active after midnight.
  if v_yesterday is not null
     and pg_catalog.jsonb_typeof(v_yesterday) = 'object'
     and coalesce(v_yesterday ->> 'closed', 'false') <> 'true'
     and coalesce(v_yesterday ->> 'open', '') ~ '^([0-9]|[01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$'
     and coalesce(v_yesterday ->> 'close', '') ~ '^([0-9]|[01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$' then
    v_prev_open := (v_yesterday ->> 'open')::time;
    v_prev_close := (v_yesterday ->> 'close')::time;

    if v_prev_open >= v_prev_close and v_local_time < v_prev_close then
      return true;
    end if;
  end if;

  return false;
end;
$function$;

create or replace function public.goodies_enforce_store_opening_hours()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_hours jsonb;
  v_timezone text;
  v_live boolean;
  v_order_at timestamptz;
begin
  if new.order_type not in ('delivery', 'pickup') then
    return new;
  end if;

  select s.hours,
         coalesce(nullif(pg_catalog.btrim(s.scheduled_order_timezone), ''), 'UTC'),
         s.is_live
    into v_hours, v_timezone, v_live
  from public.goodies_store_schedules s
  where s.store_id = new.store_id;

  if not found or v_live is distinct from true then
    raise exception 'This store is not accepting online orders.' using errcode = 'P0001';
  end if;

  v_order_at := coalesce(new.scheduled_for, pg_catalog.now());
  if not public.goodies_hours_allow_order(v_hours, v_timezone, v_order_at) then
    if new.scheduled_for is null then
      raise exception 'This store is currently closed. Please try again during its opening hours.' using errcode = 'P0001';
    else
      raise exception 'The selected order time is outside this store''s opening hours. Choose a time during opening hours.' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists goodies_enforce_store_opening_hours on public.goodies_orders;
create trigger goodies_enforce_store_opening_hours
before insert or update of store_id, order_type, scheduled_for
on public.goodies_orders
for each row
execute function public.goodies_enforce_store_opening_hours();

revoke all on function public.goodies_hours_allow_order(jsonb, text, timestamptz) from public, anon, authenticated;
revoke all on function public.goodies_enforce_store_opening_hours() from public, anon, authenticated;
