-- Goodies/admin authorization must use the database-recorded invitation acceptance.
-- wantiss_admin_accept_invitation() securely changes invitation_expires_at to NULL.
-- The Auth user_metadata field is client-editable and must never grant staff access.
-- This does not change any staff row, permission grant, or existing accepted invitation.

create or replace function public.goodies_admin_assert()
returns void
language plpgsql security definer
set search_path to 'public', 'auth', 'pg_temp'
as $body$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null or not exists (
    select 1 from public.wantiss_admin_staff s
      join auth.users u on u.id = s.user_id
     where s.user_id = v_uid
       and s.status = 'active'
       and s.role = 'super_admin'
       and (s.invitation_expires_at is null or s.invitation_expires_at > now())
       and (s.invited_at is null or s.invitation_expires_at is null)
       and u.email_confirmed_at is not null
  ) then
    raise exception 'Goodies administrator access required' using errcode = '42501';
  end if;
end;
$body$;

-- The Goodies admin and staff RBAC both depend on this shared permission gate.
-- Keep all original role, grant level, revocation, and expiry checks intact.
create or replace function public.wantiss_has_permission(p_permission text, p_min_level text default 'view')
returns boolean
language sql stable security definer
set search_path to ''
as $body$
  select exists (
    select 1 from public.wantiss_admin_staff s
    join auth.users u on u.id=s.user_id
    where s.user_id=(select auth.uid()) and s.status='active'
      and u.email_confirmed_at is not null
      and (s.invitation_expires_at is null or s.invitation_expires_at>now())
      and (s.invited_at is null or s.invitation_expires_at is null)
      and (s.role='super_admin' or exists (
        select 1 from public.wantiss_admin_permission_grants g
        where g.staff_user_id=s.user_id and g.permission_key=p_permission
          and g.revoked_at is null and (g.expires_at is null or g.expires_at>now())
          and case p_min_level when 'view' then g.access_level in ('view','edit','manage')
            when 'edit' then g.access_level in ('edit','manage') when 'manage' then g.access_level='manage' else false end
      ))
  );
$body$;
