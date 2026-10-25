# Supabase migration reconciliation

Checked 2026-10-25 against project `ycbirmgppwavorwudlrv`.

## Inventory

- Consumer repository has 75 tracked SQL migration files on `main` (recounted 2026-10-25 after refund-worker reconciliation).
- Supabase reports 147 migration-history entries (live count rechecked 2026-10-25).
- Migration version strings and file names are not consistently aligned. Several migration bodies have matching live history names but different versions, which means version-only comparison overstates the drift.
- There are eight duplicate version prefixes in the repository. They must not be renamed or replayed until each migration body is compared with live schema and history. Duplicate groups include `202610240004`, `20261024000700`, `20261024000800`, `20261024000900`, `20261024001000`, `20261024001100`, `20261024001200`, and `20261024001300`.

Two Goodies order-response migrations are now recorded in live Supabase history: `20261025112902_goodies_vendor_acceptance_and_declines` and `20261025113645_schedule_goodies_order_acceptance_expiry`. Their SQL source is tracked as separate files on `main`.

The original duplicate `202610240004` group includes:
  - `202610240004_goodies_live_schedule_and_store_chat.sql`
  - `202610240004_goodies_store_schedules_and_chat.sql`

## Repository files without an exact matching live migration name

These six names do not appear in live migration history by name and require schema-level comparison before anyone decides whether they are missing, superseded, or already applied manually:

- `business_space_compatibility`
- `restore_stayz_views_and_api`
- `business_info_fields`
- `goodies_live_schedule_and_store_chat`
- `goodies_store_schedules_and_chat`
- `goodies_order_queue`

Other migrations have matching names but mismatched version values, including business access hardening, account modes, wallet transfer, and Goodies scheduled orders. Do not rename or reapply these based only on the filename.

## Safe next step

1. Export/inspect the live definitions for every table, column, index, trigger, policy, function, publication membership and storage policy touched by the six uncertain migrations.
2. Compare those definitions against each complete SQL file and record whether each statement is already satisfied, partially applied, or missing.
3. Resolve the duplicate `202610240004` migration by preserving both files and documenting the exact desired statement order. Do not edit production migration history just to make names look consistent.
4. Test the reconciled sequence against a disposable/non-production database before any production apply.
5. Only then add the proposed admin/CMS migration to the reconciled sequence.

## Changes made on 2026-10-25

The Goodies vendor acceptance/decline, scheduled expiry, wallet checkout/refunds, final application rejection, review-RPC cleanup, builder configuration/validation, published promo-code validation, card payment references, refund queue/worker, and notification-hardening changes now have tracked SQL files on `main`. This improves the recent change trail, but does not reconcile the older live-history entries that have no matching tracked file.

**Status: drift is documented but not fully reconciled.** No historical migration files were renamed or replayed, and no existing migration-history rows were manually edited. The current 147-live-versus-75-tracked difference still needs statement-by-statement schema verification before it can be safely closed.


## Current status and safety boundary

- Live database history count is 139; tracked SQL file count is 67. Many older database migrations are not represented by a same-version/same-name file in this repository. This historical drift is not proof that every unmatched migration is missing from the live schema.
- Do not delete history rows, rename applied migration versions, or replay historical SQL against production merely to make counts match. Reconcile by schema diff in a disposable database, then add a forward-only repair migration for verified missing behavior.
- Live verification confirmed the Goodies acceptance, decline, and expiry functions exist and the cron job `goodies-expire-unaccepted-orders` is active on a one-minute schedule.
- `20261025115047_goodies_order_lifecycle_notifications_hardening` is applied in live Supabase and now tracked as `supabase/migrations/20261025115047_goodies_order_lifecycle_notifications_hardening.sql` on `main`.
- The live database reports `goodies_server_builder_configs`, `support_published_goodies_promo_codes`, `allow_goodies_wallet_promo_checkout`, `validate_goodies_custom_builder_orders`, and `goodies_card_payment_reference`; their source files are now tracked on `main` using inspected live function definitions and forward-compatible SQL. Historical drift for the older unmatched migrations remains open.
- The live `place_goodies_order` and `place_goodies_order_with_wallet` functions accept `p_promo_code`, read published coupons from Wantiss CMS content, and now validate configured custom-builder lines server-side. The live CMS query returned no published coupons and `goodies_builder_configs` returned no rows, so those paths are implemented but could not be exercised with active production configuration.


## Payment and checkout source tracking (2026-10-25)

- Added the source for the Stripe-backed saved-card order function at `supabase/functions/place-goodies-card-order/index.ts`. It verifies the saved card belongs to the signed-in user, authorizes/captures through Stripe, places the order through the authenticated RPC, and attempts to release/refund payment if order finalization fails.
- The new source files track the live promo validation, wallet promo forwarding, custom-builder validation, scheduled-order notification copy, and card payment reference migrations. The migration history count is 147; the repository count is now 75 SQL files.
- No live payment was attempted during this audit. The card function is deployed, but real-card end-to-end validation is still required.


## Goodies card payment/refund source tracking

- Saved-card orders use the deployed `place-goodies-card-order` Edge Function and Stripe PaymentIntents; the selected saved card must belong to the authenticated customer.
- Declined, expired, and cancelled captured-card orders are queued for refund processing. The `process-goodies-card-refunds` worker is scheduled every minute and checks a Vault-backed worker token before claiming jobs.
- Refund processing is idempotent against existing Stripe refunds, retries pending/failed items, updates order payment state, and records a customer notification.
- No live charge or refund was attempted. TypeScript/build and end-to-end payment tests remain outstanding.


## Card refund worker verification (2026-10-25)

- The scheduled worker is deployed as `process-goodies-card-refunds`. The one-minute cron job is active and the last observed HTTP responses were 200 with zero jobs scanned, refunded, pending, or failed.
- The worker validates a Vault-backed token through a service-role-only database function, claims queue jobs with row locks, retries failed/pending refunds, updates order payment state, and records a customer notification.
- No live payment or refund was initiated. TypeScript/build and end-to-end payment tests remain outstanding.
