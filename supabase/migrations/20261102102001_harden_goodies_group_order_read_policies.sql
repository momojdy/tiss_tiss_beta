create or replace function private.goodies_group_is_member(p_group_id uuid)
returns boolean language sql stable security definer
set search_path=pg_catalog,public,pg_temp as $$
 select exists(select 1 from public.goodies_group_order_members m where m.group_id=p_group_id and m.user_id=auth.uid());
$$;
revoke all on function private.goodies_group_is_member(uuid) from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.goodies_group_is_member(uuid) to authenticated;
drop policy if exists "group members can read their group" on public.goodies_group_orders;
create policy "group members can read their group" on public.goodies_group_orders for select to authenticated using (private.goodies_group_is_member(id));
drop policy if exists "group members can read membership" on public.goodies_group_order_members;
create policy "group members can read membership" on public.goodies_group_order_members for select to authenticated using (private.goodies_group_is_member(group_id));
drop policy if exists "group members can read contributed items" on public.goodies_group_order_items;
create policy "group members can read contributed items" on public.goodies_group_order_items for select to authenticated using (private.goodies_group_is_member(group_id));
