-- Couriers cannot SELECT goodies_orders through customer/vendor RLS. Expose only
-- the fields needed for their current assignment, without broadening table RLS.
begin;
create or replace function public.goodies_courier_orders()
returns table (
  id uuid, order_id uuid, status text, order_code text, address jsonb,
  contact_phone text, items jsonb, total numeric, payment_method text,
  payment_status text, business_id uuid
)
language plpgsql stable security definer
set search_path = ''
as $function$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'Sign in required' using errcode = '28000';
  end if;
  if not exists (
    select 1 from public.goodies_courier_roster r
    where r.courier_id = v_uid and r.is_approved
  ) then
    raise exception 'Courier access is not active' using errcode = '42501';
  end if;
  return query
    select a.id, o.id, a.status, o.order_code, o.address, o.contact_phone,
      o.items, o.total, o.payment_method, o.payment_status, o.business_id
    from public.goodies_delivery_assignments a
    join public.goodies_orders o on o.id = a.order_id
      and o.business_id = a.business_id and o.courier_id = v_uid
    where a.courier_id = v_uid
      and a.status in ('offered', 'accepted', 'picked_up')
      and o.status in ('courier_assigned', 'picked_up')
      and (a.status <> 'offered' or a.expires_at is null or a.expires_at > now())
    order by a.offered_at desc, a.id
    limit 30;
end;
$function$;
revoke all on function public.goodies_courier_orders() from public, anon;
grant execute on function public.goodies_courier_orders() to authenticated;
commit;
