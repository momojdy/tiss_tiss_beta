create or replace function public.wantiss_admin_apply_account_restriction(
 p_user_id uuid,p_kind text,p_scope text,p_reason text,p_notes text,p_starts_at timestamptz,p_ends_at timestamptz,p_notify_user boolean default false
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_id uuid; v_actor uuid := (select auth.uid());
begin
 if v_actor is null or not public.wantiss_has_permission('accounts.restrict','manage') then raise exception 'Not authorized' using errcode='42501'; end if;
 if p_kind not in ('Suspension','Ban') or length(trim(coalesce(p_scope,''))) not between 1 and 160 or length(trim(coalesce(p_reason,''))) not between 1 and 500 then raise exception 'Invalid restriction'; end if;
 if p_starts_at is null or (p_ends_at is not null and p_ends_at < p_starts_at) then raise exception 'Invalid restriction dates'; end if;
 if p_user_id=v_actor then raise exception 'You cannot restrict your own account'; end if;
 if not exists(select 1 from auth.users where id=p_user_id) then raise exception 'Account not found'; end if;
 if p_kind='Ban' and not exists(select 1 from public.wantiss_admin_staff where user_id=v_actor and role='super_admin' and status='active') then
  raise exception 'Only a Super Admin may ban accounts' using errcode='42501';
 end if;
 if exists(select 1 from public.wantiss_admin_account_restrictions r where r.target_user_id=p_user_id and r.status='active'
  and (r.ends_at is null or r.ends_at>now()) and (r.kind='Ban' and (r.scope='all' or r.scope=p_scope) or p_kind='Ban' and (r.scope='all' or r.scope=p_scope))) then
  raise exception 'An active restriction already covers this scope';
 end if;
 if p_kind='Ban' then
  update public.wantiss_admin_account_restrictions set status='lifted',lifted_by=v_actor,lifted_at=now(),lift_reason='Superseded by a ban'
  where target_user_id=p_user_id and status='active' and kind='Suspension' and (scope=p_scope or p_scope='all');
 end if;
 insert into public.wantiss_admin_account_restrictions(target_user_id,kind,scope,reason,notes,starts_at,ends_at,created_by,notify_user)
 values(p_user_id,p_kind,p_scope,trim(p_reason),left(coalesce(p_notes,''),4000),p_starts_at,p_ends_at,v_actor,coalesce(p_notify_user,false))
 returning id into v_id;
 insert into public.wantiss_admin_audit_log(actor_user_id,action,resource_type,resource_id,reason,after_state)
 values(v_actor,'account_restriction_applied','account_restriction',v_id::text,trim(p_reason),jsonb_build_object('target_user_id',p_user_id,'kind',p_kind,'scope',p_scope,'starts_at',p_starts_at,'ends_at',p_ends_at,'notify_user',p_notify_user));
 return v_id;
end $$;
revoke all on function public.wantiss_admin_apply_account_restriction(uuid,text,text,text,text,timestamptz,timestamptz,boolean) from public,anon;
grant execute on function public.wantiss_admin_apply_account_restriction(uuid,text,text,text,text,timestamptz,timestamptz,boolean) to authenticated;
