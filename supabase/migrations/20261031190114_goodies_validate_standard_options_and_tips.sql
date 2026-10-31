CREATE OR REPLACE FUNCTION public.validate_goodies_standard_product_line(
  p_category text,
  p_base_price numeric,
  p_line jsonb,
  p_deals jsonb
) RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_options jsonb := p_line->'options';
  v_parts text[];
  v_size text;
  v_drink boolean := false;
  v_discount_pct numeric := 0;
  v_base numeric;
  v_expected numeric;
  v_supplies_size boolean := p_category IN ('restaurants', 'bakery', 'beverages');
  v_deal jsonb;
  v_line_price numeric;
BEGIN
  IF p_line IS NULL OR jsonb_typeof(p_line) <> 'object'
     OR p_base_price IS NULL OR p_base_price < 0 THEN
    RAISE EXCEPTION 'Invalid product line' USING ERRCODE = '22023';
  END IF;
  IF v_options IS NOT NULL THEN
    IF jsonb_typeof(v_options) <> 'object' THEN
      RAISE EXCEPTION 'Invalid product options' USING ERRCODE = '22023';
    END IF;
    v_size := nullif(v_options->>'size', '');
    IF v_options ? 'drink' THEN
      IF jsonb_typeof(v_options->'drink') <> 'boolean' THEN
        RAISE EXCEPTION 'Invalid drink option' USING ERRCODE = '22023';
      END IF;
      v_drink := (v_options->>'drink')::boolean;
    END IF;
    BEGIN
      v_discount_pct := coalesce(nullif(v_options->>'discount_pct', '')::numeric, 0);
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Invalid product discount' USING ERRCODE = '22023';
    END;
  ELSE
    -- Compatibility for carts saved by earlier app versions.
    v_parts := string_to_array(coalesce(p_line->>'k', ''), '|');
    IF coalesce(array_length(v_parts, 1), 0) >= 4 THEN
      IF v_supplies_size THEN
        v_size := CASE v_parts[2] WHEN '0' THEN 'regular' WHEN '1' THEN 'large' ELSE NULL END;
      ELSIF v_parts[2] IN ('', '0') THEN
        v_size := NULL;
      ELSE
        RAISE EXCEPTION 'This product does not offer size options' USING ERRCODE = '22023';
      END IF;
      IF v_parts[3] NOT IN ('0', '1') THEN
        RAISE EXCEPTION 'Invalid drink option' USING ERRCODE = '22023';
      END IF;
      v_drink := v_parts[3] = '1';
      BEGIN
        v_discount_pct := coalesce(nullif(v_parts[4], '')::numeric, 0);
      EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Invalid product discount' USING ERRCODE = '22023';
      END;
    ELSE
      v_size := CASE WHEN v_supplies_size THEN 'regular' ELSE NULL END;
    END IF;
  END IF;
  IF v_supplies_size THEN
    IF v_size IS NULL OR v_size NOT IN ('regular', 'large') THEN
      RAISE EXCEPTION 'Choose a valid product size' USING ERRCODE = '22023';
    END IF;
  ELSIF v_size IS NOT NULL THEN
    RAISE EXCEPTION 'This product does not offer size options' USING ERRCODE = '22023';
  END IF;
  IF v_drink AND p_category NOT IN ('restaurants', 'bakery') THEN
    RAISE EXCEPTION 'A drink add-on is not available for this product' USING ERRCODE = '22023';
  END IF;
  IF v_discount_pct < 0 OR v_discount_pct > 100 THEN
    RAISE EXCEPTION 'Invalid product discount' USING ERRCODE = '22023';
  END IF;
  IF v_discount_pct > 0 THEN
    IF jsonb_typeof(coalesce(p_deals, '[]'::jsonb)) <> 'array' THEN
      RAISE EXCEPTION 'Product discount configuration is invalid' USING ERRCODE = '22023';
    END IF;
    SELECT d INTO v_deal
      FROM jsonb_array_elements(coalesce(p_deals, '[]'::jsonb)) AS deal(d)
     WHERE d->>'item' = p_line->>'id'
       AND d->>'st' = 'Live'
       AND coalesce(d->>'rs', '') <> 'alcohol'
       AND CASE
         WHEN coalesce(d->>'pct', '') ~ '^(0|[1-9][0-9]{0,2})([.][0-9]{1,2})?$'
         THEN (d->>'pct')::numeric = v_discount_pct
         ELSE false
       END
     LIMIT 1;
    IF v_deal IS NULL THEN
      RAISE EXCEPTION 'This product discount is no longer available' USING ERRCODE = 'P0001';
    END IF;
    v_base := round(p_base_price * (100 - v_discount_pct) / 100, 2);
  ELSE
    v_base := p_base_price;
  END IF;
  v_expected := v_base
    + CASE WHEN v_size = 'large' THEN 1.50 ELSE 0 END
    + CASE WHEN v_drink THEN 1.00 ELSE 0 END;
  BEGIN
    v_line_price := (p_line->>'p')::numeric;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Invalid product price' USING ERRCODE = '22023';
  END;
  IF v_line_price IS NULL OR abs(v_line_price - v_expected) > 0.005 THEN
    RAISE EXCEPTION 'The price or options for this product have changed. Please review your cart.' USING ERRCODE = 'P0001';
  END IF;
  RETURN v_expected;
END;
$function$;

CREATE OR REPLACE FUNCTION public.goodies_tip_is_allowed(
  p_tip numeric,
  p_choices text
) RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_choice text;
  v_choices text[] := string_to_array(coalesce(nullif(trim(p_choices), ''), '0'), ',');
BEGIN
  IF p_tip IS NULL OR p_tip < 0 OR p_tip > 1000 THEN
    RETURN false;
  END IF;
  FOREACH v_choice IN ARRAY v_choices LOOP
    v_choice := trim(v_choice);
    IF v_choice ~ '^(0|[1-9][0-9]{0,3})([.][0-9]{1,2})?$' THEN
      IF v_choice::numeric <= 1000 AND v_choice::numeric = p_tip THEN
        RETURN true;
      END IF;
    END IF;
  END LOOP;
  RETURN false;
END;
$function$;

REVOKE ALL ON FUNCTION public.validate_goodies_standard_product_line(text,numeric,jsonb,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.goodies_tip_is_allowed(numeric,text) FROM PUBLIC, anon, authenticated;

DO $migration$
DECLARE
  v_definition text;
  v_old text;
  v_new text;
BEGIN
  v_definition := pg_get_functiondef(
    'public.place_goodies_order(text,text,timestamptz,jsonb,text,jsonb,numeric,numeric,numeric,numeric,numeric,numeric,text,text)'::regprocedure
  );
  v_old := $old$    -- Client option upcharges: Large +1.50, drink +1.00 (no server-side option table yet).
    if not (abs(v_p - v_prod.price) < 0.005 or abs(v_p - (v_prod.price + 1)) < 0.005
         or abs(v_p - (v_prod.price + 1.5)) < 0.005 or abs(v_p - (v_prod.price + 2.5)) < 0.005) then
      raise exception 'The price of % has changed. Please review your cart', v_prod.name using errcode = 'P0001';
    end if;
    v_sum := v_sum + v_p * v_q;$old$;
  IF position(v_old IN v_definition) = 0 THEN
    RAISE EXCEPTION 'Could not locate the existing Goodies product-option validation';
  END IF;
  v_new := $new$    v_builder_price := public.validate_goodies_standard_product_line(
      v_store.category, v_prod.price, v_item, coalesce(v_content->'deals', '[]'::jsonb)
    );
    v_sum := v_sum + v_builder_price * v_q;$new$;
  v_definition := replace(v_definition, v_old, v_new);
  v_old := $old$  if p_delivery_fee is null or p_service_fee is null or p_discount is null or p_tip is null or p_subtotal is null or p_total is null
     or p_delivery_fee < 0 or p_service_fee < 0 or p_discount < 0 or p_tip < 0 then
    raise exception 'Invalid order totals' using errcode = '22023';
  end if;$old$;
  IF position(v_old IN v_definition) = 0 THEN
    RAISE EXCEPTION 'Could not locate the existing Goodies total validation';
  END IF;
  v_new := v_old || E'\n  if not public.goodies_tip_is_allowed(p_tip, coalesce(v_fee_settings->>''tips'', ''0'')) then\n    raise exception ''Choose one of the available courier tip amounts'' using errcode = ''22023'';\n  end if;';
  v_definition := replace(v_definition, v_old, v_new);
  EXECUTE v_definition;
END;
$migration$;

-- Keep the shared order creator inaccessible to authenticated clients; all
-- customer checkout must enter through the idempotent Card or Wallet/Cash RPC.
REVOKE ALL ON FUNCTION public.place_goodies_order(text,text,timestamptz,jsonb,text,jsonb,numeric,numeric,numeric,numeric,numeric,numeric,text,text) FROM PUBLIC, anon, authenticated;