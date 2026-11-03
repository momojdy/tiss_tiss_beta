create or replace function public.goodies_group_order_create(p_store_id text)
returns table(group_id uuid,invite_code text,expires_at timestamptz)
language plpgsql security definer
set search_path=pg_catalog,public,extensions,pg_temp
as $$
declare
  v_uid uuid:=auth.uid();
  v_id uuid;
  v_code text;
  v_try integer:=0;
begin
  if v_uid is null then raise exception 'Sign in to start a group order' using errcode='28000'; end if;
  if not private.goodies_customer_can_access() then raise exception 'Your access to Goodies is restricted' using errcode='42501'; end if;
  if not exists(select 1 from public.goodies_store_schedules where store_id=p_store_id and is_live=true) then
    raise exception 'This store is not accepting orders' using errcode='P0001';
  end if;
  loop
    v_code:=upper(substr(encode(extensions.gen_random_bytes(6),'hex'),1,8));
    exit when not exists(select 1 from public.goodies_group_orders where invite_code=v_code and status='open' and expires_at>now());
    v_try:=v_try+1;
    if v_try>10 then raise exception 'Could not create an invite code' using errcode='P0001'; end if;
  end loop;
  insert into public.goodies_group_orders(invite_code,store_id,host_user_id,status,max_members,expires_at)
  values(v_code,p_store_id,v_uid,'open',20,now()+interval '24 hours')
  returning id into v_id;
  insert into public.goodies_group_order_members(group_id,user_id,role) values(v_id,v_uid,'host');
  return query select g.id,g.invite_code,g.expires_at from public.goodies_group_orders g where g.id=v_id;
end;
$$;
