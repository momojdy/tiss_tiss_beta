-- The RETURNS TABLE output named id collided with the checkout-attempt id.
-- Preserve deployed authorization, pricing, advisory lock and fingerprint logic.
do $repair$
declare
  v_signature regprocedure := 'public.place_goodies_card_order_once(text,text,text,timestamptz,jsonb,text,jsonb,numeric,numeric,numeric,numeric,numeric,numeric,text,text)'::regprocedure;
  v_definition text := pg_get_functiondef(v_signature);
  v_before text := 'update public.goodies_card_checkout_attempts set order_id=v_created.id where id=v_attempt_id;';
  v_after text := 'update public.goodies_card_checkout_attempts as attempt set order_id=v_created.id where attempt.id=v_attempt_id;';
begin
  if position(v_after in v_definition)>0 then return; end if;
  if position(v_before in v_definition)=0 then
    raise exception 'Card checkout attempt update has drifted; reconcile before applying this repair';
  end if;
  execute replace(v_definition,v_before,v_after);
end;
$repair$;
