alter table public.goodies_delivery_quotes add column if not exists route_geometry jsonb;
alter table public.goodies_orders add column if not exists delivery_route jsonb;
create or replace function public.goodies_orders_capture_delivery_coordinates()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare v_quote public.goodies_delivery_quotes%rowtype;
begin
 if new.order_type='delivery' and new.address is not null then
  select * into v_quote from public.goodies_delivery_quotes q
   where q.customer_id=new.customer_id and q.store_id=new.store_id and q.address_payload=new.address
     and q.created_at>now()-interval '6 minutes'
   order by q.created_at desc limit 1;
  if found then
   new.store_latitude:=v_quote.origin_latitude;new.store_longitude:=v_quote.origin_longitude;
   new.delivery_latitude:=v_quote.destination_latitude;new.delivery_longitude:=v_quote.destination_longitude;
   new.delivery_route:=v_quote.route_geometry;
  end if;
 end if;
 return new;
end $$;
