# Supabase migration reconciliation

Checked 2026-10-25 against project `ycbirmgppwavorwudlrv`.

## Current inventory

- `main` contains **76 tracked SQL migration files**.
- Live Supabase records **148 migration-history entries**.
- There are eight duplicate migration version prefixes: `202610240004`, `20261024000700`, `20261024000800`, `20261024000900`, `20261024001000`, `20261024001100`, `20261024001200`, and `20261024001300`.
- Six older repository migrations still require a statement-by-statement comparison against live schema: `business_space_compatibility`, `restore_stayz_views_and_api`, `business_info_fields`, `goodies_live_schedule_and_store_chat`, `goodies_store_schedules_and_chat`, and `goodies_order_queue`.

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
