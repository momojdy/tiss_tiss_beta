-- Group invitations and shared-cart writes must respect the same store
-- admission and public product moderation rules as ordinary Goodies checkout.
-- Existing group read, end and completed-order/refund access is untouched.
begin;
do $admission$
declare
  source_create text;
  source_join text;
  source_item text;
  source_invite text;
  create_needle text := '  if not exists(select 1 from public.goodies_store_schedules where store_id=p_store_id and is_live=true) then';
  join_needle text := ' if not found or v_group.status<>''open'' or v_group.expires_at<=now() then raise exception ''This group invite code is invalid or expired'' using errcode=''P0001''; end if;';
  invite_needle text := '  if v_group.status <> ''open'' or v_group.expires_at <= pg_catalog.now() then'||E'\n'||'    raise exception ''This group order has closed'' using errcode = ''P0001'';'||E'\n'||'  end if;';
  membership_needle text := ' if not exists(select 1 from public.goodies_group_order_members m where m.group_id=v_group.id and m.user_id=v_uid) then raise exception ''Join this group before adding items'' using errcode=''42501''; end if;';
  product_needle text := 'where p.id=p_product_id and b.store_id=v_group.store_id and b.is_live=true and p.is_available=true for update of p;';
  store_guard text := ' perform private.goodies_assert_store_admission((select s.business_id from public.goodies_store_schedules s where s.store_id=v_group.store_id));';
begin
  select pg_get_functiondef('public.goodies_group_order_create(text)'::regprocedure) into source_create;
  select pg_get_functiondef('public.goodies_group_order_join(text)'::regprocedure) into source_join;
  select pg_get_functiondef('public.goodies_group_order_upsert_item(uuid,uuid,text,integer,jsonb,text)'::regprocedure) into source_item;
  select pg_get_functiondef('public.goodies_group_order_invite_friends(uuid,uuid[])'::regprocedure) into source_invite;
  if source_create is null or source_join is null or source_item is null or source_invite is null
     or position(create_needle in source_create)=0
     or position(join_needle in source_join)=0
     or position(invite_needle in source_invite)=0
     or position(membership_needle in source_item)=0
     or position(product_needle in source_item)=0
     or position('private.goodies_assert_store_admission' in source_item)>0
  then raise exception 'Group order admission contract changed; inspect before applying' using errcode='55000';end if;

  execute replace(source_create,create_needle,
    '  perform private.goodies_assert_store_admission((select s.business_id from public.goodies_store_schedules s where s.store_id=p_store_id));'||E'\n'||create_needle);
  execute replace(source_join,join_needle,join_needle||E'\n'||store_guard);
  execute replace(source_invite,invite_needle,invite_needle||E'\n'||store_guard);
  execute replace(
    replace(source_item,membership_needle,membership_needle||E'\n'||store_guard),
    product_needle,
    'where p.id=p_product_id and b.store_id=v_group.store_id and b.is_live=true and p.is_available=true and p.review_status=''approved'' and coalesce(p.restriction,'''')<>''alcohol'' for update of p;'
  );
end $admission$;
commit;
