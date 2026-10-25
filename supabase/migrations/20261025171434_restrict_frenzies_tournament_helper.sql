REVOKE EXECUTE ON FUNCTION public.frenzies_ensure_open_tournament(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.frenzies_ensure_open_tournament(text) TO service_role;
