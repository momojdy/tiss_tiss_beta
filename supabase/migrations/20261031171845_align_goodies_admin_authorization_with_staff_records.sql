create or replace function public.goodies_admin_assert()
returns void
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $function$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not exists (
    select 1
      from public.wantiss_admin_staff s
      join auth.users u on u.id = s.user_id
     where s.user_id = v_uid
       and s.status = 'active'
       and s.role = 'super_admin'
       and (s.invitation_expires_at is null or s.invitation_expires_at > now())
       and u.email_confirmed_at is not null
       and (
         s.invited_at is null
         or coalesce(auth.jwt()->'user_metadata'->>'wantiss_invite_accepted', 'false') = 'true'
       )
  ) then
    raise exception 'Goodies administrator access required' using errcode = '42501';
  end if;
end
$function$;

revoke all on function public.goodies_admin_assert() from public, anon, authenticated;