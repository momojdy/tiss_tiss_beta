# Goodies database recovery prerequisite

**Status: NOT VERIFIED. No full backup was created.** Production database deployment is authorized, but must wait for a usable restore point and isolated recovery evidence. The available schema snapshot contains definitions/catalog metadata only. It does not contain production data, Auth state, Storage object bytes or a complete shared schema.

## Establish a real restore point

Use either authenticated Supabase dashboard/Management API access to confirm an existing automatic backup/PITR restore point, or a securely bound PostgreSQL connection capable of exporting the database. Record the project reference, backup identifier/timestamp, scope, retention and recovery operator. An apparent paid-plan capability is not evidence of an actual backup. Do not enable a paid plan or rotate secrets implicitly.

The environment currently has neither database credentials nor an authenticated backup-management capability. Direct database DNS is IPv6-only; the tested host cannot route IPv6. The tested generic regional pooler addresses refused or timed out, and are not proof of the actual project Connect-panel endpoint. The HTTP proxy accepts TLS but rejects PostgreSQL protocol; it is not a database tunnel. Obtain the actual project session-pooler host/port and a secure connection binding, then validate the route without logging credentials.

Follow the official [Supabase backup guidance](https://supabase.com/docs/guides/platform/backups) and [platform logical export/restore procedure](https://supabase.com/docs/guides/self-hosting/restore-from-platform). A logical export needs roles, schema and data, with errors checked and a tool version compatible with PostgreSQL 17.6. Keep exports outside the Git repositories in approved protected storage; production dumps contain sensitive information. Preserve checksums and exit receipts without committing customer data, passwords, tokens or role-password hashes. Database backups do not include Storage object bytes; protect those and the required Edge Function/configuration sources separately.

## Prove recovery before rollout

Restore into a separate disposable database/project with no production outbound hooks, payment credentials, scheduled workers, push destinations or storage endpoints. Never restore test fixtures into production. Follow the provider's documented handling for managed roles/extensions/Auth schemas rather than improvising a partial `public`-only copy.

Record successful restoration, schema and row-count parity for required tables, migration/function/policy/trigger parity, constraints, required sequences and storage metadata. Use synthetic identities for behavioral tests. Apply the exact candidate package in order and run the authorization/financial/courier suites there. The existing native test runner deliberately creates its own synthetic cluster and refuses production URLs; it cannot certify a full production restore.

## Migration failure and recovery

Recheck the live baseline and candidate checksums immediately before rollout. Use one transaction per migration through the migration mechanism, including files that lack an explicit outer `BEGIN`. On a failure, roll back that transaction and stop; do not mark it applied or continue through a partly applied migration. Preserve original names/history and reconcile tool-assigned versions.

Keep all new feature gates disabled while verifying contracts. If a committed change has a defect, preserve financial ledgers/receipts and prepare a scoped forward fix. Do not blindly run down migrations or reset balances. Whole-database restoration requires the verified restore point, a coordinated write pause, recovery operator and an explicit reconciliation of writes occurring after the backup. That destructive recovery is a separate decision, not an automatic test action.

Backend-only rollout must not publish the full app/OTA, activate external payout channels, initialize historical balances, change production secrets or publish deferred FAQ/legal content.
