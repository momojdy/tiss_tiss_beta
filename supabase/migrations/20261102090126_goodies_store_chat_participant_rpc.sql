-- Securely create a Goodies store conversation with both real participants.
-- Customers cannot read other business_members rows under RLS, so the database
-- resolves the store recipient instead of trusting participant IDs supplied by a client.
create or replace function public.goodies_start_store_conversation(
  p_store_id text,
  p_customer_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_customer uuid := auth.uid();
  v_business_id uuid;
  v_store_name text;
  v_business_user uuid;
  v_conversation_id uuid;
begin
  if v_customer is null then
    raise exception 'Sign in to message this store.';
  end if;
  if nullif(btrim(p_store_id), '') is null then
    raise exception 'A valid store is required.';
  end if;

  select gs.business_id,
         coalesce(nullif(btrim(gs.store_name), ''), nullif(btrim(gs.business_name), ''), 'Goodies store')
    into v_business_id, v_store_name
  from public.goodies_store_schedules gs
  where gs.store_id = p_store_id
    and gs.is_live = true;

  if v_business_id is null then
    raise exception 'This store is not currently available for messaging.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_store_id || ':' || v_customer::text, 0));

  select c.id into v_conversation_id
  from public.conversations c
  where c.business_id = v_business_id
    and c.feature = 'goodies'
    and c.ref_id = p_store_id
    and c.customer_id = v_customer
  order by c.updated_at desc
  limit 1;

  if v_conversation_id is not null then
    return v_conversation_id;
  end if;

  select bm.user_id into v_business_user
  from public.business_members bm
  where bm.business_id = v_business_id
    and bm.user_id <> v_customer
  order by case bm.role when 'owner' then 0 when 'admin' then 1 else 2 end,
           bm.created_at,
           bm.id
  limit 1;

  if v_business_user is null then
    raise exception 'This store has no other authorized member available to receive messages.';
  end if;

  insert into public.conversations (
    business_id, participant_ids, customer_id, customer_name, feature,
    ref_id, ref_label, title, last_body, unread_business, unread_customer
  ) values (
    v_business_id, array[v_customer, v_business_user]::uuid[], v_customer,
    coalesce(nullif(btrim(p_customer_name), ''), 'Customer'),
    'goodies', p_store_id, v_store_name, v_store_name, '', 0, 0
  )
  returning id into v_conversation_id;

  return v_conversation_id;
end;
$$;

revoke all on function public.goodies_start_store_conversation(text, text) from public, anon;
grant execute on function public.goodies_start_store_conversation(text, text) to authenticated;
