-- Fix group invite code generation and checkout's ambiguous CMS status reference.
create or replace function public.goodies_group_order_create(p_store_id text)
returns table(group_id uuid, invite_code text, expires_at timestamptz)
language plpgsql
security definer
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
    exit when not exists(select 1 from public.goodies_group_orders g where g.invite_code=v_code and g.status='open' and g.expires_at>now());
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

do $$
declare
  v_def text;
begin
  select pg_get_functiondef(
    'public.place_goodies_order(text,text,timestamp with time zone,jsonb,text,jsonb,numeric,numeric,numeric,numeric,numeric,numeric,text,text)'::regprocedure
  ) into v_def;
  v_def := replace(v_def,
    'from public.wantiss_cms_content where content_key in (''goodies.content'', ''goodies'') and status = ''published''',
    'from public.wantiss_cms_content c where c.content_key in (''goodies.content'', ''goodies'') and c.status = ''published''');
  v_def := replace(v_def,
    'from public.wantiss_cms_content where content_key in (''goodies.content'',''goodies'') and status=''published''',
    'from public.wantiss_cms_content c where c.content_key in (''goodies.content'',''goodies'') and c.status=''published''');
  if v_def not like '%c.status%published%' then
    raise exception 'Could not safely qualify the CMS status references in place_goodies_order';
  end if;
  execute v_def;
end;
$$;

-- The table already has an INSERT RLS policy restricting user_id to auth.uid().
-- Grant the privilege needed for the authenticated card-setup flow to use it.
grant insert on public.stripe_customers to authenticated;
