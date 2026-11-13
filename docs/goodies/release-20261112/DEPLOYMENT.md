# Reviewed backend package — not deployed

Target: existing Wantiss project `ycbirmgppwavorwudlrv`, us-east-1. No new backend was created. The 15 candidates below are absent from the observed live migration ledger. Applying them requires explicit production deployment approval and a fresh drift check. The instruction not to deploy remains in force.

## Exact application order

| Order | Migration | SHA-256 |
|---|---|---|
| 1 | 20261106015226_goodies_courier_scoped_order_read.sql | `d38b5bf2370b565c9a1ec7d5f49af7cb947e61d7410968870835bc2cf3c4f52b` |
| 2 | 20261106020705_goodies_private_delivery_proofs.sql | `c669f61d6ae38f3a8549632c30dc94d877b2de80d0235032fbfabd352f34cd49` |
| 3 | 20261106021033_goodies_truthful_dispute_refund_notification.sql | `c5c7fd714e736223c0850baa4ab9db5ae5e94d50a1b36824433b052079997fd9` |
| 4 | 20261106022200_goodies_builder_selection_contract.sql | `5e12a9d6915f256532f7c77290cc9a095a701d283f090c81e90e6e63bde19b68` |
| 5 | 20261106024100_goodies_admin_restriction_appeals.sql | `bc47351292222483fdee4f861542efd2a874036da4a304bf035f87dd3439826e` |
| 6 | 20261106025454_goodies_product_moderation_enforcement.sql | `60f409e077432c57fdd48f1d11c54fc991b46bcbc7d5f688edb07be264b88e67` |
| 7 | 20261106030151_goodies_role_notifications.sql | `3c23574c010e9755c73bb9841f30ae7a529114346460b3a59f91923f6caf366a` |
| 8 | 20261106030829_goodies_private_proof_rollout.sql | `cb753eeef67cc7985426152b6a76352394cd058648a2f6b60309bf3d78fe2019` |
| 9 | 20261106031210_goodies_notification_localization.sql | `0765a19f4e5990466ac6159d23420cb76c14073201a5dd50bcf3d69283d14c2e` |
| 10 | 20261106081225_goodies_reviews_preferences_and_store_link.sql | `d05375fb7cb16a314d1dd6d585de54534e59702bc3da27183ffd5642e0582028` |
| 11 | 20261106082226_goodies_admin_operational_pagination.sql | `55db6451804d987409998f02d4a7d0d4a5e6a6bc1b7575f39883a175ba81319b` |
| 12 | 20261106084303_goodies_cms_publication_review_guard.sql | `8ef4cfabc3197c62fc4266111ffc7fd85bac1257bef92dbc55ddd4af8b7bb962` |
| 13 | 20261106144811_goodies_creole_reviewed_english_fallback.sql | `7590e0905f0534c43c55454e3a731340dfd23303710451592ad70a68e4698d5a` |
| 14 | 20261107014239_goodies_failure_state_content_review.sql | `f04a0617b0ebd7f866c12dd0197809223bd8437869f52d8347e22c43c69c7499` |
| 15 | 20261107021612_goodies_vendor_settlement.sql | `8da9e2855478ace41f948ec2c52e1b823ffe5ead483d6cbf8773b0f204392e92` |

## Rollout prerequisites

1. Review SQL, hashes, the live baseline and the migration reconciliation manifest. The live ledger advanced during this work to 353 records, head `20261112092820`, because of independent Help Pay changes. Do not infer candidate deployment from that later version.
2. Re-read grants, triggers, functions, storage configuration, scheduled jobs and migration history immediately before any approved rollout. Domain SQL tests use a captured Goodies fixture with synthetic supporting objects; they do not prove a complete production clone or unrelated feature compatibility.
3. Confirm backup/PITR availability, a recoverable restore point and operator access. Production restoration has NOT been verified here. Apply only the reviewed package in order with a deployment ledger. Do not blindly replay the entire migration directory or use `db push --include-all`; some imported historical Help Pay hardening files still differ from recorded deployment names.
4. After approved deployment, verify deployed definitions and privileges against reviewed SQL, then release the paired applications. Clients use new RPCs and must not be released alone against the old backend. Source push and validation exports are not deployment authorization.
5. Keep private-proof uploads disabled until legacy objects, compatible viewers, signatures and authorization are checked. Never delete or expose proofs to simplify migration.
6. Keep settlement disabled until opening liabilities, FX, payout destinations, country bank calendars and operating procedures are reconciled. Do not backdate activation to silently credit historical orders. Digital/bank routes are audited manual transfer workflows, disabled by default; no provider API execution was implemented or represented as tested.
7. New Shared Bill creation/contribution stays disabled by `GOODIES_SHARED_PAYMENTS_RELEASED=false`. Current backend Help Pay functions were independently enabled before this audit; the candidate package additionally revokes public/authenticated request creation and contribution execution. Status/cancel permissions are preserved. No live privileges were changed. Preserve recovery/cancellation and require separate financial acceptance before enabling customer funding.
8. Complete the hosted acceptance plan and signed-device checks before calling Goodies production-ready.

## Recovery

Migrations are transactionally tested, including failure/rollback/retry in the review/preferences suite. Reverting an applied production package or restoring a production backup was not attempted. Prefer audited forward corrections over deleting records or rewriting migration history.

Pause new settlement operations using its protected config while retaining `starts_at` and every commission, payout and wallet record. Reconcile uncertain external transfers before releasing reservations. Preserve completed wallet ledger entries and audit trails. Disable new private proof uploads while keeping authorized historical reads. Revert paired application releases together only after checking backward compatibility.

Historical filename reconciliation preserves SQL hashes and matches observed deployed names. The one redundant legacy invite file was removed only after confirming identical executable SQL; its explanatory comment was preserved in the canonical deployed file. No live migration history was edited.
