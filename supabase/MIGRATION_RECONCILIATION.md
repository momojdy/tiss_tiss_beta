# Supabase migration reconciliation

Checked 2026-10-24 against project `ycbirmgppwavorwudlrv`.

## Inventory

- Consumer repository has 27 tracked SQL migration files on `main`.
- Supabase reports 98 migration-history entries.
- Migration version strings and file names are not consistently aligned. Several migration bodies have matching live history names but different versions, which means version-only comparison overstates the drift.
- There are two repository files with the same `202610240004` prefix:
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

No live migrations were applied as part of this comparison.
