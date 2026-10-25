# Admin and CMS: live status, first Super Admin, and verifying businesses

## Status

The Admin and CMS backend is **applied to the live database** (project `ycbirmgppwavorwudlrv`, migrations `20261024103826` through `20261024125806` in the live history): the `wantiss_admin_*` and `wantiss_cms_*` tables with RLS, about 30 functions, and the `wantiss-public-content` edge function.

It is still empty: 0 staff, 0 Super Admins, 0 CMS rows. Nobody can use any admin function until the first Super Admin exists.

The admin app (`tiss-admin`) is not in this repository, has no Supabase client yet, and still uses a prototype login. Everything below is done directly against Supabase until it is connected.

## First Super Admin bootstrap

The live bootstrap is `public.wantiss_bootstrap_super_admin(p_user_id uuid, p_display_name text)`. It is executable only by `service_role` (not `anon` or `authenticated`) and works exactly once: it raises an error if any Super Admin already exists. It creates no default admin and trusts no client-supplied identity.

> An earlier version of this document described a one-time token flow (`wantiss_bootstrap_first_super_admin` and a `private.wantiss_admin_bootstrap` table). Those objects **do not exist** in the live database. Use the steps below.

1. Create the first admin's account in Supabase Auth with a verified email and a strong password, and turn on MFA for it. The account must have a confirmed email, because every permission check requires `email_confirmed_at`.
2. Copy that user's ID (a UUID) from Supabase Auth, Users.
3. From a trusted machine, call the function with the **service role key** (Project Settings, API). It cannot be run from the SQL Editor, because the editor session has no JWT role and the function checks `auth.role() = 'service_role'`.

   ```bash
   curl -sS -X POST "$SUPABASE_URL/rest/v1/rpc/wantiss_bootstrap_super_admin" \
     -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json" \
     -d '{"p_user_id": "<auth-user-uuid>", "p_display_name": "<name>"}'
   ```

   Never put the service role key in Git, app config, tickets or chat. This call has not been run by Claude or tested from this repo.
4. Verify: `select user_id, role, status from public.wantiss_admin_staff;` shows one `super_admin` row with status `active`. A second call must fail with "Super Admin bootstrap has already been used".
5. Further staff are added through the invitation and grant functions (`wantiss_admin_accept_invitation`, `wantiss_admin_grant_permission`, `wantiss_admin_revoke_permission`, `wantiss_admin_set_staff_status_secure`), not by editing tables. Staff-management access is not granted by default.

## How an operator verifies a business

A business appears in Goodies only when `businesses.verification = 'verified'` **and** its owner has completed store setup, opening hours and one in-stock product. Verification is the one step only Wantiss can do.

Allowed values are `pending` (shown to vendors as "In review"), `verified` and `restricted`. There is no `rejected` value: the table has a check constraint.

1. The operator must be an active staff member with `operations` permission at `edit` level or higher, or a Super Admin. Permission is checked against the signed-in user (`auth.uid()`), so this has to be called with that staff member's own session (from the admin app once it is connected, or with their access token through the API). It does **not** work from the SQL Editor.
2. Review the business: its registration details, the matching row in `business_applications`, and any licence required for its category (a Drugstore store needs a pharmacy licence).
3. Record the application decision with `wantiss_admin_review_business_application(p_application_id, 'approved' | 'rejected' | 'pending', p_review_note)`. **This only updates the application. It does not verify the business.**
4. Verify the business:

   ```sql
   select public.wantiss_admin_set_business_verification('<business-uuid>', 'verified', 'Licence and ID checked');
   ```

   Pass `'restricted'` or `'pending'` instead to withdraw verification.
5. Withdrawing verification **unpublishes the store immediately** (`goodies_store_schedules.is_live` is set to false) and it cannot go live again until the business is verified again. Every call writes an entry to `wantiss_admin_audit_log` (`business_verification_set`) with the reason.
6. The vendor then taps **Go live** under Goodies, Store setup (or Products). The server re-checks everything and tells them what is still missing.

`wantiss_admin_set_business_verification` is created by `20261024140000_goodies_catalog.sql`. If that migration has not been applied to the live database yet, this function does not exist.

## Security boundaries

- Staff and grant tables are read-only through direct client grants. Staff changes and permission grants and revocations use narrowly scoped RPCs and the Super Admin check.
- Staff status is checked on the server for every permission evaluation. Revoked, suspended, expired or absent grants do not authorize access.
- The audit log is not directly writable by authenticated clients. Triggers and trusted RPCs append records.
- CMS assets use a private bucket. Do not expose draft files with public URLs.
- CMS content is versioned and status-aware. Publishing needs the separate `content.publish` manage permission. Use archive status rather than deleting records.
- Wallet, payment, refund and account restriction writes are deliberately not part of general staff CRUD. Each is a separate validated server-side operation.

## Still required before production

- Reconcile all repository and live migration drift (`supabase/MIGRATION_RECONCILIATION.md`), including the two files that share the `202610240004` prefix. Keep both and do not rename them.
- Add staff invitation and account creation through a trusted server-side operation. The live functions only assign staff to an existing Auth user.
- Connect the admin app to Supabase Auth and replace its local prototype state with backend reads and writes.
- Test anonymous, customer, vendor, limited staff, suspended or revoked staff, expired grants and Super Admin behavior.
- Run the Supabase security advisors after each change.
