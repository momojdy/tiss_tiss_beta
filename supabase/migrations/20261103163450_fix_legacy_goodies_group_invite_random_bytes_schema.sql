-- Keep the legacy group-create RPC compatible with deployments where pgcrypto
-- is installed in the extensions schema and not on the default search_path.
create or replace function public.goodies_group_create(p_store_id text)
returns table(group_id uuid,invite_code text)
language plpgsql
security definer
set search_path=pg_catalog,public,extensions,pg_temp
as $$
declare
  v_uid uuid:=auth.uid();
  v_store public.goodies_store_schedules%rowtype;
  v_id uuid;
  v_code text;
  v_try integer:=0;
begin
  if v_uid is null then raise exception 'Sign in to start a group order' using errcode='28000'; end if;
  if not private.goodies_customer_can_access() then raise exception 'Your access to Goodies is restricted' using errcode='42501'; end if;
  select * into v_store from public.goodies_store_schedules s where s.store_id=p_store_id and s.is_live=true;
  if not found then raise exception 'This store is not accepting orders' using errcode='P0001'; end if;
  loop
    v_code:=upper(substr(encode(extensions.gen_random_bytes(8),'hex'),1,10));
    begin
      insert into public.goodies_group_orders(invite_code,store_id,host_user_id)
      values(v_code,p_store_id,v_uid) returning id into v_id;
      exit;
    exception when unique_violation then
      v_try:=v_try+1;
      if v_try>=5 then raise exception 'Could not create a unique group code. Please retry'; end if;
    end;
  end loop;
  insert into public.goodies_group_order_members(group_id,user_id,role) values(v_id,v_uid,'host');
  return query select v_id,v_code;
end;
$$;
revoke all on function public.goodies_group_create(text) from public,anon;
grant execute on function public.goodies_group_create(text) to authenticated;
