-- First Goodies DELIVERY is free when the published Goodies CMS offer is enabled.
-- A prior pickup must not consume the customer's first-delivery benefit.
-- Update the existing security-definer checkout functions in place: their privileges,
-- signatures, input validation, quote consumption and payment controls remain unchanged.
do $goodies_first_delivery$
declare
  fn record;
  ddl text;
  old_check text;
  new_check text;
begin
  for fn in
    select p.oid, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('place_goodies_order','goodies_place_multi_order','goodies_group_order_checkout')
  loop
    ddl := pg_get_functiondef(fn.oid);
    case fn.proname
      when 'place_goodies_order' then
        old_check := 'where o.customer_id=v_uid) into v_first_order;';
        new_check := 'where o.customer_id=v_uid and o.order_type=''delivery'') into v_first_order;';
      when 'goodies_place_multi_order' then
        old_check := 'where o.customer_id = v_uid) into v_first;';
        new_check := 'where o.customer_id = v_uid and o.order_type=''delivery'') into v_first;';
      when 'goodies_group_order_checkout' then
        old_check := 'where o.customer_id=v_uid)' || chr(10) || '    into v_first_order;';
        new_check := 'where o.customer_id=v_uid and o.order_type=''delivery'')' || chr(10) || '    into v_first_order;';
    end case;
    if position(old_check in ddl) = 0 then
      if position(new_check in ddl) = 0 then
        raise exception 'Could not locate the first-delivery check in %', fn.proname;
      end if;
    else
      if (length(ddl) - length(replace(ddl, old_check, ''))) / length(old_check) <> 1 then
        raise exception 'Ambiguous first-delivery check in %', fn.proname;
      end if;
      execute replace(ddl, old_check, new_check);
    end if;
  end loop;
end
$goodies_first_delivery$;