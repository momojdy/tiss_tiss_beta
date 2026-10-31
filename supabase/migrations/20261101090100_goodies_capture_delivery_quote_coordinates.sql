-- Resolve the exact checkout quote even though checkout stores its ID alongside address fields.
create or replace function public.goodies_orders_capture_delivery_coordinates()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare v_quote public.goodies_delivery_quotes%rowtype; v_quote_id uuid;
begin
 if new.order_type='delivery' and new.address is not null then
  if nullif(new.address->>'delivery_quote_id','') is not null then
   begin v_quote_id:=(new.address->>'delivery_quote_id')::uuid;
   exception when invalid_text_representation then raise exception 'Invalid delivery location quote' using errcode='22023'; end;
   select * into v_quote from public.goodies_delivery_quotes q where q.id=v_quote_id and q.customer_id=new.customer_id and q.store_id=new.store_id;
  else
   select * into v_quote from public.goodies_delivery_quotes q where q.customer_id=new.customer_id and q.store_id=new.store_id
    and q.address_payload=(new.address-'delivery_quote_id') and q.created_at>now()-interval '6 minutes' order by q.created_at desc limit 1;
  end if;
  if found then
   new.store_latitude:=v_quote.origin_latitude; new.store_longitude:=v_quote.origin_longitude;
   new.delivery_latitude:=v_quote.destination_latitude; new.delivery_longitude:=v_quote.destination_longitude;
  end if;
 end if;
 return new;
end $$;
