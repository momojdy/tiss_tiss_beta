alter table public.goodies_delivery_quotes
 add column if not exists origin_latitude double precision,
 add column if not exists origin_longitude double precision,
 add column if not exists destination_latitude double precision,
 add column if not exists destination_longitude double precision;
alter table public.goodies_orders
 add column if not exists store_latitude double precision,
 add column if not exists store_longitude double precision,
 add column if not exists delivery_latitude double precision,
 add column if not exists delivery_longitude double precision;
create or replace function public.goodies_orders_capture_delivery_coordinates()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare v_quote public.goodies_delivery_quotes%rowtype;
begin
 if new.order_type='delivery' and new.address ? 'delivery_quote_id' then
  begin
   select * into v_quote from public.goodies_delivery_quotes where id=(new.address->>'delivery_quote_id')::uuid and customer_id=new.customer_id and store_id=new.store_id;
  exception when invalid_text_representation then raise exception 'Invalid delivery location quote' using errcode='22023'; end;
  if found then
   new.store_latitude:=v_quote.origin_latitude; new.store_longitude:=v_quote.origin_longitude;
   new.delivery_latitude:=v_quote.destination_latitude; new.delivery_longitude:=v_quote.destination_longitude;
  end if;
 end if;
 return new;
end $$;
drop trigger if exists goodies_orders_capture_delivery_coordinates on public.goodies_orders;
create trigger goodies_orders_capture_delivery_coordinates before insert on public.goodies_orders for each row execute function public.goodies_orders_capture_delivery_coordinates();
