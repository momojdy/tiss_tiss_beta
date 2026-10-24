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
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into v_items from (
   select wt.id::text as id,wt.user_id,wt.amount,
    case when coalesce(rq.pending_amount,0)>0 then 'Refund pending'
      when lower(wt.status)='completed' then 'Completed' when lower(wt.status)='pending' then 'Pending'
      when lower(wt.status)='failed' then 'Failed' when lower(wt.status)='refunded' then 'Refunded' else wt.status end as status,
    wt.description,wt.feature_name,wt.activity_type,wt.created_at,coalesce(rq.refunded_amount,0) as ref,coalesce(rq.pending_amount,0) as rq
   from public.wallet_transactions wt
   left join lateral (
    select coalesce(sum(amount) filter(where status='approved'),0) as refunded_amount,
     coalesce(sum(amount) filter(where status='pending'),0) as pending_amount
    from public.wantiss_admin_refund_requests rr where rr.transaction_id=wt.id
   ) rq on true
   union all
   select ('ADJ-'||fa.id::text) as id,fa.target_user_id as user_id,fa.amount,'Pending'::text as status,
    fa.reason as description,('Adjustment · '||fa.adjustment_type) as feature_name,'Adjustment'::text as activity_type,fa.created_at,0::numeric as ref,0::numeric as rq
   from public.wantiss_admin_financial_adjustments fa where fa.status='pending'
   order by created_at desc limit 1000
  ) x;
 elsif p_domain='people' then
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into v_items from (select id,full_name,email,role,created_at from public.profiles order by created_at desc limit 500) x;
 elsif p_domain='support' then
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into v_items from (select id,user_id,email,subject,message,status,created_at from public.settings_support_requests order by created_at desc limit 500) x;
 else raise exception 'Unknown domain'; end if;
 return jsonb_build_object('items',coalesce(v_items,'[]'::jsonb));
end $$;
revoke all on function public.wantiss_admin_dashboard_snapshot(text) from public,anon;
grant execute on function public.wantiss_admin_dashboard_snapshot(text) to authenticated;
