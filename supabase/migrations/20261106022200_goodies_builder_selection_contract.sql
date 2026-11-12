-- Reject unknown group selections instead of silently ignoring them, and require
-- an explicit line price so malformed saved carts cannot bypass price validation.
do $migration$
declare v_definition text; v_old text; v_new text;
begin
  v_definition:=pg_get_functiondef('public.validate_goodies_builder_line(uuid,text,jsonb)'::regprocedure);
  v_old:=$old$v_sel:=coalesce(v_byo->'sel','{}'::jsonb);$old$;
  v_new:=v_old || $new$
  if jsonb_typeof(v_sel)<>'object' then raise exception 'Invalid custom builder choices' using errcode='22023'; end if;
  if exists(select 1 from jsonb_object_keys(v_sel) as selected(group_id)
    where not exists(select 1 from jsonb_array_elements(coalesce(v_builder->'groups','[]'::jsonb)) as configured(value)
      where configured.value->>'id'=selected.group_id)) then
    raise exception 'Unknown custom builder group' using errcode='22023';
  end if;$new$;
  if position(v_old in v_definition)=0 or position('if abs(v_price-v_line_price)>0.01 then' in v_definition)=0 then
    raise exception 'Expected builder validator was not found; inspect schema drift before migrating';
  end if;
  v_definition:=replace(v_definition,v_old,v_new);
  v_definition:=replace(v_definition,'if abs(v_price-v_line_price)>0.01 then','if v_price is null or abs(v_price-v_line_price)>0.01 then');
  execute v_definition;
end;
$migration$;

-- New clients send the reviewed cart/total as consent, never as pricing authority.
-- Keep the existing RPC signature and legacy calls compatible. The server still
-- recomputes every amount and locks the group before comparing the review.
do $group_consent$
declare v_definition text; v_marker text;
begin
 v_definition:=pg_get_functiondef('public.goodies_group_order_checkout(text,uuid,text,timestamp with time zone,jsonb,text,numeric,text)'::regprocedure);
 if position('_goodies_expected_total' in v_definition)>0 then return; end if;
 if position('v_first_order boolean := false;' in v_definition)=0
    or position('v_preview:=public.goodies_group_order_checkout_preview(p_group_id);' in v_definition)=0
    or position('v_address:=coalesce(p_address,''{}''::jsonb);' in v_definition)=0
    or position('v_total:=v_subtotal+v_delivery_fee+v_service_fee-v_discount+coalesce(p_tip,0);' in v_definition)=0 then
  raise exception 'Group checkout contract drifted; review the deployed definition before migration';
 end if;
 v_definition:=replace(v_definition,'v_first_order boolean := false;',
   'v_first_order boolean := false; v_has_expected boolean := false; v_expected_total numeric;');
 v_marker:='v_preview:=public.goodies_group_order_checkout_preview(p_group_id);';
 v_definition:=replace(v_definition,v_marker,v_marker||$guard$
  v_has_expected:=coalesce(p_address ? '_goodies_expected_total',false) or coalesce(p_address ? '_goodies_expected_items',false);
  if v_has_expected then
   if jsonb_typeof(p_address->'_goodies_expected_total') is distinct from 'number'
      or jsonb_typeof(p_address->'_goodies_expected_items') is distinct from 'array'
      or (p_address->'_goodies_expected_items') is distinct from (v_preview->'items') then
    raise exception 'Review the updated group cart before paying' using errcode='P4210';
   end if;
   v_expected_total:=(p_address->>'_goodies_expected_total')::numeric;
  end if;
 $guard$);
 v_definition:=replace(v_definition,'v_address:=coalesce(p_address,''{}''::jsonb);',
   'v_address:=coalesce(p_address,''{}''::jsonb)-''_goodies_expected_total''-''_goodies_expected_items'';');
 v_marker:='v_total:=v_subtotal+v_delivery_fee+v_service_fee-v_discount+coalesce(p_tip,0);';
 v_definition:=replace(v_definition,v_marker,v_marker||$guard$
  if v_has_expected and v_expected_total is distinct from v_total then
   raise exception 'Review the updated group total before paying' using errcode='P4210';
  end if;
 $guard$);
 execute v_definition;
end;
$group_consent$;
