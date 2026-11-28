-- Reverts only the two guards introduced by goodies_reject_null_order_decisions.
-- Emergency recovery only: this reopens the invalid-input behavior.
begin;
do $recovery$
declare body text; old_text text; new_text text;
begin
  body := pg_get_functiondef('public.decline_goodies_order(uuid,text,text)'::regprocedure);
  old_text := 'if p_reason_code is null or p_reason_code not in (';
  new_text := 'if p_reason_code not in (';
  if position(old_text in body)>0 then execute replace(body,old_text,new_text); end if;
  body := pg_get_functiondef('public.goodies_courier_respond_assignment(uuid,boolean)'::regprocedure);
  old_text := E'  if p_accept is null then\n    raise exception ''Choose accept or decline'' using errcode=''22023'';\n  end if;\n\n';
  if position(old_text in body)>0 then execute replace(body,old_text,''); end if;
end;
$recovery$;
commit;
