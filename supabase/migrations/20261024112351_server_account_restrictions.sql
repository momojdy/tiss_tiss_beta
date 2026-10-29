create table if not exists public.wantiss_admin_account_restrictions (
 id uuid primary key default gen_random_uuid(),
 target_user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check (kind in ('Suspension','Ban')),
 scope text not null check (length(trim(scope)) between 1 and 160),
 reason text not null check (length(trim(reason)) between 1 and 500),
 notes text not null default '',
 starts_at timestamptz not null,
 ends_at timestamptz,
 status text not null default 'active' check (status in ('active','lifted')),
 created_by uuid not null references auth.users(id),
 lifted_by uuid references auth.users(id),
 lifted_at timestamptz,
 lift_reason text,
 notify_user boolean not null default false,
 created_at timestamptz not null default now(),
 check (ends_at is null or ends_at >= starts_at),
 check ((status='active' and lifted_at is null and lifted_by is null) or (status='lifted' and lifted_at is not null and lifted_by is not null))
);
create index if not exists wantiss_admin_restrictions_target_idx on public.wantiss_admin_account_restrictions(target_user_id,status,starts_at desc);
alter table public.wantiss_admin_account_restrictions enable row level security;
revoke all on public.wantiss_admin_account_restrictions from anon,authenticated;
grant select on public.wantiss_admin_account_restrictions to authenticated;
drop policy if exists wantiss_admin_restrictions_select on public.wantiss_admin_account_restrictions;
create policy wantiss_admin_restrictions_select on public.wantiss_admin_account_restrictions for select to authenticated
using (public.wantiss_has_permission('accounts.restrict','view'));

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
 if p_kind='Ban' then
  update public.wantiss_admin_account_restrictions set status='lifted',lifted_by=v_actor,lifted_at=now(),lift_reason='Superseded by a ban'
  where target_user_id=p_user_id and status='active' and kind='Suspension' and (scope=p_scope or p_scope='all');
 else
  if exists(select 1 from public.wantiss_admin_account_restrictions r where r.target_user_id=p_user_id and r.status='active' and r.ends_at is not null and r.ends_at<=now()) then
   update public.wantiss_admin_account_restrictions set status='lifted',lifted_by=v_actor,lifted_at=now(),lift_reason='Expired automatically'
   where target_user_id=p_user_id and status='active' and ends_at<=now();
  end if;
  if exists(select 1 from public.wantiss_admin_account_restrictions r where r.target_user_id=p_user_id and r.status='active' and (r.ends_at is null or r.ends_at>now()) and ((r.kind='Ban' and r.scope='all') or (r.kind='Suspension' and (r.scope='all' or r.scope=p_scope)))) then
   raise exception 'An active restriction already covers this scope';
  end if;
 end if;
 insert into public.wantiss_admin_account_restrictions(target_user_id,kind,scope,reason,notes,starts_at,ends_at,created_by,notify_user)
 values(p_user_id,p_kind,p_scope,trim(p_reason),left(coalesce(p_notes,''),4000),p_starts_at,p_ends_at,v_actor,coalesce(p_notify_user,false))
 returning id into v_id;
 insert into public.wantiss_admin_audit_log(actor_user_id,action,resource_type,resource_id,reason,after_state)
 values(v_actor,'account_restriction_applied','account_restriction',v_id::text,trim(p_reason),jsonb_build_object('target_user_id',p_user_id,'kind',p_kind,'scope',p_scope,'starts_at',p_starts_at,'ends_at',p_ends_at,'notify_user',p_notify_user));
 return v_id;
end $$;

create or replace function public.wantiss_admin_lift_account_restriction(p_restriction_id uuid,p_reason text)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_actor uuid := (select auth.uid());
begin
 if v_actor is null or not public.wantiss_has_permission('accounts.restrict','manage') then raise exception 'Not authorized' using errcode='42501'; end if;
 if length(trim(coalesce(p_reason,'')))<3 then raise exception 'A reason is required'; end if;
 update public.wantiss_admin_account_restrictions set status='lifted',lifted_by=v_actor,lifted_at=now(),lift_reason=left(trim(p_reason),500)
 where id=p_restriction_id and status='active';
 if not found then raise exception 'Active restriction not found'; end if;
 insert into public.wantiss_admin_audit_log(actor_user_id,action,resource_type,resource_id,reason)
 values(v_actor,'account_restriction_lifted','account_restriction',p_restriction_id::text,trim(p_reason));
end $$;

revoke all on function public.wantiss_admin_apply_account_restriction(uuid,text,text,text,text,timestamptz,timestamptz,boolean) from public,anon;
revoke all on function public.wantiss_admin_lift_account_restriction(uuid,text) from public,anon;
grant execute on function public.wantiss_admin_apply_account_restriction(uuid,text,text,text,text,timestamptz,timestamptz,boolean) to authenticated;
grant execute on function public.wantiss_admin_lift_account_restriction(uuid,text) to authenticated;
