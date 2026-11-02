-- Keep Goodies' delivery selection separate from the main Wantiss default address.
alter table public.user_addresses
  add column if not exists is_goodies_default boolean not null default false;

create unique index if not exists user_addresses_one_goodies_default_per_user
  on public.user_addresses(user_id)
  where is_goodies_default;

create or replace function public.set_goodies_default_user_address(p_address_id uuid)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in required' using errcode = '28000';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));

  if not exists (
    select 1 from public.user_addresses
    where id = p_address_id and user_id = auth.uid()
  ) then
    raise exception 'Address not found' using errcode = 'P0002';
  end if;

  update public.user_addresses
  set is_goodies_default = false, updated_at = now()
  where user_id = auth.uid() and is_goodies_default;

  update public.user_addresses
  set is_goodies_default = true, updated_at = now()
  where id = p_address_id and user_id = auth.uid();
end;
$$;

revoke all on function public.set_goodies_default_user_address(uuid) from public, anon;
grant execute on function public.set_goodies_default_user_address(uuid) to authenticated;
