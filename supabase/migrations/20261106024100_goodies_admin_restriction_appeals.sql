-- Shared restrictions underpin Goodies customer and merchant access. Persist
-- appeal decisions and apply the same Super Admin boundary when lifting a ban.
begin;
alter table public.wantiss_admin_account_restrictions
  add column if not exists appeal_status text not null default 'none'
    check (appeal_status in ('none','open','upheld')),
  add column if not exists appeal_reason text,
  add column if not exists appeal_received_at timestamptz,
  add column if not exists appeal_reviewed_at timestamptz;

create or replace function public.wantiss_admin_record_restriction_appeal(p_restriction_id uuid,p_action text,p_reason text)
returns void language plpgsql security definer set search_path='' as $appeal$
declare v_actor uuid:=(select auth.uid()); v_row public.wantiss_admin_account_restrictions%rowtype; v_before jsonb;
begin
  if v_actor is null or not public.wantiss_has_permission('accounts.restrict','manage')
     or not exists(select 1 from public.wantiss_admin_staff s where s.user_id=v_actor and s.role='super_admin' and s.status='active') then
    raise exception 'Super Admin account-restriction permission required' using errcode='42501';
  end if;
  if p_action is null or p_action not in ('receive','uphold') or length(trim(coalesce(p_reason,''))) not between 3 and 4000 then
    raise exception 'Enter a valid appeal action and reason' using errcode='22023';
  end if;
  select * into v_row from public.wantiss_admin_account_restrictions r where r.id=p_restriction_id for update;
  if not found or v_row.status<>'active' or v_row.kind<>'Ban' then raise exception 'Active ban not found' using errcode='P0002'; end if;
  if (p_action='receive' and v_row.appeal_status='open') or (p_action='uphold' and v_row.appeal_status='upheld') then return; end if;
  if p_action='uphold' and v_row.appeal_status<>'open' then raise exception 'No open appeal to review' using errcode='22023'; end if;
  v_before:=jsonb_build_object('appeal_status',v_row.appeal_status);
  update public.wantiss_admin_account_restrictions r set
    appeal_status=case when p_action='receive' then 'open' else 'upheld' end,
    appeal_reason=trim(p_reason),
    appeal_received_at=case when p_action='receive' then now() else r.appeal_received_at end,
    appeal_reviewed_at=case when p_action='uphold' then now() else null end
    where r.id=p_restriction_id;
  insert into public.wantiss_admin_audit_log(actor_user_id,action,resource_type,resource_id,reason,before_state,after_state)
    values(v_actor,case when p_action='receive' then 'account_ban_appeal_received' else 'account_ban_appeal_upheld' end,
      'account_restriction',p_restriction_id::text,trim(p_reason),v_before,
      jsonb_build_object('appeal_status',case when p_action='receive' then 'open' else 'upheld' end,'scope',v_row.scope));
end $appeal$;
revoke all on function public.wantiss_admin_record_restriction_appeal(uuid,text,text) from public,anon;
grant execute on function public.wantiss_admin_record_restriction_appeal(uuid,text,text) to authenticated;

create or replace function public.wantiss_admin_lift_account_restriction(p_restriction_id uuid,p_reason text)
returns void language plpgsql security definer set search_path='' as $lift$
declare v_actor uuid:=(select auth.uid()); v_row public.wantiss_admin_account_restrictions%rowtype;
begin
  if v_actor is null or not public.wantiss_has_permission('accounts.restrict','manage') then raise exception 'Not authorized' using errcode='42501'; end if;
  if length(trim(coalesce(p_reason,'')))<3 then raise exception 'A reason is required' using errcode='22023'; end if;
  select * into v_row from public.wantiss_admin_account_restrictions r where r.id=p_restriction_id and r.status='active' for update;
  if not found then raise exception 'Active restriction not found' using errcode='P0002'; end if;
  if v_row.kind='Ban' and not exists(select 1 from public.wantiss_admin_staff s where s.user_id=v_actor and s.role='super_admin' and s.status='active') then
    raise exception 'Only a Super Admin may lift a ban' using errcode='42501';
  end if;
  update public.wantiss_admin_account_restrictions set status='lifted',lifted_by=v_actor,lifted_at=now(),lift_reason=left(trim(p_reason),500) where id=p_restriction_id;
  insert into public.wantiss_admin_audit_log(actor_user_id,action,resource_type,resource_id,reason)
    values(v_actor,'account_restriction_lifted','account_restriction',p_restriction_id::text,trim(p_reason));
end $lift$;
revoke all on function public.wantiss_admin_lift_account_restriction(uuid,text) from public,anon;
grant execute on function public.wantiss_admin_lift_account_restriction(uuid,text) to authenticated;
commit;
