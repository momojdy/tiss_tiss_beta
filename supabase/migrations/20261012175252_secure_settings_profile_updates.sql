create or replace function public.update_my_personal_information(
  p_full_name text,
  p_phone_number text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_email text;
  v_name text := nullif(pg_catalog.btrim(p_full_name), '');
  v_phone text := p_phone_number;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if v_name is not null and pg_catalog.length(v_name) > 160 then raise exception 'Name is too long'; end if;
  if v_phone is not null and v_phone <> '' and v_phone !~ '^\+?[0-9]{7,16}$' then
    raise exception 'Phone number must be in international format';
  end if;
  select email into v_email from auth.users where id = v_user;
  update public.profiles
  set full_name = coalesce(v_name, full_name),
      phone_number = coalesce(v_phone, phone_number),
      email = coalesce(v_email, email)
  where id = v_user;
  if not found then
    insert into public.profiles(id, full_name, email, phone_number)
    values (v_user, coalesce(v_name, ''), coalesce(v_email, ''), coalesce(v_phone, ''));
  end if;
  return jsonb_build_object('success', true);
end;
$$;
revoke all on function public.update_my_personal_information(text,text) from public, anon;
grant execute on function public.update_my_personal_information(text,text) to authenticated;
