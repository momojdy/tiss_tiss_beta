create or replace function public.wantiss_admin_update_account_restriction(p_restriction_id uuid,p_ends_at timestamptz,p_reason text)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_actor uuid := (select auth.uid()); v_before jsonb;
begin
 if v_actor is null or not public.wantiss_has_permission('accounts.restrict','manage') then raise exception 'Not authorized' using errcode='42501'; end if;
 if length(trim(coalesce(p_reason,'')))<3 then raise exception 'A reason is required'; end if;
 select to_jsonb(r) into v_before from public.wantiss_admin_account_restrictions r where r.id=p_restriction_id and r.kind='Suspension' and r.status='active';
 if v_before is null then raise exception 'Active suspension not found'; end if;
 if p_ends_at is not null and p_ends_at < (v_before->>'starts_at')::timestamptz then raise exception 'End date cannot be before the start date'; end if;
 update public.wantiss_admin_account_restrictions set ends_at=p_ends_at where id=p_restriction_id;
 insert into public.wantiss_admin_audit_log(actor_user_id,action,resource_type,resource_id,reason,before_state,after_state)
 values(v_actor,'account_restriction_updated','account_restriction',p_restriction_id::text,trim(p_reason),v_before,jsonb_build_object('ends_at',p_ends_at));
end $$;
revoke all on function public.wantiss_admin_update_account_restriction(uuid,timestamptz,text) from public,anon;
grant execute on function public.wantiss_admin_update_account_restriction(uuid,timestamptz,text) to authenticated;
