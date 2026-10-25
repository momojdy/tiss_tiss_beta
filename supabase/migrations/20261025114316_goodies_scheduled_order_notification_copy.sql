CREATE OR REPLACE FUNCTION public.goodies_order_after_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_member record;
begin
  if new.status = 'placed' then
    update public.goodies_orders
      set acceptance_deadline_at = coalesce(new.acceptance_deadline_at, now() + interval '15 minutes')
      where id = new.id;
    perform public.goodies_order_notify(
      new.customer_id, 'Goodies order placed',
      'Your order ' || new.order_code || ' was sent to the store. The store has 15 minutes to respond.',
      new.id, new.order_code, 'placed', null
    );
    for v_member in select bm.user_id from public.business_members bm where bm.business_id = new.business_id loop
      perform public.goodies_order_notify(v_member.user_id, 'New Goodies order',
        'Order ' || new.order_code || ' needs a response within 15 minutes.',
        new.id, new.order_code, 'placed', null);
    end loop;
  elsif new.status = 'scheduled' then
    perform public.goodies_order_notify(
      new.customer_id, 'Goodies order scheduled',
      'Your order ' || new.order_code || ' is scheduled. The store will be asked to respond when the scheduled time arrives.',
      new.id, new.order_code, 'scheduled', null
    );
  end if;
  return new;
end;
$function$
;
