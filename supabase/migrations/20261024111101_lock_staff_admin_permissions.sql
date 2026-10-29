create or replace function public.wantiss_admin_grant_permission(
 p_staff_user_id uuid,p_permission_key text,p_access_level text,p_reason text,p_expires_at timestamptz default null
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_id uuid;
begin
 if (select auth.uid()) is null or not exists (
  select 1 from public.wantiss_admin_staff a where a.user_id=(select auth.uid()) and a.status='active' and a.role='super_admin'
 ) then raise exception 'Not authorized' using errcode='42501'; end if;
 if p_access_level not in ('view','edit','manage') then raise exception 'Invalid access level'; end if;
 if p_permission_key !~ '^[a-z][a-z0-9_.-]{1,79}$' then raise exception 'Invalid permission key'; end if;
 if p_permission_key in ('staff.manage','staff.invite','staff.revoke','staff.permissions','super_admin','finance.wallet.adjust','finance.refund','accounts.restrict') then
  raise exception 'This permission is reserved for narrowly scoped administrative operations' using errcode='42501';
 end if;
 if length(trim(coalesce(p_reason,'')))<3 then raise exception 'A reason is required'; end if;
 if p_expires_at is not null and p_expires_at<=now() then raise exception 'Expiry must be in the future'; end if;
 if not exists(select 1 from public.wantiss_admin_staff where user_id=p_staff_user_id and status='active' and role='staff') then raise exception 'Target must be an active staff account'; end if;
 insert into public.wantiss_admin_permission_grants(staff_user_id,permission_key,access_level,reason,expires_at,granted_by)
 values(p_staff_user_id,p_permission_key,p_access_level,trim(p_reason),p_expires_at,(select auth.uid())) returning id into v_id;
 return v_id;
end $$;
revoke all on function public.wantiss_admin_grant_permission(uuid,text,text,text,timestamptz) from public,anon;
grant execute on function public.wantiss_admin_grant_permission(uuid,text,text,text,timestamptz) to authenticated;
