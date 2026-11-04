-- A customer follow-up makes a previously active Goodies thread need
-- another vendor reply. Closed Goodies threads cannot accept new direct inserts.
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
  select * into c from public.conversations where id = new.conversation_id;
  if c.id is null then return new; end if;

  if c.customer_id = new.sender_id then
    update public.conversations
    set last_body = new.body,
        updated_at = pg_catalog.now(),
        unread_business = unread_business + 1,
        status = case when c.feature = 'goodies' then 'pending_vendor' else status end
    where id = c.id;

    if c.feature = 'goodies' then
      v_name := coalesce(nullif(c.customer_name, ''), 'A customer');
      for m in
        select distinct bm.user_id from public.business_members bm
        where bm.business_id = c.business_id
      loop
        begin
          insert into public.notifications (
            user_id, title, body, feature_name, notification_type, destination, metadata
          ) values (
            m.user_id, 'New message from ' || v_name, pg_catalog.left(new.body, 140),
            'goodies', 'store_message', 'messages',
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
          c.customer_id, coalesce(c.ref_label, 'Store') || ' replied',
          pg_catalog.left(new.body, 140), 'goodies', 'store_message', 'storechat',
          pg_catalog.jsonb_build_object('conversation_id', c.id, 'store_id', c.ref_id)
        );
      exception when others then
        raise warning 'Goodies customer reply notification failed for conversation %: %', c.id, sqlerrm;
      end;
    end if;
  end if;

  return new;
end;
$function$;

drop policy if exists "Goodies chat participants send only as customer or store member" on public.messages;
create policy "Goodies chat participants send only as customer or store member"
on public.messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and exists (
    select 1
    from public.conversations c
    where c.id = messages.conversation_id
      and (
        (
          c.feature = 'goodies'
          and c.status <> 'closed'
          and (
            c.customer_id = (select auth.uid())
            or exists (
              select 1 from public.business_members bm
              where bm.business_id = c.business_id
                and bm.user_id = (select auth.uid())
            )
          )
        )
        or (
          coalesce(c.feature, '') <> 'goodies'
          and (
            (select auth.uid()) = any(c.participant_ids)
            or exists (
              select 1 from public.business_members bm
              where bm.business_id = c.business_id
                and bm.user_id = (select auth.uid())
            )
          )
        )
      )
  )
);
