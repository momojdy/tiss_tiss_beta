begin;
create or replace function public.goodies_admin_orders_page(p_offset integer default 0,p_limit integer default 100)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_rows jsonb;
begin
 perform public.goodies_admin_assert();
 select coalesce(jsonb_agg(to_jsonb(page) order by page.created_at desc,page.id desc),'[]'::jsonb) into v_rows from (
  select o.id,o.order_code,o.store_id,s.business_name as store_name,o.status,o.payment_method,o.payment_status,o.total,o.created_at,o.scheduled_for,o.courier_id
  from public.goodies_orders o left join public.goodies_store_schedules s on s.store_id=o.store_id
  order by o.created_at desc,o.id desc offset greatest(coalesce(p_offset,0),0) limit least(greatest(coalesce(p_limit,100),1),200)
 ) page;
 return v_rows;
end $$;
revoke all on function public.goodies_admin_orders_page(integer,integer) from public,anon;
grant execute on function public.goodies_admin_orders_page(integer,integer) to authenticated;

create or replace function public.goodies_admin_courier_candidates_page(p_offset integer default 0,p_limit integer default 100)
returns table(courier_id uuid,full_name text,phone_number text,already_added boolean)
language plpgsql stable security definer set search_path='' as $$
begin
 perform public.goodies_admin_assert();
 return query select p.id,p.full_name,p.phone_number,coalesce(r.is_approved,false)
 from public.profiles p left join public.goodies_courier_roster r on r.courier_id=p.id
 order by p.full_name nulls last,p.id offset greatest(coalesce(p_offset,0),0) limit least(greatest(coalesce(p_limit,100),1),200);
end $$;
revoke all on function public.goodies_admin_courier_candidates_page(integer,integer) from public,anon;
grant execute on function public.goodies_admin_courier_candidates_page(integer,integer) to authenticated;
commit;
