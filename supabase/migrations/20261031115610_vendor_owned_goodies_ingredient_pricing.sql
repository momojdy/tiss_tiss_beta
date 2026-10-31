-- Ingredient prices and availability belong to the vendor.
-- Admin builder edits may manage structure and artwork, but cannot change
-- the vendor's price/free/availability decisions for existing ingredients.
CREATE OR REPLACE FUNCTION public.wantiss_admin_save_goodies_builder_config(
  p_business_id uuid,
  p_builder_id text,
  p_config jsonb,
  p_enabled boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_enabled boolean;
  v_existing jsonb;
  v_saved_config jsonb;
  v_group jsonb;
  v_item jsonb;
  v_old_item jsonb;
  v_groups jsonb := '[]'::jsonb;
  v_items jsonb;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT public.wantiss_has_permission('operations', 'edit') THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  IF p_business_id IS NULL OR length(trim(coalesce(p_builder_id, ''))) NOT BETWEEN 1 AND 120 THEN
    RAISE EXCEPTION 'Invalid business or builder id' USING ERRCODE = '22023';
  END IF;
  IF p_config IS NULL OR jsonb_typeof(p_config) <> 'object' OR p_config->>'id' IS DISTINCT FROM trim(p_builder_id) THEN
    RAISE EXCEPTION 'Builder config must be an object whose id matches the selected builder' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(p_config->'groups') IS DISTINCT FROM 'array' OR jsonb_typeof(p_config->'sizes') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Builder sizes and ingredient groups must be arrays' USING ERRCODE = '22023';
  END IF;
  IF length(p_config::text) > 500000 THEN
    RAISE EXCEPTION 'Builder config is too large' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = p_business_id) THEN
    RAISE EXCEPTION 'Business not found' USING ERRCODE = 'P0001';
  END IF;

  SELECT gbc.config
    INTO v_existing
    FROM public.goodies_builder_configs gbc
   WHERE gbc.business_id = p_business_id
     AND gbc.builder_id = trim(p_builder_id)
   FOR UPDATE;

  -- Preserve vendor-owned values by stable ingredient ID. New ingredients
  -- added by an admin start unavailable and non-free until the vendor sets them.
  FOR v_group IN
    SELECT value FROM jsonb_array_elements(COALESCE(p_config->'groups', '[]'::jsonb))
  LOOP
    v_items := '[]'::jsonb;
    FOR v_item IN
      SELECT value FROM jsonb_array_elements(COALESCE(v_group->'items', '[]'::jsonb))
    LOOP
      v_old_item := NULL;
      IF v_existing IS NOT NULL THEN
        SELECT old_item.value
          INTO v_old_item
          FROM jsonb_array_elements(COALESCE(v_existing->'groups', '[]'::jsonb)) AS old_group(value)
          CROSS JOIN LATERAL jsonb_array_elements(COALESCE(old_group.value->'items', '[]'::jsonb)) AS old_item(value)
         WHERE old_item.value->>'id' = v_item->>'id'
         LIMIT 1;
      END IF;

      IF v_old_item IS NOT NULL THEN
        v_item := jsonb_set(v_item, '{price}', COALESCE(v_old_item->'price', '0'::jsonb), true);
        v_item := jsonb_set(v_item, '{free}', COALESCE(v_old_item->'free', 'false'::jsonb), true);
        v_item := jsonb_set(v_item, '{avail}', COALESCE(v_old_item->'avail', 'false'::jsonb), true);
      ELSE
        v_item := jsonb_set(v_item, '{price}', '0'::jsonb, true);
        v_item := jsonb_set(v_item, '{free}', 'false'::jsonb, true);
        v_item := jsonb_set(v_item, '{avail}', 'false'::jsonb, true);
      END IF;
      v_items := v_items || jsonb_build_array(v_item);
    END LOOP;
    v_group := jsonb_set(v_group, '{items}', v_items, true);
    v_groups := v_groups || jsonb_build_array(v_group);
  END LOOP;

  v_saved_config := jsonb_set(p_config, '{groups}', v_groups, true);
  v_enabled := COALESCE(p_enabled, false)
    AND COALESCE((v_saved_config->>'enabled')::boolean, false)
    AND COALESCE((v_saved_config->>'available')::boolean, false);

  INSERT INTO public.goodies_builder_configs (business_id, builder_id, config, enabled, updated_at)
  VALUES (p_business_id, trim(p_builder_id), v_saved_config, v_enabled, now())
  ON CONFLICT (business_id, builder_id)
  DO UPDATE SET config = EXCLUDED.config, enabled = EXCLUDED.enabled, updated_at = now();

  RETURN true;
END;
$function$;

-- The vendor dashboard endpoint must not be usable by an operations admin to
-- edit vendor-controlled ingredient prices or availability.
CREATE OR REPLACE FUNCTION public.goodies_save_builder_configs(p_business uuid, p_configs jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  item jsonb;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Sign in required' USING ERRCODE = '42501';
  END IF;
  IF p_configs IS NULL OR jsonb_typeof(p_configs) <> 'array' THEN
    RAISE EXCEPTION 'Builder configurations must be an array' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.business_members bm
    WHERE bm.business_id = p_business AND bm.user_id = (SELECT auth.uid())
  ) THEN
    RAISE EXCEPTION 'Not authorized for this business' USING ERRCODE = '42501';
  END IF;

  FOR item IN SELECT value FROM jsonb_array_elements(p_configs)
  LOOP
    IF NULLIF(item->>'id', '') IS NULL THEN
      RAISE EXCEPTION 'Every builder needs an id' USING ERRCODE = '22023';
    END IF;
    INSERT INTO public.goodies_builder_configs
      (business_id, builder_id, config, enabled, updated_at)
    VALUES
      (p_business, item->>'id', item, COALESCE((item->>'enabled')::boolean, false) AND COALESCE((item->>'available')::boolean, false), now())
    ON CONFLICT (business_id, builder_id)
    DO UPDATE SET config = EXCLUDED.config, enabled = EXCLUDED.enabled, updated_at = now();
  END LOOP;

  DELETE FROM public.goodies_builder_configs gbc
  WHERE gbc.business_id = p_business
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_configs) item
      WHERE item->>'id' = gbc.builder_id
    );
END;
$function$;
