# Wantiss shared-backend audit

Audit date: 2026-10-24
Target Supabase project: `ycbirmgppwavorwudlrv` (`https://ycbirmgppwavorwudlrv.supabase.co`)

## Baseline status

This is the verified starting point before production changes. The Supabase project is active and healthy. The consumer source is configured to read its URL and publishable key from Expo environment variables; the tracked repository does not establish what values are injected into a developer machine or build profile. Therefore the consumer's *actual deployed runtime URL is not yet verified*. The admin app has no Supabase client or backend config and does not currently share the project.

## Consumer app: tiss_tiss_beta

- Expo React Native 1.10.0; `@supabase/supabase-js` 2.117.2 is installed.
- `src/lib/supabase.ts` reads `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, persists sessions using AsyncStorage, and manages token refresh with app lifecycle.
- No tracked env file or matching indexed env configuration was found. Build profile/runtime injection must be inspected in the deployment environment before claiming the URL is verified.
- Goodies currently uses local seed and generated state for stores, products, inventory, availability, pricing, addresses, notifications and wallet. The local flow includes demo identity/balance/notifications and random vendor visibility.
- `src/features/Goodies/content.ts` imports admin-export JSON into AsyncStorage and falls back to seed content. It is not a live shared CMS connection.
- Goodies order migration `202610240005_goodies_order_queue.sql` labels payment as demo; this must not be treated as a real payment integration.

## Admin app: tiss-admin

- React Native / Expo package 0.12.0; no Supabase SDK dependency or backend configuration.
- `src/features/admin/auth/authLogic.ts` contains a prototype password, fixed verification code, in-memory attempt tracking, local invitation/reset flows and local staff lookup.
- `src/features/admin/state/db.ts` clones seed JSON into memory; edits disappear on restart. Roles, access grants, staff status and audit events are client-side only.
- README identifies several planned areas as not ported. Neither app was launched in a local simulator/device for this remote baseline.

## Live Supabase schema and security

Read-only checks against the live project returned:

- 51 base tables in `public`; all currently have RLS enabled.
- 98 policies in `public`.
- Zero existing `wantiss_admin_*` or `wantiss_cms_*` tables.
- `public.account_modes` has RLS enabled and zero policies, so API access is denied unless a future explicit policy is added.
- Storage buckets: `flyz-moments` is private (50 MiB cap; image/video MIME allowlist); `wallet-avatars` is public with no configured size/MIME cap. There is no CMS assets bucket.
- Existing Edge Functions include money-request/payment flows. These are unrelated to admin authentication/CMS and must be preserved.
- Security advisor reports 45 SECURITY DEFINER functions executable by `anon` and six functions with mutable search paths. These require per-function review; blanket revocation could break intentional public flows.
- Performance advisor reports nine unindexed foreign keys and 32 RLS policies with auth initialization-plan warnings.
- No production database changes were made during baseline inspection.

## Migration drift (must resolve before applying migrations)

The repository has migrations through `202610240005_goodies_order_queue.sql`, but live migration history currently ends at `20261023171154_scheduled_order_start_minutes`. The following repository migrations are not recorded in live migration history and must be compared to the live schema before any apply:

- `202610240001_goodies_scheduled_orders.sql`
- `202610240002_business_info_fields.sql`
- `202610240003_scheduled_order_start_minutes.sql`
- `202610240004_goodies_live_schedule_and_store_chat.sql`
- `202610240004_goodies_store_schedules_and_chat.sql`
- `202610240005_goodies_order_queue.sql`

There are two different files with the same `202610240004` version prefix. Do not apply either blindly or renumber after production deployment without reconciling schema and migration history. Live schema introspection is the source of truth for what already exists; migration history is the source of truth for what Supabase thinks was applied.

## Required controls for implementation

1. Verify the actual consumer build environment resolves to the Wantiss project URL; fail fast on a mismatched project URL.
2. Use Supabase Auth for admin login. Staff records must be tied to `auth.users.id`; no client-provided email may confer Super Admin. First Super Admin bootstrap must be a one-time trusted server-side operation, based on the already-authenticated user identity and a server-held bootstrap secret/allowlist.
3. Enforce staff active/suspended/revoked status, individual view/edit/manage grants, expiries and revocations in RLS/server operations, not only UI state.
4. Audit logging must be written by trusted database functions for sensitive changes. Do not allow arbitrary client inserts/updates/deletes to audit records.
5. Financial/account operations must use narrowly scoped server-side functions and must not grant general admin write access to wallet/transaction tables.
6. CMS content must have draft, published and archived states; public reads must return published content only. Uploads need a private bucket, path ownership checks and explicit publishing/visibility rules.
7. Map every existing screen to its live table/RPC or to a clearly defined empty state; don't backfill production with demo seed data.
8. Reconcile schema/migration drift, then test RLS as anonymous, ordinary authenticated user, limited staff, expired/revoked staff and Super Admin. Run both app typechecks/builds and customer/vendor workflows before merge.

## Verification limits

This is a remote source/schema/security baseline. Runtime build variables, real device launches, end-to-end flows, staff privilege-boundary tests and CMS upload/publish tests remain unverified. No claim that the apps are connected or release-ready should be made yet.
