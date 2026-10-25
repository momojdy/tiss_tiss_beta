REVOKE EXECUTE ON FUNCTION public.qualify_wallet_referral(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.qualify_wallet_referral(uuid, text) TO service_role;
