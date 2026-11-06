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
