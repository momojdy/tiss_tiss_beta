create or replace function public.wantiss_has_permission(p_permission text, p_min_level text default 'view')
returns boolean language sql stable security definer set search_path = ''
as $$
 select exists (
  select 1 from public.wantiss_admin_staff s join auth.users u on u.id=s.user_id
  where s.user_id=(select auth.uid()) and s.status='active' and u.email_confirmed_at is not null
   and (s.invitation_expires_at is null or s.invitation_expires_at > now())
   and (s.role='super_admin' or exists (
    select 1 from public.wantiss_admin_permission_grants g where g.staff_user_id=s.user_id
     and g.permission_key=p_permission and g.revoked_at is null and (g.expires_at is null or g.expires_at>now())
     and case p_min_level when 'view' then g.access_level in ('view','edit','manage') when 'edit' then g.access_level in ('edit','manage') when 'manage' then g.access_level='manage' else false end
   ))
 );
$$;
revoke all on function public.wantiss_has_permission(text,text) from public,anon;
grant execute on function public.wantiss_has_permission(text,text) to authenticated;

create or replace function public.wantiss_admin_dashboard_snapshot(p_domain text)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare v_items jsonb;
begin
 if not (
  (p_domain='operations' and public.wantiss_has_permission('operations','view')) or
  (p_domain='ecosystem' and public.wantiss_has_permission('ecosystem','view')) or
  (p_domain='finance' and public.wantiss_has_permission('finance','view')) or
  (p_domain='people' and public.wantiss_has_permission('people','view')) or
  (p_domain='support' and public.wantiss_has_permission('support','view'))
 ) then raise exception 'Not authorized' using errcode='42501'; end if;
 if p_domain='operations' then
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into v_items from (
   select id,business_name,status,review_note,reviewed_by,reviewed_at,created_at from public.business_applications order by created_at desc limit 500
  ) x;
 elsif p_domain='ecosystem' then
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into v_items from (
   select id,name,verification,is_live,payout_ready,city,country,created_at from public.businesses order by created_at desc limit 500
  ) x;
 elsif p_domain='finance' then
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into v_items from (
   select id,user_id,amount,status,description,feature_name,activity_type,created_at from public.wallet_transactions order by created_at desc limit 500
  ) x;
 elsif p_domain='people' then
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into v_items from (
   select id,full_name,email,role,created_at from public.profiles order by created_at desc limit 500
  ) x;
 elsif p_domain='support' then
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into v_items from (
   select id,user_id,request_type,status,subject,message,created_at from public.settings_support_requests order by created_at desc limit 500
  ) x;
 else raise exception 'Unknown domain'; end if;
 return jsonb_build_object('items',coalesce(v_items,'[]'::jsonb));
end $$;
revoke all on function public.wantiss_admin_dashboard_snapshot(text) from public,anon;
grant execute on function public.wantiss_admin_dashboard_snapshot(text) to authenticated;

create or replace function public.wantiss_admin_review_business_application(p_application_id uuid,p_status text,p_review_note text default null)
returns void language plpgsql security definer set search_path = ''
as $$
begin
 if not public.wantiss_has_permission('operations','edit') then raise exception 'Not authorized' using errcode='42501'; end if;
 if p_status not in ('approved','rejected','pending') then raise exception 'Invalid status'; end if;
 update public.business_applications set status=p_status,review_note=left(coalesce(p_review_note,''),2000),
  reviewed_by=(select auth.uid()),reviewed_at=now(),updated_at=now()
 where id=p_application_id;
 if not found then raise exception 'Application not found'; end if;
 insert into public.wantiss_admin_audit_log(actor_user_id,action,resource_type,resource_id,reason,after_state)
 values ((select auth.uid()),'business_application_reviewed','business_application',p_application_id::text,left(coalesce(p_review_note,''),500),jsonb_build_object('status',p_status));
end $$;
revoke all on function public.wantiss_admin_review_business_application(uuid,text,text) from public,anon;
grant execute on function public.wantiss_admin_review_business_application(uuid,text,text) to authenticated;

create or replace function public.wantiss_admin_register_cms_asset(
 p_asset_key text,p_storage_path text,p_content_type text,p_byte_size bigint,p_alt_text jsonb default '{}'::jsonb,p_status text default 'draft'
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_id uuid; v_actor uuid := (select auth.uid());
begin
 if v_actor is null or not public.wantiss_has_permission('content.assets','edit') then raise exception 'Not authorized' using errcode='42501'; end if;
 if split_part(p_storage_path,'/',1)<>v_actor::text or length(p_storage_path)>512 then raise exception 'Invalid asset path'; end if;
 if p_status not in ('draft','published') then raise exception 'Invalid initial asset state'; end if;
 if p_status='published' and not public.wantiss_has_permission('content.assets','manage') then raise exception 'Publishing requires asset manage access' using errcode='42501'; end if;
 insert into public.wantiss_cms_assets(asset_key,storage_path,content_type,byte_size,alt_text,status,created_by,updated_by,published_by,published_at)
 values(trim(p_asset_key),p_storage_path,p_content_type,p_byte_size,coalesce(p_alt_text,'{}'::jsonb),p_status,v_actor,v_actor,
  case when p_status='published' then v_actor else null end,case when p_status='published' then now() else null end)
 returning id into v_id;
 return v_id;
end $$;
revoke all on function public.wantiss_admin_register_cms_asset(text,text,text,bigint,jsonb,text) from public,anon;
grant execute on function public.wantiss_admin_register_cms_asset(text,text,text,bigint,jsonb,text) to authenticated;

create or replace function public.wantiss_admin_set_cms_asset_status(p_asset_id uuid,p_status text)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_actor uuid := (select auth.uid());
begin
 if v_actor is null or p_status not in ('published','archived') then raise exception 'Invalid request'; end if;
 if p_status='published' and not public.wantiss_has_permission('content.assets','manage') then raise exception 'Not authorized' using errcode='42501'; end if;
 if p_status='archived' and not public.wantiss_has_permission('content.archive','manage') then raise exception 'Not authorized' using errcode='42501'; end if;
 update public.wantiss_cms_assets set status=p_status,updated_by=v_actor,
  published_by=case when p_status='published' then v_actor else published_by end,
  published_at=case when p_status='published' then now() else published_at end,updated_at=now()
 where id=p_asset_id and status<>'archived';
 if not found then raise exception 'Asset not found or already archived'; end if;
end $$;
revoke all on function public.wantiss_admin_set_cms_asset_status(uuid,text) from public,anon;
grant execute on function public.wantiss_admin_set_cms_asset_status(uuid,text) to authenticated;
