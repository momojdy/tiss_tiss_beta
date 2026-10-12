create or replace function public.set_default_user_address(p_address_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text || ':address-default', 0));
  if not exists (select 1 from public.user_addresses where id = p_address_id and user_id = v_user) then
    raise exception 'Address not found';
  end if;
  update public.user_addresses set is_default = false, updated_at = now()
  where user_id = v_user and is_default;
  update public.user_addresses set is_default = true, updated_at = now()
  where id = p_address_id and user_id = v_user;
end;
$$;

create or replace function public.delete_user_address(p_address_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare v_user uuid := auth.uid(); v_was_default boolean; v_next uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text || ':address-default', 0));
  select is_default into v_was_default from public.user_addresses where id = p_address_id and user_id = v_user for update;
  if not found then raise exception 'Address not found'; end if;
  delete from public.user_addresses where id = p_address_id and user_id = v_user;
  if v_was_default then
    select id into v_next from public.user_addresses where user_id = v_user order by created_at asc limit 1;
    if v_next is not null then
      update public.user_addresses set is_default = true, updated_at = now() where id = v_next and user_id = v_user;
    end if;
  end if;
end;
$$;

revoke all on function public.set_default_user_address(uuid) from public, anon;
grant execute on function public.set_default_user_address(uuid) to authenticated;
revoke all on function public.delete_user_address(uuid) from public, anon;
grant execute on function public.delete_user_address(uuid) to authenticated;
