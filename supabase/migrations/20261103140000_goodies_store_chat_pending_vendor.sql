-- Goodies store messaging: customers can message a store even when the caller is the only
-- registered member elsewhere; chat starts as pending_vendor and becomes active on first reply.
alter table public.conversations add column if not exists status text not null default 'active';
alter table public.conversations add column if not exists vendor_replied_at timestamptz;
alter table public.conversations drop constraint if exists conversations_status_check;
alter table public.conversations add constraint conversations_status_check check (status in ('pending_vendor','active','closed'));

create or replace function public.goodies_start_store_conversation(p_store_id text, p_customer_name text default null)
returns uuid language plpgsql security definer set search_path to 'pg_catalog','public','pg_temp' as $$
declare v_customer uuid := auth.uid(); v_business_id uuid; v_store_name text; v_id uuid;
begin
  if v_customer is null then raise exception 'Sign in to message this store.'; end if;
  if nullif(btrim(p_store_id), '') is null then raise exception 'A valid store is required.'; end if;
  select gs.business_id, coalesce(nullif(btrim(gs.store_name), ''), nullif(btrim(gs.business_name), ''), 'Goodies store')
    into v_business_id, v_store_name from public.goodies_store_schedules gs
   where gs.store_id = p_store_id and gs.is_live = true;
  if v_business_id is null then raise exception 'This store is not currently available for messaging.'; end if;
  if exists (select 1 from public.business_members bm where bm.business_id = v_business_id and bm.user_id = v_customer) then
    raise exception 'You manage this store, so you cannot message it as a customer. Use another customer account.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_store_id || ':' || v_customer::text, 0));
  select c.id into v_id from public.conversations c
   where c.business_id = v_business_id and c.feature = 'goodies' and c.ref_id = p_store_id and c.customer_id = v_customer
   order by c.updated_at desc limit 1;
  if v_id is not null then return v_id; end if;
  insert into public.conversations (business_id, participant_ids, customer_id, customer_name, feature, ref_id, ref_label, title, last_body, unread_business, unread_customer, status)
  values (v_business_id, array[v_customer]::uuid[], v_customer, coalesce(nullif(btrim(p_customer_name), ''), 'Customer'), 'goodies', p_store_id, v_store_name, v_store_name, '', 0, 0, 'pending_vendor')
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.goodies_start_store_conversation(text, text) from public, anon;
grant execute on function public.goodies_start_store_conversation(text, text) to authenticated;

-- Validation before insert (Goodies chats only).
create or replace function public.goodies_validate_message() returns trigger
language plpgsql security definer set search_path to 'pg_catalog','public','pg_temp' as $$
declare c public.conversations; v_len int;
begin
  select * into c from public.conversations where id = new.conversation_id;
  if c.id is null or c.feature is distinct from 'goodies' then return new; end if;
  v_len := char_length(btrim(coalesce(new.body, '')));
  if v_len < 1 or v_len > 2000 then raise exception 'Messages must be between 1 and 2000 characters.'; end if;
  if c.status = 'closed' then raise exception 'This conversation is closed.'; end if;
  if (select count(*) from public.messages m where m.sender_id = new.sender_id and m.created_at > now() - interval '1 minute') >= 10 then
    raise exception 'You are sending messages too quickly. Please wait a moment.';
  end if;
  if c.status = 'pending_vendor' and c.customer_id = new.sender_id
     and (select count(*) from public.messages m where m.conversation_id = c.id and m.sender_id = c.customer_id) >= 3 then
    raise exception 'The store has not replied yet. You can send more once they respond.';
  end if;
  return new;
end $$;
drop trigger if exists goodies_validate_message on public.messages;
create trigger goodies_validate_message before insert on public.messages for each row execute function public.goodies_validate_message();

-- Summary, status flip, participant add, notifications (server-side only).
create or replace function public.goodies_update_conversation_summary() returns trigger
language plpgsql security definer set search_path to 'pg_catalog','public','pg_temp' as $$
declare c public.conversations; v_name text; m record;
begin
  select * into c from public.conversations where id = new.conversation_id;
  if c.id is null then return new; end if;
  if c.customer_id = new.sender_id then
    update public.conversations set last_body = new.body, updated_at = now(), unread_business = unread_business + 1 where id = c.id;
    if c.feature = 'goodies' then
      v_name := coalesce(nullif(c.customer_name, ''), 'A customer');
      for m in select distinct user_id from public.business_members where business_id = c.business_id loop
        insert into public.notifications (user_id, title, body, feature_name, notification_type, destination, metadata)
        values (m.user_id, 'New message from ' || v_name, left(new.body, 140), 'goodies', 'store_message', 'messages',
                jsonb_build_object('conversation_id', c.id, 'business_id', c.business_id));
      end loop;
    end if;
  else
    update public.conversations set last_body = new.body, updated_at = now(), unread_customer = unread_customer + 1,
      status = case when status = 'pending_vendor' then 'active' else status end,
      vendor_replied_at = coalesce(vendor_replied_at, now()),
      participant_ids = case when new.sender_id = any(participant_ids) then participant_ids else array_append(participant_ids, new.sender_id) end
    where id = c.id;
    if c.feature = 'goodies' and c.customer_id is not null then
      insert into public.notifications (user_id, title, body, feature_name, notification_type, destination, metadata)
      values (c.customer_id, coalesce(c.ref_label, 'Store') || ' replied', left(new.body, 140), 'goodies', 'store_message', 'messages',
              jsonb_build_object('conversation_id', c.id));
    end if;
  end if;
  return new;
end $$;

create or replace function public.mark_conversation_read(p_conv uuid) returns void
language plpgsql security definer set search_path to 'pg_catalog','public','pg_temp' as $$
declare c public.conversations; u uuid := auth.uid();
begin
  if u is null then raise exception 'Sign in required.'; end if;
  select * into c from public.conversations where id = p_conv;
  if c.id is null then return; end if;
  if exists (select 1 from public.business_members bm where bm.business_id = c.business_id and bm.user_id = u) then
    update public.conversations set unread_business = 0 where id = c.id;
    update public.messages set read_at = now() where conversation_id = c.id and sender_id = c.customer_id and read_at is null;
  elsif c.customer_id = u then
    update public.conversations set unread_customer = 0 where id = c.id;
    update public.messages set read_at = now() where conversation_id = c.id and sender_id <> u and read_at is null;
  end if;
end $$;
revoke all on function public.mark_conversation_read(uuid) from public, anon;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='conversations') then
    alter publication supabase_realtime add table public.conversations;
  end if;
end $$;
