# Admin and CMS foundation rollout

This migration is a reviewed proposal on `audit/shared-backend-foundation`; it is **not applied to the live database**. Apply it only after the Goodies migration drift is reconciled and the SQL has been reviewed against the current schema.

## First Super Admin bootstrap

The migration intentionally creates no default admin, uses no client-supplied email, and grants no staff-management access by default.

1. Create the first admin's account through Supabase Auth using a verified email and a strong password. Require MFA for the account in Supabase Auth before using the admin console.
2. Generate a cryptographically random, one-time token of at least 32 bytes using a trusted password manager or secure local generator. Do not put the raw token in Git, app configuration, analytics, or tickets.
3. Calculate the SHA-256 hex digest of that token locally, without pasting the raw token into SQL editor history.
4. As a trusted project owner in the Supabase SQL Editor, insert only the digest into the private bootstrap table with a short expiry, for example 15 minutes:

   ```sql
   insert into private.wantiss_admin_bootstrap (id, token_sha256, expires_at)
   values (true, '<64-character-lowercase-sha256-hex-digest>', now() + interval '15 minutes');
   ```

5. Sign in as that first user through Supabase Auth and invoke `wantiss_bootstrap_first_super_admin` once with the raw token and display name. The database uses the authenticated `auth.uid()` as the staff identity; it does not trust a supplied email or user ID.
6. Verify the returned user ID matches the signed-in account, confirm the bootstrap row is consumed and the token hash has been overwritten, then destroy the raw token.
7. Never reinsert a bootstrap token after the first Super Admin exists. Recoveries should use a separate trusted operator process, not a client-callable backdoor.

## Security boundaries in this proposal

- Staff/grant tables are read-only through direct client grants. Staff changes and permission grants/revocations use narrowly scoped database RPCs and the Super Admin check.
- Staff status is checked on the server for every permission evaluation; revoked, suspended, expired, or absent grants do not authorize access.
- The audit log is not directly writable by authenticated clients. Database triggers and trusted RPCs append records.
- CMS assets use a private bucket. Do not expose draft files with public URLs; public asset delivery needs a publish-aware signed URL or delivery endpoint.
- CMS content is versioned and status-aware. Published writes require the separate `content.publish` manage permission; drafts can be edited by `content.manage` edit access. Use archive status rather than deleting records.
- Wallet, payment, refund, and account restriction writes are deliberately not included in general staff CRUD access. Implement each as a separate validated server-side operation.

## Still required before production

- Reconcile all repository/live migration drift and duplicate Goodies migration version `202610240004`.
- Add staff invitation and account creation through a trusted server-side operation; this migration only assigns staff to an existing Auth user ID.
- Connect the admin app to Supabase Auth and replace local prototype state with backend reads/writes.
- Add tests for anonymous, customer, vendor, limited staff, suspended/revoked staff, expired grants, and Super Admin behavior.
- Review the final SQL and run Supabase security advisors after applying it in a non-production branch first.
