create or replace function public.get_my_goodies_access_status()
returns table(status text, reason text, ends_at timestamptz, restriction_kind text)
language plpgsql stable security definer set search_path = '' as $function$
declare v_uid uuid := (select auth.uid()); v_row record;
begin
 if v_uid is null then raise exception 'Sign in required' using errcode='28000'; end if;
 select r.kind,r.reason,r.ends_at into v_row
 from public.wantiss_admin_account_restrictions r
 where r.target_user_id=v_uid and r.scope in ('all','GoodiesCustomer')
   and r.status='active' and r.starts_at<=now()
   and (r.ends_at is null or r.ends_at>now())
 order by case when r.kind='Ban' then 0 else 1 end,r.starts_at desc limit 1;
 if found then
   return query select case when v_row.kind='Ban' then 'banned' else 'suspended' end,v_row.reason,v_row.ends_at,v_row.kind;
 else
   return query select 'active'::text,null::text,null::timestamptz,null::text;
 end if;
end;
$function$;