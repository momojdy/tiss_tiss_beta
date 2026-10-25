ALTER FUNCTION public.get_unread_notification_count(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_vendor_verified_status(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.wallet_set_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_user_payment_methods_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_stripe_customers_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_reviews_updated_at() SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.settle_card_money_request(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_card_money_request(uuid, text) TO service_role;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE
  public.wallets,
  public.wallet_transactions,
  public.wallet_payments,
  public.wallet_notifications,
  public.wallet_points,
  public.wallet_point_transactions,
  public.wallet_points_transactions,
  public.wallet_point_milestones,
  public.wallet_points_settings,
  public.wallet_referrals,
  public.money_requests,
  public.stripe_customers,
  public.user_payment_methods,
  public.goodies_builder_configs
FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.goodies_save_builder_configs(p_business uuid, p_configs jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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
  IF NOT (
    EXISTS (
      SELECT 1 FROM public.business_members bm
      WHERE bm.business_id = p_business AND bm.user_id = (SELECT auth.uid())
    )
    OR public.wantiss_has_permission('operations', 'edit')
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

REVOKE ALL ON FUNCTION public.goodies_save_builder_configs(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.goodies_save_builder_configs(uuid, jsonb) TO authenticated, service_role;
