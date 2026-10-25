alter table public.business_applications
  add column if not exists final_rejection boolean not null default false;

create or replace function public.wantiss_admin_review_business_application(
  p_application_id uuid,
  p_status text,
  p_review_note text default null,
  p_final_rejection boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.wantiss_has_permission('operations','edit') then
    raise exception 'Not authorized' using errcode='42501';
  end if;
  if p_status not in ('approved','rejected','pending') then
    raise exception 'Invalid status' using errcode='22023';
  end if;
  if p_final_rejection and p_status <> 'rejected' then
    raise exception 'Final rejection is only valid for rejected applications' using errcode='22023';
  end if;
  update public.business_applications
    set status=p_status, review_note=left(coalesce(p_review_note,''),2000),
        final_rejection=coalesce(p_final_rejection,false),
        reviewed_by=(select auth.uid()), reviewed_at=now(), updated_at=now()
    where id=p_application_id;
  if not found then raise exception 'Application not found' using errcode='P0002'; end if;
  insert into public.wantiss_admin_audit_log(actor_user_id,action,resource_type,resource_id,reason,after_state)
  values ((select auth.uid()),'business_application_reviewed','business_application',p_application_id::text,
    left(coalesce(p_review_note,''),500),
    jsonb_build_object('status',p_status,'final_rejection',coalesce(p_final_rejection,false)));
end $$;
revoke all on function public.wantiss_admin_review_business_application(uuid,text,text,boolean) from public,anon;
grant execute on function public.wantiss_admin_review_business_application(uuid,text,text,boolean) to authenticated;
