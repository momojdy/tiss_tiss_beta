-- Enforce Goodies fees using trusted published configuration, not client totals.
-- The currently published content has no fees object, so the effective service fee
-- remains USD 0.00 until Operations publishes a fee. This deliberately does not
-- invent or silently introduce a customer charge.
DO $migration$
DECLARE
  v_definition text;
  v_old text;
  v_new text;
BEGIN
  v_definition := pg_get_functiondef(
    'public.place_goodies_order(text,text,timestamptz,jsonb,text,jsonb,numeric,numeric,numeric,numeric,numeric,numeric,text,text)'::regprocedure
  );

  v_old := 'v_coupon_store text; v_coupon_kind text; v_free_delivery boolean := false;';
  IF position(v_old IN v_definition) = 0 THEN
    RAISE EXCEPTION 'Could not locate Goodies fee declarations; migration stopped without changing the function';
  END IF;
  v_new := v_old || E'\n  v_fee_settings jsonb := ''{}''::jsonb;\n  v_expected_service_fee numeric := 0;\n  v_expected_delivery_fee numeric := 0;\n  v_first_order boolean := false;';
  v_definition := replace(v_definition, v_old, v_new);

  v_old := $old$  if not found then raise exception 'This store is not accepting online orders yet' using errcode = 'P0001'; end if;$old$;
  IF position(v_old IN v_definition) = 0 THEN
    RAISE EXCEPTION 'Could not locate Goodies store validation; migration stopped without changing the function';
  END IF;
  v_new := v_old || E'\n\n  -- Read fee policy from the latest published Goodies configuration.\n  select payload into v_content\n    from public.wantiss_cms_content\n   where content_key in (''goodies.content'', ''goodies'') and status = ''published''\n   order by case when content_key = ''goodies.content'' then 0 else 1 end,\n            case when locale = ''en'' then 0 else 1 end,\n            published_at desc nulls last, version desc\n   limit 1;\n  v_fee_settings := coalesce(v_content->''fees'', ''{}''::jsonb);\n  if nullif(v_fee_settings->>''svc'', '''') is not null then\n    begin\n      v_expected_service_fee := (v_fee_settings->>''svc'')::numeric;\n    exception when invalid_text_representation then\n      raise exception ''Goodies service fee configuration is invalid'' using errcode = ''22023'';\n    end;\n  end if;\n  if v_expected_service_fee < 0 or v_expected_service_fee > 1000 then\n    raise exception ''Goodies service fee configuration is outside the allowed range'' using errcode = ''22023'';\n  end if;\n  select not exists (select 1 from public.goodies_orders o where o.customer_id = v_uid)\n    into v_first_order;';
  v_definition := replace(v_definition, v_old, v_new);

  v_old := $old$  if p_delivery_fee is null or p_service_fee is null or p_discount is null or p_tip is null or p_subtotal is null or p_total is null
     or p_delivery_fee < 0 or p_service_fee < 0 or p_discount < 0 or p_tip < 0 then
    raise exception 'Invalid order totals' using errcode = '22023';
  end if;$old$;
  IF position(v_old IN v_definition) = 0 THEN
    RAISE EXCEPTION 'Could not locate Goodies total validation; migration stopped without changing the function';
  END IF;
  v_new := v_old || E'\n  if abs(p_service_fee - v_expected_service_fee) > 0.005 then\n    raise exception ''The service fee has changed. Please review your order'' using errcode = ''P0001'';\n  end if;';
  v_definition := replace(v_definition, v_old, v_new);

  v_old := $old$  if p_order_type = 'delivery' and p_delivery_fee <> 0 and abs(p_delivery_fee - v_store.delivery_fee) > 0.005 then
    raise exception 'The delivery fee has changed. Please review your order' using errcode = 'P0001';
  end if;$old$;
  IF position(v_old IN v_definition) = 0 THEN
    RAISE EXCEPTION 'Could not locate Goodies delivery fee validation; migration stopped without changing the function';
  END IF;
  v_new := $new$  if p_order_type = 'delivery' then
    v_expected_delivery_fee := v_store.delivery_fee;
    if v_free_delivery
       or (v_first_order and coalesce((v_fee_settings->>'first')::boolean, false)) then
      v_expected_delivery_fee := 0;
    end if;
    if abs(p_delivery_fee - v_expected_delivery_fee) > 0.005 then
      raise exception 'The delivery fee has changed. Please review your order' using errcode = 'P0001';
    end if;
  end if;$new$;
  v_definition := replace(v_definition, v_old, v_new);

  EXECUTE v_definition;
END;
$migration$;
