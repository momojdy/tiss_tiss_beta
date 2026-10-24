create or replace function public.wantiss_admin_dashboard_snapshot(p_domain text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;

  if p_domain = 'operations' then
    if not public.wantiss_has_permission('operations', 'view') then raise exception 'Not authorized' using errcode = '42501'; end if;
    return jsonb_build_object('items', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
      select id, user_id, business_name, status, review_note, reviewed_by, reviewed_at, created_at, updated_at
      from public.business_applications order by created_at desc limit 500
    ) x), '[]'::jsonb));
  elsif p_domain = 'ecosystem' then
    if not public.wantiss_has_permission('ecosystem', 'view') then raise exception 'Not authorized' using errcode = '42501'; end if;
    return jsonb_build_object('items', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
      select id, name, verification, payout_ready, is_live, created_at, vendor_id, description, city, country, logo_url
      from public.businesses order by created_at desc limit 500
    ) x), '[]'::jsonb));
  elsif p_domain = 'finance' then
    if not public.wantiss_has_permission('finance', 'view') then raise exception 'Not authorized' using errcode = '42501'; end if;
    return jsonb_build_object('items', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
      select id, created_at, status, description, amount, user_id, activity_type, direction, reference_id, feature_name
      from public.wallet_transactions order by created_at desc limit 500
    ) x), '[]'::jsonb));
  elsif p_domain = 'people' then
    if not public.wantiss_has_permission('people', 'view') then raise exception 'Not authorized' using errcode = '42501'; end if;
    return jsonb_build_object('items', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
      select id, full_name, email, role, created_at, membership_tier, wantiss_number
      from public.profiles order by created_at desc limit 500
    ) x), '[]'::jsonb));
  elsif p_domain = 'support' then
    if not public.wantiss_has_permission('support', 'view') then raise exception 'Not authorized' using errcode = '42501'; end if;
    return jsonb_build_object('items', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
      select id, user_id, email, subject, message, status, created_at
      from public.settings_support_requests order by created_at desc limit 500
    ) x), '[]'::jsonb));
  else
    raise exception 'Unsupported admin data domain';
  end if;
end;
$$;

revoke all on function public.wantiss_admin_dashboard_snapshot(text) from public, anon;
grant execute on function public.wantiss_admin_dashboard_snapshot(text) to authenticated;

create or replace function public.wantiss_admin_review_business_application(
  p_application_id uuid,
  p_status text,
  p_review_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before jsonb;
  v_after jsonb;
begin
  if auth.uid() is null or not public.wantiss_has_permission('operations', 'edit') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if p_status not in ('approved', 'rejected', 'pending') then raise exception 'Invalid application status'; end if;
  if length(trim(coalesce(p_review_note, ''))) > 2000 then raise exception 'Review note is too long'; end if;
  select to_jsonb(a) into v_before from public.business_applications a where a.id = p_application_id for update;
  if v_before is null then raise exception 'Application not found'; end if;
  update public.business_applications
  set status = p_status, review_note = nullif(trim(coalesce(p_review_note, '')), ''),
      reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
  where id = p_application_id
  returning to_jsonb(business_applications.*) into v_after;
  insert into public.wantiss_admin_audit_log(actor_user_id, action, resource_type, resource_id, reason, before_state, after_state)
  values (auth.uid(), 'business_application_reviewed', 'business_application', p_application_id::text, p_review_note, v_before, v_after);
end;
$$;
revoke all on function public.wantiss_admin_review_business_application(uuid, text, text) from public, anon;
grant execute on function public.wantiss_admin_review_business_application(uuid, text, text) to authenticated;
