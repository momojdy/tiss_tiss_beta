# Supabase migration reconciliation

Checked 2026-10-25 against project `ycbirmgppwavorwudlrv`.

## Inventory

- Consumer repository has 57 tracked SQL migration files on `main` (recounted 2026-10-25 after the latest Goodies changes).
- Supabase reports 132 migration-history entries (live count rechecked 2026-10-25).
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

The Goodies vendor acceptance/decline, scheduled expiry, final application rejection, and review-RPC overload cleanup migrations were applied to the live project and their SQL files were added to `main`. These are new tracked/live entries, not a reconciliation of the older 74-entry gap.

**Status: drift is documented but not fully reconciled.** No historical migration files were renamed or replayed, and no existing migration-history rows were manually edited. The current 132-live-versus-57-tracked difference still needs statement-by-statement schema verification before it can be safely closed.


## Current status and safety boundary

- Live database history count is 132; tracked SQL file count is 57. Many older database migrations are not represented by a same-version/same-name file in this repository. This historical drift is not proof that every unmatched migration is missing from the live schema.
- Do not delete history rows, rename applied migration versions, or replay historical SQL against production merely to make counts match. Reconcile by schema diff in a disposable database, then add a forward-only repair migration for verified missing behavior.
- Live verification confirmed the Goodies acceptance, decline, and expiry functions exist and the cron job `goodies-expire-unaccepted-orders` is active on a one-minute schedule.
- `20261025115047_goodies_order_lifecycle_notifications_hardening` is applied in live Supabase and now tracked as `supabase/migrations/20261025115047_goodies_order_lifecycle_notifications_hardening.sql` on `main`.
- The live database also reports `goodies_wallet_checkout_and_refunds` and `goodies_server_builder_configs`, but matching migration source files were not found on `main` during this audit. Their live functions/configuration were inspected; the source/history gap remains open and must be reconstructed from authoritative migration source, not guessed.
