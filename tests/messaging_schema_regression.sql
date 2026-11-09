-- Read-only database regression checks for Wantiss Messages.
-- Run in the Wantiss SQL editor; these assertions do not alter user data.
do $$
declare t text; n int;
begin
 foreach t in array array['conversations','messages','notifications','user_friendships','message_preferences','message_business_preferences','message_participant_state','message_group_members'] loop
  if not exists(select 1 from pg_class c join pg_namespace s on s.oid=c.relnamespace where s.nspname='public' and c.relname=t and c.relrowsecurity) then
   raise exception 'RLS missing: %',t;
  end if;
 end loop;
 select count(*) into n from pg_policies where schemaname='public' and tablename='notifications';
 if n<2 then raise exception 'Notification policies unexpectedly missing'; end if;
 if not exists(select 1 from pg_proc where oid='public.wantiss_create_message_group(text,uuid[])'::regprocedure) then raise exception 'Group create RPC missing'; end if;
 if not exists(select 1 from pg_proc where oid='public.wantiss_manage_message_group(uuid,uuid,text)'::regprocedure) then raise exception 'Group management RPC missing'; end if;
 if not exists(select 1 from pg_trigger where tgname='wantiss_group_creation_guard' and not tgisinternal) then raise exception 'Group creation guard missing'; end if;
 if not exists(select 1 from pg_trigger where tgname='wantiss_group_participant_guard' and not tgisinternal) then raise exception 'Group update guard missing'; end if;
 raise notice 'Messaging schema and notification isolation checks passed';
end $$;
