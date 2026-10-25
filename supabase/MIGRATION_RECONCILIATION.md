# Supabase migration reconciliation

Checked 2026-10-25 against project `ycbirmgppwavorwudlrv`.

## Current inventory

- `main` contains **77 tracked SQL migration files**.
- Live Supabase records **151 migration-history entries** after the forward-only security migration was recorded on 2026-10-25. The earlier audit observed 148 entries before this new migration.
- There are eight duplicate migration version prefixes: `202610240004`, `20261024000700`, `20261024000800`, `20261024000900`, `20261024001000`, `20261024001100`, `20261024001200`, and `20261024001300`.
- Six older repository migrations still require a statement-by-statement comparison against live schema: `business_space_compatibility`, `restore_stayz_views_and_api`, `business_info_fields`, `goodies_live_schedule_and_store_chat`, `goodies_store_schedules_and_chat`, and `goodies_order_queue`.

## Changes applied on 2026-10-25

- The Stripe money-request webhook source was retrieved from the live deployment. It verifies the Stripe signature and uses `SUPABASE_SERVICE_ROLE_KEY` for database operations. `settle_card_money_request(uuid,text)` is now executable only by `service_role`; `PUBLIC`, `anon`, and `authenticated` were revoked.
- Fixed search paths on the six functions reported by the Supabase advisor.
- Revoked direct insert, update, delete, truncate, reference and trigger privileges for `PUBLIC`, `anon`, and `authenticated` on wallet/payment tables and `goodies_builder_configs`. Read access remains governed by existing grants and RLS.
- Added `goodies_save_builder_configs(uuid,jsonb)`, which checks the signed-in user’s business membership or admin permission and performs builder writes server-side. The Business Space client now uses this RPC instead of direct table writes.
- Removed the admin prototype password/fixed code from source, emptied the seeded auth credential file, and removed the hard-coded email gate from the sign-in form. Supabase Auth is the sign-in path.
- Goodies Orders now refreshes server status and listens for order updates while the Orders list is open. Production wallet cancellation refreshes the balance from Supabase rather than increasing it locally.
- Updated the Tiss Admin README and removed stale IDE-specific setup instructions from the customer app.

## What was reconciled in this pass

- Recent Goodies order SLA, decline reasons, notification, wallet checkout/refund, promo-code validation, custom-builder validation, Stripe saved-card checkout, and card-refund queue migrations are tracked on `main`.
- The order acceptance-expiry cron job is active every minute.
- The card-refund worker is deployed, uses a Vault-backed token, and is scheduled every minute. Its most recent calls returned HTTP 200 with zero jobs scanned; there are currently no refund queue items.
- The live order functions accept published promo codes and validate custom-builder lines against server-published builder configuration.
- The live Super Admin review RPC persists the final-rejection flag and sends an in-app application review notification.
- Production configuration currently has **0 live Goodies stores, 0 Goodies products, 0 Goodies orders, 0 builder configurations, and no published coupon configuration**. Real customer/vendor checkout cannot be exercised until these records exist.

## Checks run

The following were executed in a transaction and rolled back, leaving no test orders or notifications in production:

- An overdue order was expired, the stock-restoration path ran, and an in-app notification was written.
- A vendor decline with `Other` and fewer than 10 characters was rejected; a valid preselected reason persisted and produced a customer-facing notification.
- A card-paid terminal order was queued for refund and its customer message changed to the refund-pending wording.
- A custom-builder line with the correct server-computed price passed validation; a tampered price was rejected.
- A wallet checkout with an insufficient balance was rejected before order creation.
- A final application rejection persisted the flag and applicant notification.

No real payment, refund, application decision, or live vendor order was performed.

## Still open

**Migration history drift is documented but not fully reconciled.** The 148-live-versus-76-tracked difference is not a safe reason to delete migration-history rows, rename old versions, or replay historical SQL. The six unmatched migrations and duplicate version groups need schema-level comparison on a disposable database before a forward-only repair can be designed.

The TypeScript build and app-level end-to-end tests were not run in this environment. Card payment, wallet checkout, published promotions, custom builders, and vendor/customer notifications still need end-to-end validation with a test store and provider test credentials.


## Application document verification

- The database now stores application documents in a private bucket and a row-level-secured table. The admin drawer reads the server records, can open signed URLs, and can verify or request replacement.
- The review RPC refuses approval until business licence, tax ID, and owner ID records are all server-verified. The applicant-side upload screen is not yet wired into the customer app, so new applications will remain blocked until that upload flow is added.


## Remaining blockers after the security pass

- Leaked-password protection was not changed through the available project-management controls; it must be enabled and confirmed in Supabase Auth settings. It is available on Pro and above: https://supabase.com/docs/guides/auth/password-security.
- Applicant-side business document upload is still not integrated into the customer app. The private bucket, table, and server submission RPC exist, but no complete applicant upload journey was verified.
- No business was verified or published during this pass. Do not approve a business without reviewing its real documents. Production currently has no live Goodies store/product/order configuration, so end-to-end checkout still needs a real verified test business and provider test credentials.
- Migration drift has not been reconciled: duplicate version prefixes and the 148 live history entries still require a disposable database comparison. No historical migration rows were deleted and no old migration was replayed.
- The Goodies and goodies feature directories have not yet been merged because their runtime import usage must be mapped before deleting or moving files.
- CI/typecheck and app-level end-to-end tests were not run from this environment. Production readiness is not yet established.
