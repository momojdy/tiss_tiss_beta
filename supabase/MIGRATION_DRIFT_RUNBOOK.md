# Migration drift reconciliation runbook

This runbook is for a **disposable Supabase development branch only**. Production project `ycbirmgppwavorwudlrv` is not a target for historical replay or migration-history repair.

## Non-negotiable safeguards

- Never run `DELETE`, `TRUNCATE`, or manual `UPDATE` statements against `supabase_migrations.schema_migrations` / `schema_migrations`.
- Never use `supabase migration repair --status reverted`; it can remove migration-history entries.
- Never replay old repository migrations on production.
- Never run `supabase db reset`, `supabase db push`, `supabase migration repair`, or a schema-changing command until the selected target has been verified as the disposable branch.
- Do not infer schema equivalence from migration names, timestamps, or a matching migration list alone.
- If a disposable branch's history cannot be reconciled without deleting or rewriting existing history rows, discard and recreate that disposable branch. Do not repair it by deleting history.

## 1. Record and verify the target

1. Record the production project reference for comparison, but do not link the CLI to production for any mutation.
2. Create a disposable development branch in the Supabase dashboard or branch tooling.
3. Record the branch project reference and connection details in a local-only note.
4. Run `supabase projects list` and inspect the selected project/branch. Verify the reference matches the disposable branch before proceeding.
5. Use a clean Git worktree/branch for reconciliation. Preserve the original repository migrations unchanged.

## 2. Capture the branch's current state

1. List migrations and save the output:

   ```bash
   supabase migration list
   ```

2. Dump the branch schema to a file outside the migrations directory:

   ```bash
   supabase db dump --linked --schema public -f branch_schema.sql
   ```

3. Confirm the linked target is the disposable branch before running the dump command.
4. Record tables, columns, constraints, indexes, policies, grants, functions, triggers, views, storage policies and extensions relevant to the two apps.

## 3. Build the repository schema independently

1. Create a separate empty local/disposable database.
2. Apply the repository's migrations in the intended order there, never against production.
3. Record failures rather than skipping or renaming migrations until they appear to work.
4. Dump the rebuilt schema. For a local Supabase database:

   ```bash
   supabase db dump --local --schema public -f repo_schema.sql
   ```

   If using a separate disposable project, dump that verified project instead.
5. Compare `branch_schema.sql` and `repo_schema.sql`. Review meaningful differences rather than treating generated ordering or environment-specific metadata as schema drift.

## 4. Create a migration reconciliation ledger

For every repository migration and every recorded live version, record:

- version and filename
- whether the file exists in the repository
- whether the version exists in the branch history
- the SQL content hash/source
- the database objects created or changed
- whether those changes are present in the branch schema
- whether the migration is equivalent to another migration
- the evidence and final decision

Investigate duplicate version prefixes individually. Never merge or renumber files merely because their names are similar. Recover missing SQL from trusted version control/deployment artifacts where possible. If the exact historical SQL is unavailable, classify it as unresolved and compare the resulting schema objects directly.

## 5. Reconcile using append-only history operations

1. Only after verifying that a migration's effects are already present in the disposable branch schema, consider recording a missing version as applied with `supabase migration repair --status applied <version>`.
2. Run this command only while linked to the disposable branch. It changes migration history; it does **not** run the migration SQL or prove the schema is correct.
3. Do not use `--status reverted`, do not manually delete/update history rows, and do not try to erase an incorrect entry.
4. If an existing history row is wrong or duplicate and cannot be handled append-only, discard/recreate the disposable branch and start from a clean verified baseline.
5. Do not use `supabase db push` to make a drifted branch look aligned. Review every proposed SQL operation separately.

## 6. Establish a reproducible baseline

1. If the repository cannot rebuild the branch's verified schema, design a baseline from the captured schema only after the schema comparison and migration ledger are reviewed.
2. Keep the baseline additive and reproducible; do not silently replace historical files or erase history.
3. Rebuild a fresh disposable database from the resulting repository migration sequence.
4. Compare the rebuilt schema with the disposable branch and investigate every meaningful difference.
5. Test RLS and grants as anonymous, ordinary authenticated user, limited staff, expired/revoked staff, Super Admin, business owner and service role where appropriate.

## 7. Release gate

Do not propose production migration changes until:

- the ledger explains all known drift
- the clean rebuild succeeds
- the disposable branch schema matches the rebuilt schema
- the security/RLS tests pass
- the forward-only production migration plan has been reviewed independently

The existing production migration `20261025163210_security_blockers_grants_settle_search_path` is already applied. Do not rerun it or replay old migrations on production. The two later security-grant fixes are separate forward-only migrations and must remain in the repository with their matching versions.
