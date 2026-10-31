create or replace function public.goodies_admin_list_courier_candidates()
returns table(courier_id uuid,full_name text,phone_number text,already_added boolean)
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform public.goodies_admin_assert();
 return query select p.id,p.full_name,p.phone_number,coalesce(r.is_approved,false)
 from public.profiles p left join public.goodies_courier_roster r on r.courier_id=p.id
 order by p.full_name nulls last limit 200;
end $$;
