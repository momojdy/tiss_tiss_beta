-- Shared identity, separately registered modes. This RPC can only add a mode
-- for the currently authenticated user and never changes their existing mode grants.
create or replace function public.register_my_account_mode(p_mode text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_mode text := lower(trim(coalesce(p_mode, '')));
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;
  if v_mode not in ('buyer', 'business') then
    raise exception 'Invalid account mode';
  end if;

  insert into public.account_modes (user_id, mode)
  values (v_user_id, v_mode)
  on conflict (user_id, mode) do nothing;

  return jsonb_build_object(
    'buyer', exists (
      select 1 from public.account_modes am
      where am.user_id = v_user_id and am.mode = 'buyer'
    ),
    'business', exists (
      select 1 from public.account_modes am
      where am.user_id = v_user_id and am.mode = 'business'
    )
  );
end;
$$;

revoke all on function public.register_my_account_mode(text) from public, anon;
grant execute on function public.register_my_account_mode(text) to authenticated;
