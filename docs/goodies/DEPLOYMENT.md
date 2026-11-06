# Goodies prepared deployment package

**Prepared, not deployed. Overall Goodies release is NOT READY.** The user explicitly requires approval before potentially disruptive production schema changes. Approval has not been inferred from “Continue.” No production records, secrets, charges, published content or storage objects were changed.

Target: Wantiss, `ycbirmgppwavorwudlrv`, us-east-1. Do not restore the inactive security-test project or substitute another production backend.

## Exact migration order

Main still reports `20261104211532` as its latest migration. Apply only the reviewed package below through the approved migration mechanism, recording the actual deployed migration IDs and file checksums. Do not bulk-push unrelated/staging-only repository migrations.

1. [20261106015226_goodies_courier_scoped_order_read.sql](../../supabase/migrations/20261106015226_goodies_courier_scoped_order_read.sql) — SHA-256 `d38b5bf2370b565c9a1ec7d5f49af7cb947e61d7410968870835bc2cf3c4f52b`
2. [20261106020705_goodies_private_delivery_proofs.sql](../../supabase/migrations/20261106020705_goodies_private_delivery_proofs.sql) — SHA-256 `c669f61d6ae38f3a8549632c30dc94d877b2de80d0235032fbfabd352f34cd49`
3. [20261106021033_goodies_truthful_dispute_refund_notification.sql](../../supabase/migrations/20261106021033_goodies_truthful_dispute_refund_notification.sql) — SHA-256 `c5c7fd714e736223c0850baa4ab9db5ae5e94d50a1b36824433b052079997fd9`
4. [20261106022200_goodies_builder_selection_contract.sql](../../supabase/migrations/20261106022200_goodies_builder_selection_contract.sql) — SHA-256 `f809e0fd7062c19037992a9798299cbf72f2e8bf3a0f93f5fa7009ddc2407776`
5. [20261106024100_goodies_admin_restriction_appeals.sql](../../supabase/migrations/20261106024100_goodies_admin_restriction_appeals.sql) — SHA-256 `bc47351292222483fdee4f861542efd2a874036da4a304bf035f87dd3439826e`
6. [20261106025454_goodies_product_moderation_enforcement.sql](../../supabase/migrations/20261106025454_goodies_product_moderation_enforcement.sql) — SHA-256 `60f409e077432c57fdd48f1d11c54fc991b46bcbc7d5f688edb07be264b88e67`
7. [20261106030151_goodies_role_notifications.sql](../../supabase/migrations/20261106030151_goodies_role_notifications.sql) — SHA-256 `3c23574c010e9755c73bb9841f30ae7a529114346460b3a59f91923f6caf366a`
8. [20261106030829_goodies_private_proof_rollout.sql](../../supabase/migrations/20261106030829_goodies_private_proof_rollout.sql) — SHA-256 `cb753eeef67cc7985426152b6a76352394cd058648a2f6b60309bf3d78fe2019`
9. [20261106031210_goodies_notification_localization.sql](../../supabase/migrations/20261106031210_goodies_notification_localization.sql) — SHA-256 `0765a19f4e5990466ac6159d23420cb76c14073201a5dd50bcf3d69283d14c2e`
10. [20261106081225_goodies_reviews_preferences_and_store_link.sql](../../supabase/migrations/20261106081225_goodies_reviews_preferences_and_store_link.sql) — SHA-256 `d7461538209e3b9fee3c37702db34efe68a7e56b8ee73376b582ca73e0ecb876`
11. [20261106082226_goodies_admin_operational_pagination.sql](../../supabase/migrations/20261106082226_goodies_admin_operational_pagination.sql) — SHA-256 `55db6451804d987409998f02d4a7d0d4a5e6a6bc1b7575f39883a175ba81319b`
12. [20261106084303_goodies_cms_publication_review_guard.sql](../../supabase/migrations/20261106084303_goodies_cms_publication_review_guard.sql) — SHA-256 `8ef4cfabc3197c62fc4266111ffc7fd85bac1257bef92dbc55ddd4af8b7bb962`
13. [20261106144811_goodies_creole_reviewed_english_fallback.sql](../../supabase/migrations/20261106144811_goodies_creole_reviewed_english_fallback.sql) — SHA-256 `7590e0905f0534c43c55454e3a731340dfd23303710451592ad70a68e4698d5a`. Forward refinement of item 12: unfinished Creole stays unavailable and uses explicitly reviewed English. Requires the base guard; changes no publisher permissions or review states.

The moderation migration was amended because read-only main metadata confirms it is undeployed there. Never alter an applied environment’s migration history; use a forward migration if a different environment has already applied an earlier version.

## Required rollout sequence

1. Review [implementation status](IMPLEMENTATION-STATUS.md), migration SQL/checksums and the read-only live drift evidence. Confirm the production backup/recovery capability and operator access; production PITR/restore has NOT been tested in this environment.
2. Obtain explicit approval for the listed production migrations. Apply them sequentially to the exact main project, preserving a deployment ledger. Each file is transactional; do not run real financial tests in production.
3. Re-read function bodies, column grants, RLS/policies and storage configuration. Verify the reviewed definitions were deployed, including rejection preservation, gallery ownership validation, reviews and publication guards. Do not certify deployment from migration names alone.
4. Deploy the paired customer/vendor and admin code revisions together after backend availability checks. Candidate clients require RPCs absent from main today; clients alone are not a safe rollout. Source commits are listed in [code-changes.json](release-evidence/code-changes.json).
5. Keep private-proof uploads disabled until compatible consumer/admin proof viewers are deployed and tested. Enable the existing protected rollout setting only with approval. Do not migrate/delete legacy objects blindly. The earlier audit observed zero legacy proof objects.
6. Use approved synthetic role accounts and an approved payment sandbox for hosted acceptance. Confirm checkout → vendor fulfillment → courier → customer receipt → admin oversight, cancellation/refunds, duplicate retries, offline recovery and notifications. Fixture-based SQL and mocked Stripe tests do not replace these checks.
7. Complete phone-preview route parity, the hosted CMS draft/edit/preview/publish/reload checks and human content review. Draft FAQ/support suggestions must not overwrite the complete CMS payload or financial settings.
8. Implement approved vendor settlement once provider/recipient/hold/cash-commission requirements are supplied. Do not infer available payout funds from order snapshots.
9. Produce/install signed Android/iOS builds and verify real GPS/background/reassignment, map routing and push on physical devices. Only then reassess full release acceptance.

## Authorization and compatibility impact

- Product writes retain merchant ownership/restriction checks. Moderation metadata stays server-controlled; rejected/pending products cannot be made available by vendors. Gallery grants do not allow arbitrary external/cross-merchant image references.
- Review writes are RPC-only, tied to the signed-in customer and a completed order. Public store review reads use a constrained projection; raw records use RLS. Local/demo historical reviews are not imported as trusted production feedback.
- Notification preferences merge into existing Wantiss settings without replacing shared preferences or identity/address systems. The insert filter targets customer Goodies order/promotion notices, preserving vendor/courier/admin event types.
- New admin paging RPCs retain the existing super-admin assertion. Builder UI now matches operations edit access; asset publishing still requires server-managed asset permission.
- Critical content review guard does not promote review status and permits compatible fee-only changes to an existing published payload. Legacy English text without review metadata retains compatibility, while explicit draft/missing text cannot become production fallback.

## Recovery

- An injected migration failure was verified to roll back the newly created review schema, and a clean retry succeeded in the isolated database. This demonstrates transaction atomicity, not production backup restoration.
- If an approved migration fails, capture the error internally, verify rollback and stop the sequence. Do not stamp a migration successful or retry without identifying the cause.
- If a deployed release needs recovery, pause that rollout and issue a reviewed forward fix. Do not restore the broken moderation trigger, reopen public delivery evidence or drop customer review data as a routine rollback. Retain private evidence and audit records.
- Roll back clients only to a revision compatible with the deployed backend/rollout flag. Verify required RPCs and existing-order readability before resuming traffic. Production restore, provider reconciliation and physical-device recovery remain NOT VERIFIED.

## Current blockers

- Production deployment approval and recovery capability confirmation.
- Approved legal/support content and actual human translation review.
- Approved vendor settlement provider and business rules; missing payout implementation.
- Complete isolated phone-preview route parity and authenticated CMS acceptance.
- Hosted role credentials, payment sandbox, signed builds and physical devices.

No production-readiness PASS is authorized by this package alone.
