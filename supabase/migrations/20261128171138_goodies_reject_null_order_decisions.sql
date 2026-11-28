-- Reject ambiguous RPC inputs before an order/assignment or refund can change.
-- CREATE OR REPLACE preserves the existing function owner, ACL and signatures.
do $migration$
declare
  body text;
  old_text text;
  new_text text;
begin
  body := pg_get_functiondef('public.decline_goodies_order(uuid,text,text)'::regprocedure);
  old_text := 'if p_reason_code not in (';
  new_text := 'if p_reason_code is null or p_reason_code not in (';
  if position(new_text in body) = 0 then
    if (length(body)-length(replace(body,old_text,'')))/length(old_text) <> 1 then
      raise exception 'Reconcile the decline validation contract before applying this migration';
    end if;
    execute replace(body,old_text,new_text);
  end if;

  body := pg_get_functiondef('public.goodies_courier_respond_assignment(uuid,boolean)'::regprocedure);
  old_text := '  select * into v_order from public.goodies_orders where id = p_order_id for update;';
  new_text := E'  if p_accept is null then\n    raise exception ''Choose accept or decline'' using errcode=''22023'';\n  end if;\n\n' || old_text;
  if position(new_text in body) = 0 then
    if (length(body)-length(replace(body,old_text,'')))/length(old_text) <> 1 then
      raise exception 'Reconcile the courier response contract before applying this migration';
    end if;
    execute replace(body,old_text,new_text);
  end if;
end;
$migration$;
