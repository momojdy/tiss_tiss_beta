begin;

-- Goodies reads server-managed staff and grant records. User-editable JWT or
-- user metadata never establish invitation acceptance or authority here.
create function private.goodies_has_staff_permission(p_permission text,p_level text)
returns boolean language sql stable security definer set search_path='' as $$
 select p_level in ('view','edit','manage') and exists(
  select 1 from public.wantiss_admin_staff s join auth.users u on u.id=s.user_id
  where s.user_id=(select auth.uid()) and s.status='active' and u.email_confirmed_at is not null
   and (s.invitation_expires_at is null or s.invitation_expires_at>now())
   and (s.invited_at is null or s.invitation_expires_at is null)
   and (s.role='super_admin' or exists(
    select 1 from public.wantiss_admin_permission_grants g
    where g.staff_user_id=s.user_id and g.permission_key=p_permission
     and g.revoked_at is null and (g.expires_at is null or g.expires_at>now())
     and case p_level when 'view' then g.access_level in ('view','edit','manage')
       when 'edit' then g.access_level in ('edit','manage') when 'manage' then g.access_level='manage' else false end
   ))
 )
$$;
revoke all on function private.goodies_has_staff_permission(text,text) from public,anon,authenticated;

create or replace function public.goodies_admin_assert()
returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.goodies_has_staff_permission('goodies.ops','manage') then
  raise exception 'Goodies administrator access required' using errcode='42501';
 end if;
end $$;
revoke all on function public.goodies_admin_assert() from public,anon,authenticated;

do $read_permissions$
declare f record;definition text;
begin
 for f in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname=any(array['goodies_admin_analytics','goodies_admin_dashboard',
   'goodies_admin_list_courier_candidates','goodies_admin_list_delivery_reports','goodies_admin_list_reviews',
   'goodies_admin_orders_page','goodies_admin_courier_candidates_page']) loop
  definition:=pg_get_functiondef(f.oid);
  if definition!~*'perform\s+public\.goodies_admin_assert\(\);' then raise exception 'Goodies read authorization contract drift';end if;
  execute regexp_replace(definition,'perform\s+public\.goodies_admin_assert\(\);',
   'if not private.goodies_has_staff_permission(''goodies.ops'',''view'') then raise exception ''Goodies administrator access required'' using errcode=''42501'';end if;','i');
 end loop;
end $read_permissions$;

-- An operational grant cannot change prices/fees or release disputed funds.
do $finance_permissions$
declare f record;definition text;
begin
 for f in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname=any(array['goodies_admin_update_fee_policy',
   'goodies_admin_update_delivery_surcharge_policy','goodies_admin_update_multi_store_policy',
   'goodies_admin_resolve_delivery_dispute']) loop
  definition:=pg_get_functiondef(f.oid);
  if definition!~*'perform\s+public\.goodies_admin_assert\(\);' then raise exception 'Goodies finance authorization contract drift';end if;
  execute regexp_replace(definition,'perform\s+public\.goodies_admin_assert\(\);',
   'perform public.goodies_admin_assert();if not private.goodies_has_staff_permission(''finance.approve'',''manage'') then raise exception ''Financial approval access required'' using errcode=''42501'';end if;','i');
 end loop;
end $finance_permissions$;

create or replace function private.goodies_finance_assert(p_manage boolean default false)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.goodies_has_staff_permission(case when p_manage then 'finance.approve' else 'finance.view' end,
  case when p_manage then 'manage' else 'view' end) then raise exception 'Not authorized' using errcode='42501';end if;
end $$;
revoke all on function private.goodies_finance_assert(boolean) from public,anon,authenticated;

create or replace function private.goodies_review_admin_read()
returns boolean language sql stable security definer set search_path='' as $$
 select private.goodies_has_staff_permission('goodies.ops','view')
$$;
revoke all on function private.goodies_review_admin_read() from public,anon;
grant execute on function private.goodies_review_admin_read() to authenticated;

-- Preserve the existing editor/refund permission keys, strengthening only the
-- Goodies implementations. The shared super-app permission function is untouched.
do $scoped_shared_permissions$
declare f record;definition text;
begin
 for f in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname=any(array['wantiss_admin_list_goodies_builder_businesses',
   'wantiss_admin_list_goodies_builder_configs','wantiss_admin_save_goodies_builder_config',
   'wantiss_admin_requeue_goodies_card_refund','wantiss_admin_list_ingredient_requests',
   'wantiss_admin_list_library_ingredients','wantiss_admin_review_ingredient_request',
   'wantiss_admin_save_library_ingredient','wantiss_admin_set_ingredient_rules']) loop
  definition:=pg_get_functiondef(f.oid);
  if position('public.wantiss_has_permission(' in definition)=0 then raise exception 'Goodies scoped staff authorization drift';end if;
  execute replace(definition,'public.wantiss_has_permission(','private.goodies_has_staff_permission(');
 end loop;
end $scoped_shared_permissions$;

-- Apply the same server-owned invitation check to Goodies CMS operations only.
-- Other super-app content retains its existing authorization implementation.
do $goodies_cms_permissions$
declare f record;definition text;permission text;level text;scope text;pattern text;replacement text;
begin
 for f in select p.oid,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname in('wantiss_admin_upsert_cms_version',
   'wantiss_admin_publish_cms_version','wantiss_admin_archive_cms_version') loop
  definition:=pg_get_functiondef(f.oid);
  if f.proname='wantiss_admin_upsert_cms_version' then
   permission:='content.manage';level:='edit';scope:='trim(coalesce(p_content_key,''''))=''goodies.content''';
  else
   permission:=case when f.proname='wantiss_admin_publish_cms_version' then 'content.publish' else 'content.archive' end;
   level:='manage';scope:='exists(select 1 from public.wantiss_cms_content where id=p_content_id and content_key=''goodies.content'')';
  end if;
  pattern:='public\.wantiss_has_permission\('''||replace(permission,'.','\.')||''',\s*'''||level||'''\)';
  if definition!~pattern then raise exception 'Goodies CMS authorization contract drift';end if;
  replacement:='(case when '||scope||' then private.goodies_has_staff_permission('''||permission||''','''||level||''') else public.wantiss_has_permission('''||permission||''','''||level||''') end)';
  execute regexp_replace(definition,pattern,replacement,'g');
 end loop;
end $goodies_cms_permissions$;

do $proof_read_permissions$
declare definition text;
begin
 definition:=pg_get_functiondef('private.goodies_can_access_delivery_proof(text,boolean)'::regprocedure);
 if definition!~*'perform\s+public\.goodies_admin_assert\(\);' then raise exception 'Goodies proof read authorization drift';end if;
 execute regexp_replace(definition,'perform\s+public\.goodies_admin_assert\(\);',
  'if not private.goodies_has_staff_permission(''goodies.ops'',''view'') then raise exception ''Not authorized'' using errcode=''42501'';end if;','i');
end $proof_read_permissions$;

-- A Goodies permission does not authorize changing an unrelated business or
-- lifting a business-wide restriction through an ordinary product approval.
do $merchant_scope$
declare f record;definition text;guard text;
begin
 for f in select p.oid,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname in('goodies_admin_set_merchant_status','goodies_admin_set_merchant_verification') loop
  definition:=pg_get_functiondef(f.oid);
  guard:='perform public.goodies_admin_assert();if not exists(select 1 from public.goodies_store_schedules where business_id=p_business_id) then raise exception ''Goodies merchant not found'' using errcode=''P0002'';end if;';
  if f.proname='goodies_admin_set_merchant_verification' then
   guard:=guard||'if p_status is null then raise exception ''Choose a verification decision'' using errcode=''22023'';end if;if exists(select 1 from public.businesses where id=p_business_id and verification=''restricted'') then raise exception ''Review the business restriction before changing verification'' using errcode=''42501'';end if;';
  else
   guard:=guard||'if p_live and exists(select 1 from public.businesses where id=p_business_id and verification<>''verified'') then raise exception ''Verify the merchant before making the store available'' using errcode=''42501'';end if;';
  end if;
  if definition!~*'perform\s+public\.goodies_admin_assert\(\);' then raise exception 'Goodies merchant authorization drift';end if;
  execute regexp_replace(definition,'perform\s+public\.goodies_admin_assert\(\);',guard,'i');
 end loop;
end $merchant_scope$;

commit;
