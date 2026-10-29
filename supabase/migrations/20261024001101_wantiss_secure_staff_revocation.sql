create or replace function public.wantiss_admin_set_staff_status_secure(p_user_id uuid,p_status text,p_reason text)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_actor uuid := (select auth.uid()); v_before jsonb; v_staff public.wantiss_admin_staff%rowtype; v_grant record;
begin
  if v_actor is null or not exists (
    select 1 from public.wantiss_admin_staff a
    where a.user_id=v_actor and a.status='active' and a.role='super_admin'
  ) then raise exception 'Not authorized' using errcode='42501'; end if;
  if p_status not in ('active','suspended','revoked') then raise exception 'Invalid staff status'; end if;
  if length(trim(coalesce(p_reason,'')))<3 then raise exception 'A reason is required'; end if;
  select * into v_staff from public.wantiss_admin_staff where user_id=p_user_id for update;
  if not found then raise exception 'Staff record not found'; end if;
  if v_staff.role='super_admin' and p_status<>'active' and
    (select count(*) from public.wantiss_admin_staff where role='super_admin' and status='active')<=1
    then raise exception 'Cannot deactivate the last active Super Admin'; end if;
  v_before:=jsonb_build_object('status',v_staff.status,'role',v_staff.role);
  update public.wantiss_admin_staff set status=p_status,updated_at=now() where user_id=p_user_id;
  if p_status='revoked' then
    for v_grant in
      update public.wantiss_admin_permission_grants
      set revoked_at=now(),revoked_by=v_actor
      where staff_user_id=p_user_id and revoked_at is null
      returning id,permission_key,access_level,expires_at
    loop
      insert into public.wantiss_admin_audit_log(actor_user_id,action,resource_type,resource_id,reason,before_state,after_state)
      values(v_actor,'permission_revoked_with_staff','permission_grant',v_grant.id::text,left(trim(p_reason),500),
        jsonb_build_object('permission_key',v_grant.permission_key,'access_level',v_grant.access_level,'expires_at',v_grant.expires_at),
        jsonb_build_object('revoked_at',now()));
    end loop;
  end if;
  insert into public.wantiss_admin_audit_log(actor_user_id,action,resource_type,resource_id,reason,before_state,after_state)
  values(v_actor,'staff_status_changed','staff',p_user_id::text,left(trim(p_reason),500),v_before,
    jsonb_build_object('status',p_status,'role',v_staff.role));
end;
$$;
revoke all on function public.wantiss_admin_set_staff_status_secure(uuid,text,text) from public, anon;
grant execute on function public.wantiss_admin_set_staff_status_secure(uuid,text,text) to authenticated;