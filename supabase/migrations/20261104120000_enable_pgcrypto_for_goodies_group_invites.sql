-- Goodies group invite generation uses extensions.gen_random_bytes.
-- Ensure pgcrypto is installed in the Supabase extensions schema.
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'extensions'
      AND p.proname = 'gen_random_bytes'
  ) THEN
    RAISE EXCEPTION 'pgcrypto gen_random_bytes is unavailable in extensions schema';
  END IF;
END;
$$;
