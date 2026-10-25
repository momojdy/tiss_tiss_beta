create or replace function public.wantiss_admin_set_business_verification(
  p_business uuid,
  p_status text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.wantiss_has_permission('ecosystem','edit') then
    raise exception 'Not authorized' using errcode='42501';
  end if;
  if p_status not in ('verified','pending','restricted') then
    raise exception 'Invalid status' using errcode='22023';
  end if;
  if length(trim(coalesce(p_reason,''))) < 3 then
    raise exception 'A reason of at least 3 characters is required' using errcode='22023';
  end if;
  update public.businesses set verification=p_status where id=p_business;
  if not found then raise exception 'Business not found' using errcode='P0002'; end if;
  if p_status <> 'verified' then
    update public.goodies_store_schedules set is_live=false,updated_at=now() where business_id=p_business;
  end if;
  insert into public.wantiss_admin_audit_log(actor_user_id,action,resource_type,resource_id,reason,after_state)
  values((select auth.uid()),'business_verification_set','business',p_business::text,left(trim(p_reason),500),jsonb_build_object('verification',p_status));
end $$;
revoke all on function public.wantiss_admin_set_business_verification(uuid,text,text) from public,anon;
grant execute on function public.wantiss_admin_set_business_verification(uuid,text,text) to authenticated;
