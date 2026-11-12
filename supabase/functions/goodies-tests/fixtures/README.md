# Isolated Goodies schema fixture

`goodies-core.sql` contains schema-only metadata captured read-only from Wantiss
on 2026-11-06: selected Goodies tables, functions, constraints, triggers, function
ACLs and RLS policies. It contains no customer rows or credentials. Tests insert
synthetic actors, inventory and balances, then execute actual PostgreSQL routines
through PGlite. Candidate migrations are applied by the test before exercising them.

This is a targeted integration fixture, not a complete Supabase environment.
Authentication claims are supplied with session settings. Foreign keys to unrelated
domains and shared non-Goodies triggers are omitted. Storage HTTP, PostgREST, push,
Stripe, Realtime transport and physical GPS are not reproduced. Serial transaction
and idempotency tests do not establish multi-connection race safety. Hosted staging
and provider sandbox tests remain required before release.
