-- Prevent applicants from bypassing a final rejection by creating a second application.
create or replace function public.submit_business_application(p_business_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_name text := trim(coalesce(p_business_name, ''));
  v_application public.business_applications%rowtype;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to apply for business access.';
  end if;
  if length(v_name) < 2 or length(v_name) > 160 then
    raise exception 'Business name must be between 2 and 160 characters.';
  end if;
  if exists (select 1 from public.business_members where user_id = v_user_id) then
    raise exception 'This account already has business access.';
  end if;

  select * into v_application
    from public.business_applications
   where user_id = v_user_id
   order by created_at desc
   limit 1
   for update;

  if found then
    if v_application.status = 'pending' then
      update public.business_applications
         set business_name = v_name, updated_at = now()
       where id = v_application.id
       returning * into v_application;
    elsif v_application.status = 'rejected' then
      if v_application.final_rejection then
        raise exception 'This application was finally rejected. Contact Wantiss support for assistance.'
          using errcode = '42501';
      end if;
      raise exception 'Replace the rejected documents and resubmit the existing application.'
        using errcode = 'P0001';
    end if;
  else
    insert into public.business_applications(user_id, business_name)
    values (v_user_id, v_name)
    returning * into v_application;
  end if;

  return jsonb_build_object(
    'id', v_application.id,
    'status', v_application.status,
    'business_name', v_application.business_name
  );
end
$function$;

revoke all on function public.submit_business_application(text) from public,anon;
grant execute on function public.submit_business_application(text) to authenticated;
