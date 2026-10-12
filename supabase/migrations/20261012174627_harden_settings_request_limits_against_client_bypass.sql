revoke all on public.account_security_requests from anon, authenticated;
grant select on public.account_security_requests to authenticated;

create or replace function public.force_account_security_request_timestamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists force_account_security_request_timestamp on public.account_security_requests;
create trigger force_account_security_request_timestamp
before insert on public.account_security_requests
for each row execute function public.force_account_security_request_timestamp();

create or replace function public.request_account_security_action(p_request_type text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_limit integer;
  v_count integer;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_request_type not in ('email_verification','phone_change') then raise exception 'Unsupported request type'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text || ':' || p_request_type, 0));
  v_limit := case when p_request_type = 'email_verification' then 5 else 3 end;
  select count(*) into v_count
  from public.account_security_requests
  where user_id = v_user and request_type = p_request_type and created_at > now() - interval '24 hours';
  if v_count >= v_limit then return jsonb_build_object('allowed', false, 'remaining', 0, 'limit', v_limit); end if;
  insert into public.account_security_requests(user_id, request_type) values (v_user, p_request_type);
  return jsonb_build_object('allowed', true, 'remaining', v_limit - v_count - 1, 'limit', v_limit);
end;
$$;
revoke all on function public.request_account_security_action(text) from public, anon;
grant execute on function public.request_account_security_action(text) to authenticated;
