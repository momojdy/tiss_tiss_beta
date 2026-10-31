-- Enforce server-generated, single-use Geoapify road-distance quotes in the
-- canonical order RPC. The existing card and wallet wrappers both call it.
do $migration$
declare v_def text; v_old text; v_new text;
begin
  v_def := pg_get_functiondef('public.place_goodies_order(text,text,timestamp with time zone,jsonb,text,jsonb,numeric,numeric,numeric,numeric,numeric,numeric,text,text)'::regprocedure);
  v_old := '  v_first_order boolean := false;' || E'\n';
  v_new := v_old || '  v_delivery_quote public.goodies_delivery_quotes%rowtype;' || E'\n';
  if position(v_old in v_def)=0 then raise exception 'Could not locate Goodies order declaration'; end if;
  v_def := replace(v_def,v_old,v_new);
  v_old := $old$
    v_expected_delivery_fee := v_store.delivery_fee;
    if v_free_delivery
       or (v_first_order and coalesce((v_fee_settings->>'first')::boolean, false)) then
      v_expected_delivery_fee := 0;
    end if;
    if abs(p_delivery_fee - v_expected_delivery_fee) > 0.005 then
      raise exception 'The delivery fee has changed. Please review your order' using errcode = 'P0001';
    end if;
$old$;
  v_new := $new$
    if v_store.delivery_pricing_mode = 'distance' then
      if nullif(p_address->>'delivery_quote_id','') is null then
        raise exception 'Please refresh the delivery fee before placing your order' using errcode = 'P0001';
      end if;
      begin
        select * into v_delivery_quote
          from public.goodies_delivery_quotes q
         where q.id = (p_address->>'delivery_quote_id')::uuid
           and q.customer_id = v_uid and q.store_id = p_store_id
           and q.address_payload = (p_address - 'delivery_quote_id')
           and q.expires_at > now() and q.consumed_at is null
         for update;
      exception when invalid_text_representation then
        raise exception 'The delivery quote is invalid. Please refresh the delivery fee' using errcode = 'P0001';
      end;
      if not found then
        raise exception 'The delivery quote expired or no longer matches this address. Please refresh it' using errcode = 'P0001';
      end if;
      v_expected_delivery_fee := v_delivery_quote.fee;
    else
      v_expected_delivery_fee := v_store.delivery_fee;
    end if;
    if v_free_delivery
       or (v_first_order and coalesce((v_fee_settings->>'first')::boolean, false)) then
      v_expected_delivery_fee := 0;
    end if;
    if abs(p_delivery_fee - v_expected_delivery_fee) > 0.005 then
      raise exception 'The delivery fee has changed. Please review your order' using errcode = 'P0001';
    end if;
    if v_store.delivery_pricing_mode = 'distance' then
      update public.goodies_delivery_quotes set consumed_at = now() where id = v_delivery_quote.id;
    end if;
$new$;
  if position(v_old in v_def)=0 then raise exception 'Could not locate Goodies delivery validation block'; end if;
  v_def := replace(v_def,v_old,v_new);
  v_old := 'case when p_order_type = ''delivery'' then p_address else null end,';
  v_new := 'case when p_order_type = ''delivery'' then (p_address - ''delivery_quote_id'') else null end,';
  if position(v_old in v_def)=0 then raise exception 'Could not locate Goodies address insert'; end if;
  v_def := replace(v_def,v_old,v_new);
  execute v_def;
end
$migration$;
