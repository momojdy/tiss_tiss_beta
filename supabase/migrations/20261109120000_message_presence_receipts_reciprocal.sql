-- Friend-chat privacy: last seen and read receipts are visible only when BOTH people have them enabled.
-- Store (Goodies) conversations are not affected.

create or replace function public.wantiss_message_heartbeat()
returns void
language sql
security definer
set search_path to ''
as $function$
insert into public.wantiss_message_presence(user_id,last_active_at)
select auth.uid(),now() where auth.uid() is not null
on conflict(user_id) do update set last_active_at=now()
where wantiss_message_presence.last_active_at<now()-interval '30 seconds'
$function$;

create or replace function public.wantiss_message_peer_privacy(p_user_id uuid)
returns table(show_last_seen boolean, show_read_receipts boolean, last_active_at timestamptz)
language sql
stable
security definer
set search_path to ''
as $function$
select (coalesce(v.show_last_seen,false) and coalesce(mine.show_last_seen,false)),
(coalesce(v.show_read_receipts,true) and coalesce(mine.show_read_receipts,true)),
case when coalesce(v.show_last_seen,false) and coalesce(mine.show_last_seen,false) then p.last_active_at else null end
from (select 1) x
left join public.user_profile_visibility v on v.user_id=p_user_id
left join public.user_profile_visibility mine on mine.user_id=auth.uid()
left join public.wantiss_message_presence p on p.user_id=p_user_id
where auth.uid() is not null and p_user_id<>auth.uid()
and exists(select 1 from public.conversations c where
(auth.uid()=any(c.participant_ids) and p_user_id=any(c.participant_ids))
or (c.customer_id=auth.uid() and exists(select 1 from public.business_members bm where bm.business_id=c.business_id and bm.user_id=p_user_id)))
$function$;

-- Presence is only read and written through the security-definer functions above.
revoke all on public.wantiss_message_presence from anon, authenticated;
