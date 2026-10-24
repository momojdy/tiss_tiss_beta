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
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into v_items from (select id,business_name,status,review_note,reviewed_by,reviewed_at,created_at from public.business_applications order by created_at desc limit 500) x;
 elsif p_domain='ecosystem' then
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into v_items from (select id,name,verification,is_live,payout_ready,city,country,created_at from public.businesses order by created_at desc limit 500) x;
 elsif p_domain='finance' then
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into v_items from (select id,user_id,amount,status,description,feature_name,activity_type,created_at from public.wallet_transactions order by created_at desc limit 500) x;
 elsif p_domain='people' then
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into v_items from (select id,full_name,email,role,created_at from public.profiles order by created_at desc limit 500) x;
 elsif p_domain='support' then
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into v_items from (select id,user_id,email,subject,message,status,created_at from public.settings_support_requests order by created_at desc limit 500) x;
 else raise exception 'Unknown domain'; end if;
 return jsonb_build_object('items',coalesce(v_items,'[]'::jsonb));
end $$;
revoke all on function public.wantiss_admin_dashboard_snapshot(text) from public,anon;
grant execute on function public.wantiss_admin_dashboard_snapshot(text) to authenticated;

create or replace function public.wantiss_admin_audit_read()
returns setof public.wantiss_admin_audit_log language sql stable security definer set search_path = ''
as $$
 select a.* from public.wantiss_admin_audit_log a
 where public.wantiss_has_permission('audit.read','view')
 order by a.created_at desc limit 500
$$;
revoke all on function public.wantiss_admin_audit_read() from public,anon;
grant execute on function public.wantiss_admin_audit_read() to authenticated;
