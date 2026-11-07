**Historical ledger. Superseded on 7 November: the user paused all deployment. The current package and status are in ../DEPLOYMENT.md.**

# Approved Goodies deployment — 6 November 2026

**Production approval: GRANTED. Deployment: NOT STARTED. Application release: NOT STARTED.** The user explicitly approved the documented backend package followed by the paired applications. The package is the original 12 migrations plus the separately approved Creole-fallback refinement, applied after its base publication guard. No repeated deployment consent is needed.

## Work completed

- PASS — confirmed Wantiss main `ycbirmgppwavorwudlrv`, us-east-1, ACTIVE_HEALTHY; 313 deployed migrations, latest `20261104211532`.
- PASS — all 13 files exactly match the documented SHA-256 checksums. Main's dispute/builder patch targets still match their expected source definitions. No bulk migration push or inactive-project restore was attempted.
- PASS — all 13 migrations apply together in documented order in a fresh synthetic Postgres environment. Final checks confirm private proof storage, review RLS, disabled private-proof rollout, builder/dispute fixes, private-helper privileges and the reviewed-English/unfinished-Creole rule. The schema-only fixture's shared Storage/settings omissions were supplied explicitly; no real customer data was copied.
- PASS — 55 backend tests, including the ordered package test. One test intentionally reproduces the captured baseline moderation defect; it is defect evidence, not a production-readiness pass. Provider tests use synthetic transports, not real money.
- PASS — repaired both actual GitHub CI failures: cross-repository CMS checks were missing their companion repository. Workflows now check out pinned paired sources in sibling directories. No failing test was removed or weakened.
- PASS — fresh customer validation/edge CI and admin CI. Customer run [42242252655](https://github.com/momojdy/tiss_tiss_beta/actions/runs/42242252655), admin run [42242319223](https://github.com/momojdy/tiss-admin/actions/runs/42242319223). Candidate source SHAs and downloadable artifact metadata are recorded alongside this report. Artifact names may contain the synthetic PR-merge SHA used by GitHub; the run metadata records the candidate head SHA.
- PASS — created paired draft release PRs: [customer/vendor/backend #33](https://github.com/momojdy/tiss_tiss_beta/pull/33), [admin #3](https://github.com/momojdy/tiss-admin/pull/3). They remain unmerged because the backend-first rollout gate is not satisfied.

Verification artifacts are a customer **web JS bundle** and admin **Android/iOS JS/Hermes bundles**. They are not signed APK/AAB/IPA files and are not represented as released applications.

## Concrete remaining prerequisites

1. **Usable production backup/recovery point — NOT VERIFIED.** Main is successfully archiving WAL, but that does not prove a usable base backup/PITR point. The connector offers no backup-list operation. The Supabase CLI reports that no management access token is configured. The operator has been asked for the latest usable dashboard backup/PITR timestamp and status; no password or token was requested. The documented rollout requires recovery confirmation before DDL. Production approval is already recorded and is not the blocker.
2. **Existing application release targets — NOT VERIFIED.** Neither repository contains `eas.json`, EAS project IDs, iOS bundle identifiers or Android package identifiers. The runtime has no configured signing/release identity; GitHub integration requests to inspect repository secret/variable names return 403. No conclusion is drawn about whether the owner has credentials elsewhere. Existing project/channel links have been requested so identifiers and signing can be selected without guessing or replacing an existing app.

A local schema-only recovery snapshot is retained outside the public repositories at `/workspace/release-recovery/goodies-20261106/schema-before.json`, SHA-256 `fc3414ae4dd1f34efc0e7f634c1f6ed773d78715a97ccc0705ce5e81cc742331`. It contains 127 routine definitions/ACLs, 52 policies, 28 triggers, table ACL/RLS and constraints. It contains no customer rows. This is **not** a physical/PITR backup and does not substitute for prerequisite 1.

## Resume sequence after prerequisites arrive

1. Re-read main migration history/definitions and compare against the saved baseline; stop/reconcile if another operator changed the targets. Confirm the recovery-point timestamp/status and operator restore access.
2. Apply only the approved files in [DEPLOYMENT.md](../DEPLOYMENT.md), in order, through the migration mechanism. Record each actual server-assigned migration ID and source checksum in `ledger.json` immediately. If the service assigns IDs different from the prepared filenames, reconcile canonical repository migration filenames/references to those applied IDs while retaining the source-package snapshot. Do not stamp success manually, duplicate applied DDL, or rewrite server migration history.
3. After each application, verify success and expected contracts; stop on any error and confirm transactional rollback before continuing. Do not run real order/charge/refund tests on production records.
4. Re-read functions, grants, policies, triggers and private bucket configuration, then run safe read-only/anonymous-denial checks. Positive hosted multi-role/financial acceptance still requires approved synthetic accounts/provider sandbox.
5. Keep private-proof uploads disabled until paired clients/viewers have been released and tested. Do not migrate legacy proof objects or change production secrets/financial records.
6. Release the paired applications to the owner's existing targets after backend verification; record exact build/release IDs. CMS publishing remains a separate authenticated action, and the five FAQ placeholder checks are unchanged.

**Step 4 is not complete.** No migration, production record, secret, charge, CMS publication, main-branch merge, application-store submission or deployed app update was performed in this preflight. Missing provider/device/human-content acceptance still prevents declaring overall Goodies production readiness.
